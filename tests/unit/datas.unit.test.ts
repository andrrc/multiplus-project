/** RF-009/RN-001 — "hoje" no horário de Brasília, compartilhado pelo semáforo e pela regra de atraso. */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { dataDeHojeEmSaoPaulo, formatarDataHoraBrasilia } from "@/lib/datas";

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

describe("formatação de instantes em Brasília — RF-016/RF-022/RF-050", () => {
  it.each([
    ["2026-10-20T13:00:00.000Z", "20/10/2026, 10:00"],
    ["2026-11-01T02:59:59.000Z", "31/10/2026, 23:59"],
    ["2027-01-01T02:59:59.000Z", "31/12/2026, 23:59"],
    ["2027-01-01T03:00:00.000Z", "01/01/2027, 00:00"],
  ])("formata %s como %s", (iso, esperado) => {
    expect(formatarDataHoraBrasilia(new Date(iso))).toBe(esperado);
  });
});

describe("independência do fuso do processo — RF-036/RF-050", () => {
  it.each(["UTC", "Europe/Berlin", "America/Sao_Paulo"])("preserva instante e dia com TZ=%s", (TZ) => {
    const script = `const { formatarDataHoraBrasilia, dataDeHojeEmSaoPaulo } = require(process.argv[1]);
      const agora = new Date('2027-01-01T02:00:00Z');
      console.log(JSON.stringify([formatarDataHoraBrasilia(agora), dataDeHojeEmSaoPaulo(agora)]));`;
    const resultado = execFileSync(process.execPath, ["--require", "tsx/cjs", "-e", script, resolve("src/lib/datas.ts")], {
      encoding: "utf8", env: { ...process.env, TZ },
    });
    expect(JSON.parse(resultado)).toEqual(["31/12/2026, 23:00", Date.UTC(2026, 11, 31)]);
  });
});
