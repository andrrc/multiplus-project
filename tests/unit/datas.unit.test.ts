/** RF-009/RN-001 — "hoje" no horário de Brasília, compartilhado pelo semáforo e pela regra de atraso. */
import { describe, expect, it } from "vitest";
import { dataDeHojeEmSaoPaulo } from "@/lib/datas";

describe("dataDeHojeEmSaoPaulo", () => {
  it("devolve a data de Brasília como meia-noite UTC", () => {
    expect(dataDeHojeEmSaoPaulo(new Date("2026-09-10T15:00:00.000Z"))).toBe(Date.UTC(2026, 8, 10));
  });

  it("só vira o dia à meia-noite de Brasília (03h UTC)", () => {
    expect(dataDeHojeEmSaoPaulo(new Date("2026-09-11T02:59:00.000Z"))).toBe(Date.UTC(2026, 8, 10));
    expect(dataDeHojeEmSaoPaulo(new Date("2026-09-11T03:00:00.000Z"))).toBe(Date.UTC(2026, 8, 11));
  });

  it("vira o mês e o ano no horário de Brasília", () => {
    expect(dataDeHojeEmSaoPaulo(new Date("2027-01-01T02:00:00.000Z"))).toBe(Date.UTC(2026, 11, 31));
  });
});
