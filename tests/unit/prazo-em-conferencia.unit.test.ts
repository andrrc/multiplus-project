/**
 * Etapa 2 dos comprovantes: o prazo para de contar enquanto um envio com comprovante aguarda conferência.
 * Análise aprovada: docs/analises/comprovantes-etapa2-prazo.md. As regras puras recebem o instante do envio como dado
 * opcional; sem ele, todas se comportam como antes (os testes existentes de semáforo, atraso e agenda não mudam).
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { classeDoItemAgenda, contarAtrasadosAnteriores } from "@/lib/agenda-itens";
import { filtrarPorSituacao, situacaoDoItem } from "@/lib/lista-tarefas";
import { contarMinhasPendencias, tarefasAtrasadas } from "@/lib/lista-meus-projetos";
import { separarItensPainel, percentualEmDia, type ItemPainel } from "@/lib/painel";
import { emConferenciaDesde, rotuloEnviadoEm } from "@/lib/prazo-em-conferencia";
import { calcularPercentualEmDia } from "@/lib/regras-projetos-tarefas";
import { contarSituacoes, situacaoDoPrazo } from "@/lib/situacao-prazo";
import { IndicadorSemaforoProjeto } from "@/ui/indicador-dias-restantes";

const HOJE = new Date("2026-11-20T15:00:00.000Z");
const VENCIDO = new Date("2026-11-10T00:00:00.000Z");
const ENVIO = new Date("2026-11-12T14:00:00.000Z");

describe("emConferenciaDesde: quando o prazo para", () => {
  it("pedido pendente com arquivo (contagem do banco) está em conferência e devolve o instante do envio", () => {
    expect(emConferenciaDesde([{ status: "PENDENTE", solicitadoEm: ENVIO, _count: { arquivos: 2 } }])).toEqual(ENVIO);
  });

  it("aceita a lista de arquivos no lugar da contagem (envios da página do item)", () => {
    expect(emConferenciaDesde([{ status: "PENDENTE", solicitadoEm: ENVIO, arquivos: [{ id: "a" }] }])).toEqual(ENVIO);
  });

  it("pedido pendente SEM arquivo (item que não exige comprovante) continua contando", () => {
    expect(emConferenciaDesde([{ status: "PENDENTE", solicitadoEm: ENVIO, _count: { arquivos: 0 } }])).toBeNull();
    expect(emConferenciaDesde([{ status: "PENDENTE", solicitadoEm: ENVIO, arquivos: [] }])).toBeNull();
    expect(emConferenciaDesde([{ status: "PENDENTE", solicitadoEm: ENVIO }])).toBeNull();
  });

  it("pedido devolvido, retirado ou aprovado não pausa: o prazo volta a contar", () => {
    for (const status of ["REJEITADA", "CANCELADA", "APROVADA"]) {
      expect(emConferenciaDesde([{ status, solicitadoEm: ENVIO, _count: { arquivos: 3 } }])).toBeNull();
    }
  });

  it("sem pedido, ou com a lista ausente, não há pausa", () => {
    expect(emConferenciaDesde([])).toBeNull();
    expect(emConferenciaDesde(null)).toBeNull();
    expect(emConferenciaDesde(undefined)).toBeNull();
  });

  it("com vários pedidos no histórico, vale o pendente com arquivo", () => {
    const historico = [
      { status: "REJEITADA", solicitadoEm: new Date("2026-11-05T12:00:00.000Z"), _count: { arquivos: 1 } },
      { status: "PENDENTE", solicitadoEm: ENVIO, _count: { arquivos: 1 } },
    ];
    expect(emConferenciaDesde(historico)).toEqual(ENVIO);
  });
});

describe("rotuloEnviadoEm", () => {
  it("mostra o dia do envio no horário de Brasília, não o dia em UTC", () => {
    // 22h de Brasília em 12/11 são 01h UTC de 13/11: o rótulo precisa dizer 12/11.
    expect(rotuloEnviadoEm(new Date("2026-11-13T01:00:00.000Z"))).toBe("Enviado em 12/11");
    expect(rotuloEnviadoEm(new Date("2026-11-12T14:00:00.000Z"))).toBe("Enviado em 12/11");
  });
});

describe("situação do prazo", () => {
  it("item em conferência sai de atrasado e só aparece em Todos", () => {
    expect(situacaoDoPrazo({ diasRestantes: -10, fechado: false, emConferencia: true }, 5)).toBe("conferencia");
    expect(situacaoDoPrazo({ diasRestantes: 2, fechado: false, emConferencia: true }, 5)).toBe("conferencia");
    expect(situacaoDoPrazo({ diasRestantes: null, fechado: false, emConferencia: true }, 5)).toBe("conferencia");
  });

  it("sem o dado de conferência, a classificação é a de sempre", () => {
    expect(situacaoDoPrazo({ diasRestantes: -10, fechado: false }, 5)).toBe("atrasado");
    expect(situacaoDoPrazo({ diasRestantes: 2, fechado: false }, 5)).toBe("proximo");
    expect(situacaoDoPrazo({ diasRestantes: 9, fechado: false }, 5)).toBe("prazo");
  });

  it("fechado prevalece sobre a conferência", () => {
    expect(situacaoDoPrazo({ diasRestantes: -10, fechado: true, emConferencia: true }, 5)).toBe("fechado");
  });

  it("as contagens dos botões não incluem o item em conferência, mas Todos o inclui", () => {
    const contagem = contarSituacoes(["atrasado", "conferencia", "prazo", "fechado"]);
    expect(contagem).toEqual({ todos: 4, atrasado: 1, proximo: 0, prazo: 1, sem: 0 });
  });

  it("a lista e o filtro Atrasados deixam de mostrar o item em conferência", () => {
    const itens = [
      { nome: "Em conferência", prazo: VENCIDO, status: "EM_ANDAMENTO", ativo: true, emConferenciaDesde: ENVIO },
      { nome: "Atrasada de verdade", prazo: VENCIDO, status: "EM_ANDAMENTO", ativo: true, emConferenciaDesde: null },
    ];
    vi.useFakeTimers();
    vi.setSystemTime(HOJE);
    expect(situacaoDoItem(itens[0], 5)).toBe("conferencia");
    expect(filtrarPorSituacao(itens, "atrasado", 5).map((i) => i.nome)).toEqual(["Atrasada de verdade"]);
    expect(filtrarPorSituacao(itens, "todos", 5)).toHaveLength(2);
    vi.useRealTimers();
  });
});

describe("percentual em dia", () => {
  it("o item em conferência conta como em dia, mesmo com o prazo vencido", () => {
    const resultado = calcularPercentualEmDia([
      { ativo: true, prazo: VENCIDO, status: "EM_ANDAMENTO", emConferenciaDesde: ENVIO },
      { ativo: true, prazo: VENCIDO, status: "EM_ANDAMENTO" },
    ], HOJE);
    expect(resultado).toEqual({ total: 2, emDia: 1, percentual: 50 });
  });
});

describe("agenda", () => {
  it("classifica o item em conferência na classe própria, nem atrasado nem 'vence em breve'", () => {
    expect(classeDoItemAgenda({ status: "EM_ANDAMENTO", projetada: false, emConferenciaDesde: ENVIO }, -10, 5)).toBe("conferencia");
    expect(classeDoItemAgenda({ status: "EM_ANDAMENTO", projetada: false, emConferenciaDesde: ENVIO }, 2, 5)).toBe("conferencia");
    expect(classeDoItemAgenda({ status: "EM_ANDAMENTO", projetada: false }, -10, 5)).toBe("atrasado");
  });

  it("concluído e a ocorrência projetada prevalecem sobre a conferência", () => {
    expect(classeDoItemAgenda({ status: "CONCLUIDO", projetada: false, emConferenciaDesde: ENVIO }, -10, 5)).toBe("concluida");
    expect(classeDoItemAgenda({ status: "EM_ANDAMENTO", projetada: true, emConferenciaDesde: ENVIO }, -10, 5)).toBe("futura");
  });

  it("a faixa de atrasados de meses anteriores não conta o item em conferência", () => {
    const inicioDoMes = new Date("2026-11-01T00:00:00.000Z");
    const total = contarAtrasadosAnteriores([
      { prazo: new Date("2026-10-10T00:00:00.000Z"), status: "EM_ANDAMENTO", ativo: true, emConferenciaDesde: ENVIO },
      { prazo: new Date("2026-10-10T00:00:00.000Z"), status: "EM_ANDAMENTO", ativo: true },
    ], inicioDoMes, HOJE);
    expect(total).toBe(1);
  });
});

describe("painel", () => {
  const item = (id: string, prazo: Date | null, emConferenciaDesde: Date | null): ItemPainel => ({
    id, tipo: "Tarefa", titulo: id, href: "/", contexto: "", responsavel: null, prazo, statusRotulo: "", visita: false, emConferenciaDesde,
  });

  it("o item em conferência não é atrasado nem vence na semana, mas segue contando como em dia", () => {
    const itens = [
      item("conferencia-vencida", VENCIDO, ENVIO),
      item("conferencia-proxima", new Date("2026-11-22T00:00:00.000Z"), ENVIO),
      item("atrasada", VENCIDO, null),
      item("sem-prazo", null, null),
    ];
    const { atrasados, proximos, semPrazo } = separarItensPainel(itens, 7, HOJE);
    expect(atrasados.map((i) => i.id)).toEqual(["atrasada"]);
    expect(proximos).toEqual([]);
    expect(semPrazo).toBe(1);
    expect(percentualEmDia(itens.length, atrasados.length)).toBe(75);
  });
});

describe("minhas atrasadas (Meus projetos)", () => {
  it("o item em conferência não conta como atrasado, mas continua como pendência", () => {
    const tarefas = [
      { ativo: true, status: "EM_ANDAMENTO", prazo: VENCIDO, emConferenciaDesde: ENVIO },
      { ativo: true, status: "EM_ANDAMENTO", prazo: VENCIDO },
    ];
    expect(contarMinhasPendencias(tarefas, [], HOJE)).toEqual({ pendencias: 2, atrasadas: 1 });
    vi.useFakeTimers();
    vi.setSystemTime(HOJE);
    expect(tarefasAtrasadas({ tarefas })).toBe(1);
    vi.useRealTimers();
  });
});

describe("selo do prazo", () => {
  afterEach(() => vi.useRealTimers());

  const selo = (props: Partial<Parameters<typeof IndicadorSemaforoProjeto>[0]>) => renderToStaticMarkup(createElement(IndicadorSemaforoProjeto, {
    prazo: VENCIDO,
    status: "EM_ANDAMENTO",
    ...props,
  }));

  it("mostra 'Enviado em dd/mm' no lugar do atraso", () => {
    vi.useFakeTimers();
    vi.setSystemTime(HOJE);
    const html = selo({ emConferenciaDesde: ENVIO });
    expect(html).toContain("Enviado em 12/11");
    expect(html).not.toContain("Atrasado");
    expect(html).toContain("bg-azul-cl");
    expect(html).not.toContain("bg-critico-cl");
  });

  it("mostra o envio mesmo quando o item não tem prazo", () => {
    expect(selo({ prazo: null, emConferenciaDesde: ENVIO })).toContain("Enviado em 12/11");
  });

  it("sem conferência o selo é o de sempre (atrasado em vermelho)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(HOJE);
    const html = selo({});
    expect(html).toContain("Atrasado 10 dias");
    expect(html).toContain("bg-critico-cl");
  });

  it("concluído, cancelado e desativado prevalecem sobre a conferência", () => {
    expect(selo({ status: "CONCLUIDO", emConferenciaDesde: ENVIO })).toContain("Concluído");
    expect(selo({ status: "CANCELADO", emConferenciaDesde: ENVIO })).toContain("Cancelado");
    expect(selo({ ativo: false, emConferenciaDesde: ENVIO })).toContain("Desativado");
  });
});
