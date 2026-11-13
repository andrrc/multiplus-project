/**
 * Caixa de avisos (protótipo 10-avisos): avisos agrupados por período, contando o dia civil em Brasília.
 */
import { describe, expect, it } from "vitest";
import { agruparAvisos, periodoDoAviso } from "@/lib/avisos-agrupamento";

// 12/11/2026 às 15h em Brasília (18h UTC).
const AGORA = new Date("2026-11-12T18:00:00.000Z");

describe("periodoDoAviso", () => {
  it("classifica hoje, ontem, esta semana e anteriores", () => {
    expect(periodoDoAviso(new Date("2026-11-12T14:00:00.000Z"), AGORA)).toBe("Hoje");
    expect(periodoDoAviso(new Date("2026-11-11T14:00:00.000Z"), AGORA)).toBe("Ontem");
    expect(periodoDoAviso(new Date("2026-11-10T14:00:00.000Z"), AGORA)).toBe("Esta semana");
    expect(periodoDoAviso(new Date("2026-11-06T14:00:00.000Z"), AGORA)).toBe("Esta semana");
    expect(periodoDoAviso(new Date("2026-11-05T14:00:00.000Z"), AGORA)).toBe("Anteriores");
  });

  it("usa o dia de Brasília: 22h de ontem ainda é ontem, mesmo já sendo hoje em UTC", () => {
    // 22h de 11/11 em Brasília = 01h de 12/11 em UTC.
    expect(periodoDoAviso(new Date("2026-11-12T01:00:00.000Z"), AGORA)).toBe("Ontem");
  });

  it("trata data futura como hoje", () => {
    expect(periodoDoAviso(new Date("2026-11-20T12:00:00.000Z"), AGORA)).toBe("Hoje");
  });
});

describe("agruparAvisos", () => {
  it("mantém a ordem dos períodos, a ordem recebida em cada um e omite os vazios", () => {
    const itens = [
      { id: "a", criadaEm: new Date("2026-11-05T12:00:00.000Z") },
      { id: "b", criadaEm: new Date("2026-11-12T16:00:00.000Z") },
      { id: "c", criadaEm: new Date("2026-11-12T10:00:00.000Z") },
    ];
    const grupos = agruparAvisos(itens, AGORA);
    expect(grupos.map((g) => g.periodo)).toEqual(["Hoje", "Anteriores"]);
    expect(grupos[0].itens.map((i) => i.id)).toEqual(["b", "c"]);
  });

  it("devolve lista vazia sem avisos", () => {
    expect(agruparAvisos([], AGORA)).toEqual([]);
  });
});
