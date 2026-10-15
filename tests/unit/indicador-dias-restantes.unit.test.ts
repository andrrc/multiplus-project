/** RF-009 — cálculo das faixas configuráveis do semáforo de prazos, em dias corridos. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { calcularDiasRestantes, IndicadorSemaforoProjeto } from "@/ui/indicador-dias-restantes";

describe("IndicadorSemaforoProjeto", () => {
  afterEach(() => vi.useRealTimers());

  it("exibe os dias corridos até o prazo com a cor de semáforo correspondente", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-28T15:00:00.000Z"));

    const html = renderToStaticMarkup(createElement(IndicadorSemaforoProjeto, {
      prazo: new Date("2026-10-02T00:00:00.000Z"),
      status: "EM_ANDAMENTO",
    }));

    expect(html).toContain("4 dias");
    expect(html).not.toContain("úteis");
    expect(html).toContain("bg-critico/8");
  });

  it("conta sábados e domingos nas faixas: vermelho até 5, amarelo de 6 a 10 e verde acima de 10", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-28T15:00:00.000Z"));

    const renderizar = (prazo: string) => renderToStaticMarkup(createElement(IndicadorSemaforoProjeto, {
      prazo: new Date(`${prazo}T00:00:00.000Z`),
      status: "EM_ANDAMENTO",
    }));

    expect(renderizar("2026-10-03")).toContain("bg-critico/8");
    expect(renderizar("2026-10-03")).toContain("5 dias");
    expect(renderizar("2026-10-04")).toContain("bg-ambar/8");
    expect(renderizar("2026-10-04")).toContain("6 dias");
    expect(renderizar("2026-10-08")).toContain("bg-ambar/8");
    expect(renderizar("2026-10-09")).toContain("bg-verde-cl");
    expect(renderizar("2026-10-09")).toContain("11 dias");
  });

  it("usa limites configurados para as faixas de cor", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-28T15:00:00.000Z"));
    const renderizar = (prazo: string) => renderToStaticMarkup(createElement(IndicadorSemaforoProjeto, {
      prazo: new Date(`${prazo}T00:00:00.000Z`), status: "EM_ANDAMENTO",
      limites: { diasVermelhoAte: 2, diasAmareloAte: 4 },
    }));
    expect(renderizar("2026-09-30")).toContain("bg-critico/8");
    expect(renderizar("2026-10-02")).toContain("bg-ambar/8");
    expect(renderizar("2026-10-03")).toContain("bg-verde-cl");
  });

  it("identifica prazo para hoje e trata prazo no fim de semana como dia comum", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-28T15:00:00.000Z"));
    const venceHoje = renderToStaticMarkup(createElement(IndicadorSemaforoProjeto, {
      prazo: new Date("2026-09-28T00:00:00.000Z"),
      status: "EM_ANDAMENTO",
    }));
    expect(venceHoje).toContain("Vence hoje");

    vi.setSystemTime(new Date("2026-10-02T15:00:00.000Z"));
    const venceNoSabado = renderToStaticMarkup(createElement(IndicadorSemaforoProjeto, {
      prazo: new Date("2026-10-03T00:00:00.000Z"),
      status: "EM_ANDAMENTO",
    }));
    expect(venceNoSabado).toContain("1 dia<");
    expect(venceNoSabado).not.toContain("fim de semana");
  });

  it("considera o dia de hoje no fuso de São Paulo", () => {
    // 02:30 UTC de 29/09 ainda é 23:30 de 28/09 em São Paulo.
    const hoje = new Date("2026-09-29T02:30:00.000Z");
    expect(calcularDiasRestantes(new Date("2026-09-28T00:00:00.000Z"), hoje)).toBe(0);
    expect(calcularDiasRestantes(new Date("2026-09-29T00:00:00.000Z"), hoje)).toBe(1);
  });

  it("preserva rótulos para projetos sem prazo, concluídos, cancelados ou desativados", () => {
    const renderizar = (status: string, prazo: Date | null, ativo = true) => renderToStaticMarkup(
      createElement(IndicadorSemaforoProjeto, { status, prazo, ativo }),
    );

    expect(renderizar("EM_ANDAMENTO", null)).toContain("Sem prazo");
    expect(renderizar("CONCLUIDO", new Date())).toContain("bg-verde-cl");
    expect(renderizar("CONCLUIDO", new Date())).toContain("Concluído");
    expect(renderizar("CANCELADO", new Date())).toContain("bg-critico/8");
    expect(renderizar("CANCELADO", new Date())).toContain("Cancelado");
    expect(renderizar("EM_ANDAMENTO", new Date(), false)).toContain("Desativado");
  });

  it("exibe atraso em dias corridos, com caixa vermelha sólida", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-29T15:00:00.000Z"));

    const html = renderToStaticMarkup(createElement(IndicadorSemaforoProjeto, {
      prazo: new Date("2026-09-25T00:00:00.000Z"),
      status: "EM_ANDAMENTO",
    }));

    expect(html).toContain("Atrasado 4 dias");
    expect(html).toContain("bg-critico text-branco");
  });

  it("usa o singular para um dia de atraso", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-29T15:00:00.000Z"));

    const html = renderToStaticMarkup(createElement(IndicadorSemaforoProjeto, {
      prazo: new Date("2026-09-28T00:00:00.000Z"),
      status: "EM_ANDAMENTO",
    }));

    expect(html).toContain("Atrasado 1 dia<");
  });
});
