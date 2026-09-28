import { describe, expect, it } from "vitest";
import { montarNumeroProposta } from "@/lib/numero-proposta";

describe("montarNumeroProposta", () => {
  it("combina número e ano no formato da proposta", () => {
    expect(montarNumeroProposta("109", "2026")).toBe("109/2026");
  });

  it("permite deixar a proposta em branco", () => {
    expect(montarNumeroProposta("", "")).toBeNull();
  });

  it("exige número e ano válidos quando um deles é informado", () => {
    expect(() => montarNumeroProposta("109", "")).toThrow(/número e o ano/);
    expect(() => montarNumeroProposta("", "2026")).toThrow(/número e o ano/);
    expect(() => montarNumeroProposta("A109", "2026")).toThrow(/número e o ano/);
    expect(() => montarNumeroProposta("109", "26")).toThrow(/número e o ano/);
  });
});
