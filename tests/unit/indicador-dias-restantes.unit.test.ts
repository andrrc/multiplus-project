/** RF-009 — cálculo das faixas configuráveis do semáforo de prazos. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IndicadorSemaforoProjeto } from "@/ui/indicador-dias-restantes";

describe("IndicadorSemaforoProjeto", () => {
  afterEach(() => vi.useRealTimers());

  it("exibe os dias úteis até o prazo com a cor de semáforo correspondente", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-28T15:00:00.000Z"));

    const html = renderToStaticMarkup(createElement(IndicadorSemaforoProjeto, {
      prazo: new Date("2026-10-02T00:00:00.000Z"),
      status: "EM_ANDAMENTO",
    }));

    expect(html).toContain("4 dias úteis");
    expect(html).toContain("bg-critico/8");
  });

  it("mantém amarelo entre 6 e 10 dias úteis e verde acima de 10", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-28T15:00:00.000Z"));

    const renderizar = (prazo: string) => renderToStaticMarkup(createElement(IndicadorSemaforoProjeto, {
      prazo: new Date(`${prazo}T00:00:00.000Z`),
      status: "EM_ANDAMENTO",
    }));

    expect(renderizar("2026-10-06")).toContain("bg-ambar/8");
    expect(renderizar("2026-10-13")).toContain("bg-verde-cl");
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
    expect(renderizar("2026-10-05")).toContain("bg-verde-cl");
  });

  it("identifica prazo para hoje e prazo no fim de semana", () => {
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
    expect(venceNoSabado).toContain("Prazo no fim de semana");
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

  it("exibe atraso em dias úteis", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-29T15:00:00.000Z"));

    const html = renderToStaticMarkup(createElement(IndicadorSemaforoProjeto, {
      prazo: new Date("2026-09-25T00:00:00.000Z"),
      status: "EM_ANDAMENTO",
    }));

    expect(html).toContain("Atrasado");
    expect(html).toContain("dias úteis");
  });
});
