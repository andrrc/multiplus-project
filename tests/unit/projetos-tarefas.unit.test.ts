/** RF-009/RF-048/RF-049; RN-001/RN-008/RN-014/RN-015 — indicadores e regras de projeto/tarefa. */
import { describe, expect, it } from "vitest";
import { StatusTarefa } from "@prisma/client";
import {
  calcularPercentualConclusao,
  calcularUltimaAtualizacaoProjeto,
  calcularPercentualEmDia,
  calcularProximaOcorrencia,
  dataDaSerieDaOcorrencia,
  estaAtrasada,
  filtrarAtivos,
  projetarOcorrenciasFuturas,
} from "@/lib/regras-projetos-tarefas";
import { calcularDiasRestantes } from "@/ui/indicador-dias-restantes";

const data = (valor: string) => new Date(`${valor}T00:00:00.000Z`);
/** Instante ao meio-dia de Brasília (15h UTC) — "hoje" para as regras de atraso. */
const meioDia = (valor: string) => new Date(`${valor}T15:00:00.000Z`);

describe("RF-048/RN-014 — percentual de conclusão", () => {
  it("ignora canceladas e desativadas, e não mostra percentual sem itens elegíveis", () => {
    expect(calcularPercentualConclusao([
      { ativo: true, status: "CONCLUIDO" },
      { ativo: true, status: "CANCELADO" },
      { ativo: false, status: "EM_ANDAMENTO" },
    ])).toEqual({ total: 1, concluidas: 1, percentual: 100 });
    expect(calcularPercentualConclusao([{ ativo: true, status: "CANCELADO" }])).toEqual({ total: 0, concluidas: 0, percentual: null });
  });

  it("retorna 0%, 50% e 100% conforme a conclusão ativa", () => {
    expect(calcularPercentualConclusao([{ ativo: true, status: "EM_ANDAMENTO" }]).percentual).toBe(0);
    expect(calcularPercentualConclusao([{ ativo: true, status: "CONCLUIDO" }, { ativo: true, status: "A_INICIAR" }]).percentual).toBe(50);
    expect(calcularPercentualConclusao([{ ativo: true, status: "CONCLUIDO" }]).percentual).toBe(100);
  });
});

describe("RF-049/RN-015 — última atualização do projeto", () => {
  it("considera escritas recentes em registros ativos e comentários", () => {
    const base = new Date("2026-09-01T00:00:00.000Z");
    const escrita = new Date("2026-09-03T00:00:00.000Z");
    const resultado = calcularUltimaAtualizacaoProjeto({
      projeto: { ativo: true, atualizadoEm: base },
      tarefas: [{ ativo: true, atualizadoEm: escrita }],
      subtarefas: [], documentos: [],
      comentarios: [{ registroAtivo: true, criadoEm: new Date("2026-09-02T00:00:00.000Z") }],
    });
    expect(resultado).toEqual(escrita);
  });

  it("ignora escritas em registros desativados e retorna nulo sem dados elegíveis", () => {
    expect(calcularUltimaAtualizacaoProjeto({
      projeto: { ativo: false, atualizadoEm: new Date("2026-09-05T00:00:00.000Z") },
      tarefas: [{ ativo: false, atualizadoEm: new Date("2026-09-04T00:00:00.000Z") }],
      subtarefas: [], documentos: [], comentarios: [],
    })).toBeNull();
  });

  it("não muda sem uma nova escrita (leituras não participam da agregação)", () => {
    const dados = { projeto: { ativo: true, atualizadoEm: new Date("2026-09-01T00:00:00.000Z") }, tarefas: [], subtarefas: [], documentos: [], comentarios: [] };
    expect(calcularUltimaAtualizacaoProjeto(dados)).toEqual(dados.projeto.atualizadoEm);
  });
});

