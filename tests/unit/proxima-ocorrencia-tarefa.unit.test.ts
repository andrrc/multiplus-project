/**
 * Próxima ocorrência no resumo da página da tarefa (protótipo 05-tarefa): só existe enquanto a tarefa recorrente
 * está aberta e a série segue ativa.
 */
import { describe, expect, it } from "vitest";
import { proximaOcorrenciaDaTarefa } from "@/lib/regras-projetos-tarefas";

const data = (valor: string) => new Date(`${valor}T00:00:00.000Z`);
const base = { ativo: true, prazo: data("2026-11-30"), periodicidade: "MENSAL" as const, status: "EM_ANDAMENTO" };

describe("proximaOcorrenciaDaTarefa", () => {
  it("calcula a próxima data da série a partir do prazo atual", () => {
    expect(proximaOcorrenciaDaTarefa(base)).toEqual(data("2026-12-30"));
  });

  it("mantém o dia original da série nos meses curtos", () => {
    const tarefa = { ...base, prazo: data("2026-02-28"), prazoOriginal: data("2026-01-31") };
    expect(proximaOcorrenciaDaTarefa(tarefa)).toEqual(data("2026-03-31"));
  });

  it("usa o dia da semana escolhido na recorrência semanal", () => {
    // 30/11/2026 é segunda-feira; a próxima ocorrência cai na quarta (3).
    expect(proximaOcorrenciaDaTarefa({ ...base, periodicidade: "SEMANAL", diaSemana: 3 })).toEqual(data("2026-12-02"));
  });

  it("não existe sem recorrência ou sem prazo", () => {
    expect(proximaOcorrenciaDaTarefa({ ...base, periodicidade: null })).toBeNull();
    expect(proximaOcorrenciaDaTarefa({ ...base, prazo: null })).toBeNull();
  });

  it("não existe para tarefa concluída, cancelada ou desativada", () => {
    expect(proximaOcorrenciaDaTarefa({ ...base, status: "CONCLUIDO" })).toBeNull();
    expect(proximaOcorrenciaDaTarefa({ ...base, status: "CANCELADO" })).toBeNull();
    expect(proximaOcorrenciaDaTarefa({ ...base, ativo: false })).toBeNull();
  });

  it("não existe quando a série foi encerrada", () => {
    expect(proximaOcorrenciaDaTarefa({ ...base, serieEncerradaEm: data("2026-11-01") })).toBeNull();
  });
});
