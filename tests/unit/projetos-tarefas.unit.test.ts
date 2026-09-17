import { describe, expect, it } from "vitest";
import { StatusTarefa } from "@prisma/client";
import {
  calcularPercentualEmDia,
  calcularProximaOcorrencia,
  estaAtrasada,
  filtrarAtivos,
  projetarOcorrenciasFuturas,
} from "@/lib/regras-projetos-tarefas";

const data = (valor: string) => new Date(`${valor}T00:00:00.000Z`);

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

  it("não calcula próxima ocorrência sem periodicidade", () => {
    expect(calcularProximaOcorrencia(data("2026-09-10"), null)).toBeNull();
  });
});

describe("RN-001 — atraso sem tolerância", () => {
  it("considera hoje em dia e ontem atrasada", () => {
    expect(estaAtrasada(data("2026-09-10"), false, data("2026-09-10"))).toBe(false);
    expect(estaAtrasada(data("2026-09-09"), false, data("2026-09-10"))).toBe(true);
    expect(estaAtrasada(data("2026-09-09"), true, data("2026-09-10"))).toBe(false);
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
      data("2026-09-10"),
    );
    expect(resultado).toEqual({ total: 2, emDia: 2, percentual: 100 });
  });

  it("retorna percentual nulo quando não há tarefas ativas", () => {
    expect(calcularPercentualEmDia([{ ativo: false, prazo: data("2026-09-09") }], data("2026-09-10"))).toEqual({
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
