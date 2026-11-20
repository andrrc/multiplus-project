/**
 * Filtro da lista de projetos do portal do cliente: Em andamento, Concluídos e Todos.
 */
import { describe, expect, it } from "vitest";
import { contarProjetosPorFiltro, interpretarFiltroProjetosPortal, projetoNoFiltroPortal } from "@/lib/portal-filtro-projetos";

describe("interpretarFiltroProjetosPortal", () => {
  it("aceita os três valores e cai em Em andamento nos demais casos", () => {
    expect(interpretarFiltroProjetosPortal("concluidos")).toBe("concluidos");
    expect(interpretarFiltroProjetosPortal("todos")).toBe("todos");
    expect(interpretarFiltroProjetosPortal("andamento")).toBe("andamento");
    expect(interpretarFiltroProjetosPortal(undefined)).toBe("andamento");
    expect(interpretarFiltroProjetosPortal("qualquer")).toBe("andamento");
    expect(interpretarFiltroProjetosPortal(["todos", "concluidos"])).toBe("andamento");
  });
});

describe("projetoNoFiltroPortal", () => {
  it("Em andamento traz o projeto a iniciar e o em andamento", () => {
    expect(projetoNoFiltroPortal("A_INICIAR", "andamento")).toBe(true);
    expect(projetoNoFiltroPortal("EM_ANDAMENTO", "andamento")).toBe(true);
    expect(projetoNoFiltroPortal("CONCLUIDO", "andamento")).toBe(false);
    expect(projetoNoFiltroPortal("CANCELADO", "andamento")).toBe(false);
  });

  it("Concluídos traz só os concluídos e Todos traz tudo, inclusive o cancelado", () => {
    expect(projetoNoFiltroPortal("CONCLUIDO", "concluidos")).toBe(true);
    expect(projetoNoFiltroPortal("EM_ANDAMENTO", "concluidos")).toBe(false);
    expect(projetoNoFiltroPortal("CANCELADO", "todos")).toBe(true);
  });
});

describe("contarProjetosPorFiltro", () => {
  it("conta cada botão sobre a lista inteira", () => {
    const projetos = [{ status: "A_INICIAR" }, { status: "EM_ANDAMENTO" }, { status: "CONCLUIDO" }, { status: "CANCELADO" }];
    expect(contarProjetosPorFiltro(projetos)).toEqual({ andamento: 2, concluidos: 1, todos: 4 });
  });
});