describe("RN-008 — próxima ocorrência ancorada no prazo original", () => {
  it("calcula as periodicidades aprovadas", () => {
    const casos = [
      ["SEMANAL", "2026-09-10", "2026-09-17"],
      ["MENSAL", "2026-09-10", "2026-10-10"],
      ["TRIMESTRAL", "2026-09-10", "2026-12-10"],
      ["SEMESTRAL", "2026-09-10", "2027-03-10"],
      ["ANUAL", "2026-09-10", "2027-09-10"],
    ] as const;

    for (const [periodicidade, atual, esperado] of casos) {
      expect(calcularProximaOcorrencia(data(atual), periodicidade)).toEqual(data(esperado));
    }
  });

  it("preserva o dia original nos meses curtos e volta ao dia 31", () => {
    const original = data("2026-01-31");
    expect(calcularProximaOcorrencia(original, "MENSAL", original)).toEqual(data("2026-02-28"));
    expect(calcularProximaOcorrencia(data("2026-02-28"), "MENSAL", original)).toEqual(data("2026-03-31"));
    expect(calcularProximaOcorrencia(data("2028-01-31"), "MENSAL", data("2028-01-31"))).toEqual(data("2028-02-29"));
  });

  it("mantém a próxima ocorrência quando o prazo foi prorrogado dentro do ciclo", () => {
    const original = data("2026-01-31");
    // 31/01 prorrogado para 01/02 (já no mês de fevereiro): a próxima segue sendo 28/02, não 31/03.
    expect(calcularProximaOcorrencia(data("2026-02-01"), "MENSAL", original)).toEqual(data("2026-02-28"));
    expect(calcularProximaOcorrencia(data("2026-02-27"), "MENSAL", original)).toEqual(data("2026-02-28"));
    // 28/02 prorrogado para 15/03: a próxima segue sendo 31/03.
    expect(calcularProximaOcorrencia(data("2026-03-15"), "MENSAL", original)).toEqual(data("2026-03-31"));
    // Dia 10 prorrogado para o mês seguinte, ainda antes da próxima data da série.
    expect(calcularProximaOcorrencia(data("2026-02-05"), "MENSAL", data("2026-01-10"))).toEqual(data("2026-02-10"));
    // Trimestral e anual com a âncora no dia 31.
    expect(calcularProximaOcorrencia(data("2026-02-10"), "TRIMESTRAL", original)).toEqual(data("2026-04-30"));
    expect(calcularProximaOcorrencia(data("2026-02-10"), "ANUAL", original)).toEqual(data("2027-01-31"));
  });

  it("acerta a próxima de qualquer prazo entre duas datas da série, para todas as âncoras e periodicidades", () => {
    const passos = { MENSAL: 1, TRIMESTRAL: 3, SEMESTRAL: 6, ANUAL: 12 } as const;
    const umDia = 24 * 60 * 60 * 1000;
    for (const [periodicidade, passo] of Object.entries(passos)) {
      for (let dia = 1; dia <= 31; dia += 1) {
        const original = new Date(Date.UTC(2027, 0, dia));
        const serie = (i: number) => {
          const meses = original.getUTCMonth() + i * passo;
          const ano = original.getUTCFullYear() + Math.floor(meses / 12);
          const mes = meses % 12;
          return new Date(Date.UTC(ano, mes, Math.min(dia, new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate())));
        };
        for (let i = 0; i < 6; i += 1) {
          const atual = serie(i);
          const proxima = serie(i + 1);
          // Na própria data da série e em todos os dias até a véspera da próxima.
          for (let t = atual.getTime(); t < proxima.getTime(); t += umDia) {
            expect(
              calcularProximaOcorrencia(new Date(t), periodicidade as keyof typeof passos, original),
              `${periodicidade}, âncora dia ${dia}, prazo ${new Date(t).toISOString().slice(0, 10)}`,
            ).toEqual(proxima);
          }
        }
      }
    }
  });

  it("repete semanalmente no dia escolhido", () => {
    // 10/09/2026 é quinta-feira; 2 representa terça-feira.
    expect(calcularProximaOcorrencia(data("2026-09-10"), "SEMANAL", undefined, 2)).toEqual(data("2026-09-15"));
    expect(calcularProximaOcorrencia(data("2026-09-15"), "SEMANAL", undefined, 2)).toEqual(data("2026-09-22"));
  });

  it("não calcula próxima ocorrência sem periodicidade", () => {
    expect(calcularProximaOcorrencia(data("2026-09-10"), null)).toBeNull();
  });
});

