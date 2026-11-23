/**
 * Lista "Minhas tarefas" do colaborador interno: filtro de tipo e ação direta na linha.
 */
import { describe, expect, it } from "vitest";
import { acaoDaLinha, interpretarTipoLista, tipoNaLista } from "@/lib/minhas-tarefas-lista";

describe("interpretarTipoLista", () => {
  it("aceita só tarefas e só subtarefas; o resto equivale a todos", () => {
    expect(interpretarTipoLista("tarefas")).toBe("tarefas");
    expect(interpretarTipoLista("subtarefas")).toBe("subtarefas");
    expect(interpretarTipoLista("todos")).toBe("todos");
    expect(interpretarTipoLista(undefined)).toBe("todos");
    expect(interpretarTipoLista("qualquer")).toBe("todos");
    expect(interpretarTipoLista(["tarefas", "subtarefas"])).toBe("todos");
  });
});

describe("tipoNaLista", () => {
  it("filtra pelo tipo escolhido", () => {
    expect(tipoNaLista("tarefa", "todos")).toBe(true);
    expect(tipoNaLista("subtarefa", "todos")).toBe(true);
    expect(tipoNaLista("tarefa", "tarefas")).toBe(true);
    expect(tipoNaLista("subtarefa", "tarefas")).toBe(false);
    expect(tipoNaLista("subtarefa", "subtarefas")).toBe(true);
    expect(tipoNaLista("tarefa", "subtarefas")).toBe(false);
  });
});

describe("acaoDaLinha", () => {
  const tarefa = { tipo: "tarefa" as const, meu: true, status: "EM_ANDAMENTO", ativo: true, comprovanteExigido: false, pedidoPendente: false };
  const subtarefa = { ...tarefa, tipo: "subtarefa" as const };

  it("oferece concluir no item aberto do próprio colaborador", () => {
    expect(acaoDaLinha(tarefa)).toBe("concluir");
    expect(acaoDaLinha(subtarefa)).toBe("concluir");
    expect(acaoDaLinha({ ...tarefa, status: "PROTOCOLADO" })).toBe("concluir");
  });

  it("leva ao envio quando o item exige comprovante", () => {
    expect(acaoDaLinha({ ...tarefa, comprovanteExigido: true })).toBe("comprovante");
    expect(acaoDaLinha({ ...subtarefa, comprovanteExigido: true })).toBe("comprovante");
  });

  it("não oferece nada em item de outra pessoa, já pedido, fechado ou desativado", () => {
    expect(acaoDaLinha({ ...tarefa, meu: false })).toBeNull();
    expect(acaoDaLinha({ ...tarefa, pedidoPendente: true })).toBeNull();
    expect(acaoDaLinha({ ...tarefa, status: "CONCLUIDO" })).toBeNull();
    expect(acaoDaLinha({ ...tarefa, status: "CANCELADO" })).toBeNull();
    expect(acaoDaLinha({ ...subtarefa, status: "CONCLUIDO" })).toBeNull();
    expect(acaoDaLinha({ ...subtarefa, status: "CANCELADO" })).toBeNull();
    expect(acaoDaLinha({ ...tarefa, ativo: false })).toBeNull();
  });
});
