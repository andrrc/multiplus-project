/**
 * Mês da agenda: a tela e o PDF exportado usam a mesma conta (`intervaloDoMes`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { intervaloDoMes } from "@/lib/agenda-periodo";

beforeEach(() => {
  vi.useFakeTimers();
  // 18/11/2026, meio-dia em Brasília.
  vi.setSystemTime(new Date("2026-11-18T15:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("intervaloDoMes", () => {
  it("sem parâmetro usa o mês atual de Brasília", () => {
    const { atual, inicio, fim } = intervaloDoMes(undefined);
    expect(atual).toEqual({ ano: 2026, mes: 10 });
    expect(inicio.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(fim.toISOString()).toBe("2026-11-30T23:59:59.000Z");
  });

  it("usa o ano-mês informado", () => {
    const { atual, inicio, fim } = intervaloDoMes("2027-02");
    expect(atual).toEqual({ ano: 2027, mes: 1 });
    expect(inicio.toISOString()).toBe("2027-02-01T00:00:00.000Z");
    expect(fim.toISOString()).toBe("2027-02-28T23:59:59.000Z");
  });

  it("parâmetro malformado cai no mês atual", () => {
    expect(intervaloDoMes("novembro").atual).toEqual({ ano: 2026, mes: 10 });
    expect(intervaloDoMes("2026-1").atual).toEqual({ ano: 2026, mes: 10 });
  });

  it("mês fora de 01 a 12 é limitado ao intervalo válido", () => {
    expect(intervaloDoMes("2026-13").atual.mes).toBe(11);
    expect(intervaloDoMes("2026-00").atual.mes).toBe(0);
  });
});
