/** "Aguardando outras pessoas": regra de uma tarefa do colaborador que não anda só por ele. */
import { describe, expect, it } from "vitest";
import { aguardaOutrasPessoas } from "@/lib/aguardando-outras-pessoas";
import { urlFiltrosListagens } from "@/lib/filtro-responsavel";

const eu = { usuarioId: "eu", pessoaEnvolvidaId: "pessoa-eu" };
const sub = (extra: Partial<{ status: string; ativo: boolean; atribuidoAId: string | null; atribuidoAUsuarioId: string | null; pedidos: number }> = {}) => ({
  status: extra.status ?? "EM_ANDAMENTO",
  ativo: extra.ativo ?? true,
  atribuidoAId: extra.atribuidoAId ?? null,
  atribuidoAUsuarioId: extra.atribuidoAUsuarioId ?? null,
  solicitacoesConclusao: Array.from({ length: extra.pedidos ?? 0 }, () => ({ id: "p" })),
});
const tarefa = (subtarefas: ReturnType<typeof sub>[] = [], extra: Partial<{ status: string; ativo: boolean; pedidos: number }> = {}) => ({
  status: extra.status ?? "EM_ANDAMENTO",
  ativo: extra.ativo ?? true,
  solicitacoesConclusao: Array.from({ length: extra.pedidos ?? 0 }, () => ({ id: "p" })),
  subtarefas,
});

describe("aguardando outras pessoas", () => {
  it("tarefa sem subtarefas e sem pedido não aguarda ninguém", () => {
    expect(aguardaOutrasPessoas(tarefa(), eu)).toBe(false);
  });

  it("subtarefa em andamento de outro usuário ou de outra pessoa envolvida faz aguardar", () => {
    expect(aguardaOutrasPessoas(tarefa([sub({ atribuidoAUsuarioId: "colega" })]), eu)).toBe(true);
    expect(aguardaOutrasPessoas(tarefa([sub({ atribuidoAId: "pessoa-outra" })]), eu)).toBe(true);
  });

  it("subtarefa dele, da pessoa envolvida dele, sem responsável, concluída ou desativada não faz aguardar", () => {
    expect(aguardaOutrasPessoas(tarefa([sub({ atribuidoAUsuarioId: "eu" })]), eu)).toBe(false);
    expect(aguardaOutrasPessoas(tarefa([sub({ atribuidoAId: "pessoa-eu" })]), eu)).toBe(false);
    expect(aguardaOutrasPessoas(tarefa([sub()]), eu)).toBe(false);
    expect(aguardaOutrasPessoas(tarefa([sub({ atribuidoAUsuarioId: "colega", status: "CONCLUIDO" })]), eu)).toBe(false);
    expect(aguardaOutrasPessoas(tarefa([sub({ atribuidoAUsuarioId: "colega", ativo: false })]), eu)).toBe(false);
  });

  it("pedido de conclusão pendente, da tarefa ou de uma subtarefa, faz aguardar a confirmação", () => {
    expect(aguardaOutrasPessoas(tarefa([], { pedidos: 1 }), eu)).toBe(true);
    expect(aguardaOutrasPessoas(tarefa([sub({ atribuidoAUsuarioId: "eu", pedidos: 1 })]), eu)).toBe(true);
  });

  it("tarefa concluída, cancelada ou desativada nunca aguarda", () => {
    const delegada = [sub({ atribuidoAUsuarioId: "colega" })];
    expect(aguardaOutrasPessoas(tarefa(delegada, { status: "CONCLUIDO" }), eu)).toBe(false);
    expect(aguardaOutrasPessoas(tarefa(delegada, { status: "CANCELADO" }), eu)).toBe(false);
    expect(aguardaOutrasPessoas(tarefa(delegada, { ativo: false }), eu)).toBe(false);
  });
});

describe("URL dos filtros com aguardando", () => {
  it("leva aguardando=1 só quando ligado", () => {
    const base = { cliente: "", projeto: "", tarefa: "", responsavel: "", mostrarConcluidas: false };
    expect(urlFiltrosListagens("/minhas-tarefas", base, false)).toBe("/minhas-tarefas");
    expect(urlFiltrosListagens("/minhas-tarefas", { ...base, aguardando: true }, false)).toBe("/minhas-tarefas?aguardando=1");
  });
});
