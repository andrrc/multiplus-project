/**
 * Situação do prazo nas listas de Tarefas e Subtarefas: a tela e o PDF exportado usam a mesma conta
 * (`situacaoDoItem` e `filtrarPorSituacao`), então o PDF leva o mesmo botão de situação da tela.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { filtrarPorSituacao, situacaoDoItem } from "@/lib/lista-tarefas";

const LIMITE = 5;
// Hoje é 18/11/2026 (meio-dia em Brasília); os prazos são datas civis guardadas à meia-noite UTC.
const dia = (diasDepoisDeHoje: number) => new Date(Date.UTC(2026, 10, 18 + diasDepoisDeHoje));

const itens = [
  { nome: "atrasada", prazo: dia(-3), status: "EM_ANDAMENTO", ativo: true },
  { nome: "vence hoje", prazo: dia(0), status: "A_INICIAR", ativo: true },
  { nome: "próxima", prazo: dia(5), status: "EM_ANDAMENTO", ativo: true },
  { nome: "no prazo", prazo: dia(20), status: "EM_ANDAMENTO", ativo: true },
  { nome: "sem prazo", prazo: null, status: "EM_ANDAMENTO", ativo: true },
  { nome: "concluída", prazo: dia(-10), status: "CONCLUIDO", ativo: true },
  { nome: "cancelada", prazo: dia(-1), status: "CANCELADO", ativo: true },
  { nome: "desativada", prazo: dia(-2), status: "EM_ANDAMENTO", ativo: false },
];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-18T15:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("situacaoDoItem", () => {
  it("classifica pelo prazo e pelo limite do semáforo", () => {
    const por = Object.fromEntries(itens.map((item) => [item.nome, situacaoDoItem(item, LIMITE)]));
    expect(por).toEqual({
      atrasada: "atrasado",
      "vence hoje": "proximo",
      próxima: "proximo",
      "no prazo": "prazo",
      "sem prazo": "sem",
      concluída: "fechado",
      cancelada: "fechado",
      desativada: "fechado",
    });
  });
});

describe("filtrarPorSituacao", () => {
  const nomes = (filtro: Parameters<typeof filtrarPorSituacao>[1]) => filtrarPorSituacao(itens, filtro, LIMITE).map((item) => item.nome);

  it("'todos' mantém a lista inteira, inclusive os itens fechados", () => {
    expect(nomes("todos")).toHaveLength(itens.length);
  });

  it("'atrasado' traz só os abertos vencidos", () => {
    expect(nomes("atrasado")).toEqual(["atrasada"]);
  });

  it("'proximo' traz os que vencem hoje ou dentro do limite", () => {
    expect(nomes("proximo")).toEqual(["vence hoje", "próxima"]);
  });

  it("'prazo' e 'sem' separam o que está no prazo do que não tem prazo", () => {
    expect(nomes("prazo")).toEqual(["no prazo"]);
    expect(nomes("sem")).toEqual(["sem prazo"]);
  });

  it("não altera a lista original", () => {
    const copia = [...itens];
    filtrarPorSituacao(itens, "atrasado", LIMITE);
    expect(itens).toEqual(copia);
  });
});
