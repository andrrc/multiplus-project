/**
 * Painel (protótipo 02-painel): separação de atrasados e vencimentos dos próximos dias, em dias corridos de Brasília.
 */
import { describe, expect, it } from "vitest";
import { agruparPorDia, percentualEmDia, separarItensPainel, type ItemPainel } from "@/lib/painel";

// 12/11/2026, 15h em Brasília.
const AGORA = new Date("2026-11-12T18:00:00.000Z");
const dia = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const item = (id: string, prazo: Date | null): ItemPainel => ({
  id, tipo: "Tarefa", titulo: id, href: `/tarefas/${id}`, contexto: "Cliente · Projeto", responsavel: null, prazo, statusRotulo: "Em andamento", visita: false,
});

describe("separarItensPainel", () => {
  const itens = [
    item("hoje", dia("2026-11-12")),
    item("ontem", dia("2026-11-11")),
    item("antiga", dia("2026-10-26")),
    item("em7", dia("2026-11-19")),
    item("em8", dia("2026-11-20")),
    item("em2", dia("2026-11-14")),
    item("sem", null),
  ];

  it("ordena os atrasados do mais antigo ao mais recente", () => {
    const { atrasados } = separarItensPainel(itens, 7, AGORA);
    expect(atrasados.map((i) => i.id)).toEqual(["antiga", "ontem"]);
    expect(atrasados[0].dias).toBe(-17);
  });

  it("inclui o dia de hoje e o limite, e deixa de fora o que passa dele", () => {
    const { proximos } = separarItensPainel(itens, 7, AGORA);
    expect(proximos.map((i) => i.id)).toEqual(["hoje", "em2", "em7"]);
  });

  it("não classifica item sem prazo e informa quantos são", () => {
    const resultado = separarItensPainel(itens, 7, AGORA);
    expect(resultado.semPrazo).toBe(1);
    expect([...resultado.atrasados, ...resultado.proximos].some((i) => i.id === "sem")).toBe(false);
  });
});

describe("percentualEmDia", () => {
  it("calcula sobre os abertos e devolve null quando não há nenhum", () => {
    expect(percentualEmDia(21, 3)).toBe(86);
    expect(percentualEmDia(4, 0)).toBe(100);
    expect(percentualEmDia(0, 0)).toBeNull();
  });
});

describe("agruparPorDia", () => {
  it("junta itens do mesmo dia e mantém a ordem", () => {
    const grupos = agruparPorDia([
      { id: "a", prazo: dia("2026-11-13") },
      { id: "b", prazo: dia("2026-11-13") },
      { id: "c", prazo: dia("2026-11-14") },
    ]);
    expect(grupos.map((g) => g.itens.map((i) => i.id))).toEqual([["a", "b"], ["c"]]);
  });
});