describe("RN-008 — data da série da ocorrência atual", () => {
  it("devolve a data da série mesmo com o prazo prorrogado dentro do ciclo", () => {
    const original = data("2026-01-31");
    expect(dataDaSerieDaOcorrencia(original, "MENSAL", original)).toEqual(original);
    expect(dataDaSerieDaOcorrencia(data("2026-02-01"), "MENSAL", original)).toEqual(original);
    expect(dataDaSerieDaOcorrencia(data("2026-02-28"), "MENSAL", original)).toEqual(data("2026-02-28"));
    expect(dataDaSerieDaOcorrencia(data("2026-03-15"), "MENSAL", original)).toEqual(data("2026-02-28"));
    expect(dataDaSerieDaOcorrencia(data("2026-02-10"), "ANUAL", original)).toEqual(original);
  });

  it("semanal com dia fixo volta ao dia escolhido; sem dia fixo ou sem periodicidade não há série", () => {
    // 15/09/2026 é terça-feira (2); 17/09 é quinta-feira.
    expect(dataDaSerieDaOcorrencia(data("2026-09-15"), "SEMANAL", undefined, 2)).toEqual(data("2026-09-15"));
    expect(dataDaSerieDaOcorrencia(data("2026-09-17"), "SEMANAL", undefined, 2)).toEqual(data("2026-09-15"));
    expect(dataDaSerieDaOcorrencia(data("2026-09-14"), "SEMANAL", undefined, 2)).toEqual(data("2026-09-08"));
    expect(dataDaSerieDaOcorrencia(data("2026-09-17"), "SEMANAL")).toEqual(data("2026-09-17"));
    expect(dataDaSerieDaOcorrencia(data("2026-09-17"), null)).toBeNull();
  });

  it("para todas as âncoras e periodicidades, é a data da série do ciclo e anda junto com a próxima", () => {
    const passos = { MENSAL: 1, TRIMESTRAL: 3, SEMESTRAL: 6, ANUAL: 12 } as const;
    const umDia = 24 * 60 * 60 * 1000;
    for (const [periodicidade, passo] of Object.entries(passos)) {
      for (let dia = 1; dia <= 31; dia += 1) {
        const original = new Date(Date.UTC(2027, 0, dia));
        const serie = (i: number) => {
          const meses = original.getUTCMonth() + i * passo;
          const ano = original.getUTCFullYear() + Math.floor(meses / 12);
          const mes = meses % 12;
          return new Date(Date.UTC(ano, mes, Math.min(dia, new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate())));
        };
        for (let i = 0; i < 6; i += 1) {
          for (let t = serie(i).getTime(); t < serie(i + 1).getTime(); t += umDia) {
            const prazo = new Date(t);
            const rotulo = `${periodicidade}, âncora dia ${dia}, prazo ${prazo.toISOString().slice(0, 10)}`;
            expect(dataDaSerieDaOcorrencia(prazo, periodicidade as keyof typeof passos, original), rotulo).toEqual(serie(i));
            expect(calcularProximaOcorrencia(prazo, periodicidade as keyof typeof passos, original), rotulo).toEqual(serie(i + 1));
          }
        }
      }
    }
  });
});

describe("RN-001 — atraso sem tolerância", () => {
  it("considera hoje em dia e ontem atrasada", () => {
    expect(estaAtrasada(data("2026-09-10"), false, meioDia("2026-09-10"))).toBe(false);
    expect(estaAtrasada(data("2026-09-09"), false, meioDia("2026-09-10"))).toBe(true);
    expect(estaAtrasada(data("2026-09-09"), true, meioDia("2026-09-10"))).toBe(false);
  });

  it("vira o dia à meia-noite de Brasília, não à meia-noite UTC", () => {
    // 02:30 UTC de 11/09 ainda é 23:30 de 10/09 em Brasília: o prazo de 10/09 vence hoje.
    expect(estaAtrasada(data("2026-09-10"), false, new Date("2026-09-11T02:30:00.000Z"))).toBe(false);
    // 03:30 UTC de 11/09 já é 00:30 de 11/09 em Brasília: o prazo de 10/09 atrasou.
    expect(estaAtrasada(data("2026-09-10"), false, new Date("2026-09-11T03:30:00.000Z"))).toBe(true);
  });

  it("concorda com o semáforo em qualquer horário do dia", () => {
    const prazo = data("2026-09-10");
    for (let hora = 0; hora < 48; hora += 1) {
      const agora = new Date(Date.UTC(2026, 8, 10, hora, 30));
      expect(estaAtrasada(prazo, false, agora)).toBe(calcularDiasRestantes(prazo, agora) < 0);
    }
  });
});

