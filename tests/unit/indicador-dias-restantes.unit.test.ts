/**
 * RF-009 — cores do semáforo de prazos, em dias corridos: vermelho só para prazo vencido,
 * âmbar do dia do prazo até o limite configurado e verde acima dele.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { calcularDiasRestantes, IndicadorSemaforoProjeto } from "@/ui/indicador-dias-restantes";

const renderizar = (prazo: string, limites?: { diasAmareloAte: number }) => renderToStaticMarkup(createElement(IndicadorSemaforoProjeto, {
  prazo: new Date(`${prazo}T00:00:00.000Z`),
  status: "EM_ANDAMENTO",
  limites,
}));

describe("IndicadorSemaforoProjeto", () => {
  afterEach(() => vi.useRealTimers());

  it("usa âmbar até 5 dias e verde a partir de 6, com o limite padrão", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-28T15:00:00.000Z"));

    expect(renderizar("2026-10-02")).toContain("4 dias");
    expect(renderizar("2026-10-02")).toContain("bg-ambar/8");
    expect(renderizar("2026-10-03")).toContain("5 dias");
    expect(renderizar("2026-10-03")).toContain("bg-ambar/8");
    expect(renderizar("2026-10-04")).toContain("6 dias");
    expect(renderizar("2026-10-04")).toContain("bg-verde-cl");
  });

  it("não usa vermelho para prazo que ainda não venceu", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-28T15:00:00.000Z"));

    for (const prazo of ["2026-09-28", "2026-09-29", "2026-10-03", "2026-10-20"]) {
      expect(renderizar(prazo)).not.toContain("critico");
    }
  });

  it("usa o limite configurado, inclusive zero", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-28T15:00:00.000Z"));

    expect(renderizar("2026-09-30", { diasAmareloAte: 2 })).toContain("bg-ambar/8");
    expect(renderizar("2026-10-01", { diasAmareloAte: 2 })).toContain("bg-verde-cl");
    expect(renderizar("2026-09-28", { diasAmareloAte: 0 })).toContain("bg-ambar/8");
    expect(renderizar("2026-09-29", { diasAmareloAte: 0 })).toContain("bg-verde-cl");
  });

  it("mostra prazo de hoje em âmbar e trata prazo no fim de semana como dia comum", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-28T15:00:00.000Z"));
    const venceHoje = renderizar("2026-09-28");
    expect(venceHoje).toContain("Vence hoje");
    expect(venceHoje).toContain("bg-ambar/8");

    vi.setSystemTime(new Date("2026-10-02T15:00:00.000Z"));
    const venceNoSabado = renderizar("2026-10-03");
    expect(venceNoSabado).toContain("1 dia<");
    expect(venceNoSabado).not.toContain("fim de semana");
  });

  it("considera o dia de hoje no fuso de São Paulo", () => {
    // 02:30 UTC de 29/09 ainda é 23:30 de 28/09 em São Paulo.
    const hoje = new Date("2026-09-29T02:30:00.000Z");
    expect(calcularDiasRestantes(new Date("2026-09-28T00:00:00.000Z"), hoje)).toBe(0);
    expect(calcularDiasRestantes(new Date("2026-09-29T00:00:00.000Z"), hoje)).toBe(1);
  });

  it("exibe atraso em dias corridos, com caixa vermelha sólida", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-29T15:00:00.000Z"));

    const html = renderizar("2026-09-25");
    expect(html).toContain("Atrasado 4 dias");
    expect(html).toContain("border-critico bg-critico text-branco");
  });

  it("usa o singular para um dia de atraso", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-29T15:00:00.000Z"));

    expect(renderizar("2026-09-28")).toContain("Atrasado 1 dia<");
  });

  it("mostra cancelado em cinza e preserva os demais rótulos", () => {
    const render = (status: string, prazo: Date | null, ativo = true) => renderToStaticMarkup(
      createElement(IndicadorSemaforoProjeto, { status, prazo, ativo }),
    );

    expect(render("EM_ANDAMENTO", null)).toContain("Sem prazo");
    expect(render("CONCLUIDO", new Date())).toContain("bg-verde-cl");
    expect(render("CONCLUIDO", new Date())).toContain("Concluído");
    expect(render("CANCELADO", new Date())).toContain("Cancelado");
    expect(render("CANCELADO", new Date())).toContain("bg-papel text-cinza");
    expect(render("CANCELADO", new Date("2026-01-01T00:00:00.000Z"))).not.toContain("critico");
    expect(render("EM_ANDAMENTO", new Date(), false)).toContain("Desativado");
  });
});
