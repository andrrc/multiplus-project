import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IndicadorDiasRestantesProjeto } from "@/ui/indicador-dias-restantes";

describe("IndicadorDiasRestantesProjeto", () => {
  afterEach(() => vi.useRealTimers());

  it("exibe os dias úteis até o prazo sem cores de semáforo", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-28T15:00:00.000Z"));

    const html = renderToStaticMarkup(createElement(IndicadorDiasRestantesProjeto, {
      prazo: new Date("2026-10-02T00:00:00.000Z"),
      status: "EM_ANDAMENTO",
    }));

    expect(html).toContain("4 dias úteis");
    expect(html).not.toMatch(/bg-(?:critico|ambar|verde)/);
  });

  it("identifica prazo para hoje e prazo no fim de semana", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-28T15:00:00.000Z"));
    const venceHoje = renderToStaticMarkup(createElement(IndicadorDiasRestantesProjeto, {
      prazo: new Date("2026-09-28T00:00:00.000Z"),
      status: "EM_ANDAMENTO",
    }));
    expect(venceHoje).toContain("Vence hoje");

    vi.setSystemTime(new Date("2026-10-02T15:00:00.000Z"));
    const venceNoSabado = renderToStaticMarkup(createElement(IndicadorDiasRestantesProjeto, {
      prazo: new Date("2026-10-03T00:00:00.000Z"),
      status: "EM_ANDAMENTO",
    }));
    expect(venceNoSabado).toContain("Prazo no fim de semana");
  });

  it("preserva rótulos para projetos sem prazo, concluídos, cancelados ou desativados", () => {
    const renderizar = (status: string, prazo: Date | null, ativo = true) => renderToStaticMarkup(
      createElement(IndicadorDiasRestantesProjeto, { status, prazo, ativo }),
    );

    expect(renderizar("EM_ANDAMENTO", null)).toContain("Sem prazo");
    expect(renderizar("CONCLUIDO", new Date())).toContain("Concluído");
    expect(renderizar("CANCELADO", new Date())).toContain("Cancelado");
    expect(renderizar("EM_ANDAMENTO", new Date(), false)).toContain("Desativado");
  });

  it("exibe atraso em dias úteis", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-29T15:00:00.000Z"));

    const html = renderToStaticMarkup(createElement(IndicadorDiasRestantesProjeto, {
      prazo: new Date("2026-09-25T00:00:00.000Z"),
      status: "EM_ANDAMENTO",
    }));

    expect(html).toContain("Atrasado");
    expect(html).toContain("dias úteis");
  });
});