describe("RF-009 — percentual em dia", () => {
  it("retira desativadas e concluídas não ficam atrasadas", () => {
    const resultado = calcularPercentualEmDia(
      [
        { ativo: true, prazo: data("2026-09-10"), status: "A_INICIAR" },
        { ativo: true, prazo: data("2026-09-09"), status: StatusTarefa.CONCLUIDO },
        { ativo: false, prazo: data("2026-09-01"), status: "A_INICIAR" },
      ],
      meioDia("2026-09-10"),
    );
    expect(resultado).toEqual({ total: 2, emDia: 2, percentual: 100 });
  });

  it("mantém em dia a tarefa que vence hoje até a meia-noite de Brasília", () => {
    const tarefas = [{ ativo: true, prazo: data("2026-09-10"), status: "A_INICIAR" }];
    expect(calcularPercentualEmDia(tarefas, new Date("2026-09-11T02:30:00.000Z")).percentual).toBe(100);
    expect(calcularPercentualEmDia(tarefas, new Date("2026-09-11T03:30:00.000Z")).percentual).toBe(0);
  });

  it("retorna percentual nulo quando não há tarefas ativas", () => {
    expect(calcularPercentualEmDia([{ ativo: false, prazo: data("2026-09-09") }], meioDia("2026-09-10"))).toEqual({
      total: 0,
      emDia: 0,
      percentual: null,
    });
  });
});

describe("ADR-009 — projeção da Agenda", () => {
  const tarefa = {
    id: "tarefa-1",
    ativo: true,
    prazo: data("2026-01-31"),
    prazoOriginal: data("2026-01-31"),
    periodicidade: "MENSAL" as const,
    status: "A_INICIAR",
    serieId: "serie-1",
  };

  it("projeta ocorrência mesmo quando a anterior venceu sem conclusão", () => {
    expect(projetarOcorrenciasFuturas(tarefa, data("2026-02-01"), data("2026-04-30"))).toEqual([
      data("2026-02-28"),
      data("2026-03-31"),
      data("2026-04-30"),
    ]);
  });

  it("projeta ocorrências semanais no dia selecionado", () => {
    expect(projetarOcorrenciasFuturas({
      ...tarefa,
      prazo: data("2026-09-10"),
      prazoOriginal: data("2026-09-10"),
      periodicidade: "SEMANAL",
      diaSemana: 2,
    }, data("2026-09-11"), data("2026-09-30"))).toEqual([
      data("2026-09-15"), data("2026-09-22"), data("2026-09-29"),
    ]);
  });

  it("não duplica uma ocorrência já materializada", () => {
    expect(
      projetarOcorrenciasFuturas(tarefa, data("2026-02-01"), data("2026-03-31"), [
        { serieId: "serie-1", prazo: data("2026-02-28") },
      ]),
    ).toEqual([data("2026-03-31")]);
  });

  it("não projeta série cancelada ou desativada", () => {
    expect(projetarOcorrenciasFuturas({ ...tarefa, status: "CANCELADO" }, data("2026-02-01"), data("2026-04-30"))).toEqual([]);
    expect(projetarOcorrenciasFuturas({ ...tarefa, ativo: false }, data("2026-02-01"), data("2026-04-30"))).toEqual([]);
  });
});

describe("RN-009 — filtro puro de ativos", () => {
  it("mantém somente os registros ativos", () => {
    const ativos = filtrarAtivos([{ id: 1, ativo: true }, { id: 2, ativo: false }]);
    expect(ativos.map((item) => item.id)).toEqual([1]);
  });
});
