/**
 * "Quem acessa este projeto" (protótipo 04-projeto): como as fontes de acesso viram a lista da coluna lateral.
 */
import { describe, expect, it, vi } from "vitest";

// O módulo importa o acesso ao banco só para a consulta; aqui interessa apenas a montagem da lista.
vi.mock("@/lib/prisma-app", () => ({ comContextoDeUsuario: vi.fn() }));

import { montarQuemAcessa } from "@/lib/acesso-projeto";

const base = {
  administradores: [{ id: "a1", nome: "Talita" }],
  atribuicoes: [],
  subtarefasAtribuidas: [],
  cliente: { razaoSocial: "Indústria Alfa Ltda", pessoasComAcesso: 0 },
};

describe("montarQuemAcessa", () => {
  it("lista a administração primeiro", () => {
    expect(montarQuemAcessa(base)).toEqual([{ chave: "usuario:a1", nome: "Talita", descricao: "Administração" }]);
  });

  it("a equipe atribuída ao projeto aparece como projeto inteiro", () => {
    const lista = montarQuemAcessa({ ...base, atribuicoes: [{ entidadeTipo: "PROJETO", entidadeId: "p1", usuario: { id: "u1", nome: "André", perfil: "ADMIN_INTERNO" } }] });
    expect(lista[1]).toEqual({ chave: "usuario:u1", nome: "André", descricao: "Equipe Múltiplus · projeto inteiro" });
  });

  it("o colaborador externo mostra quantas tarefas e subtarefas alcança, sem repetir a pessoa", () => {
    const carlos = { id: "u2", nome: "Carlos", perfil: "ADMIN_EXTERNO" as const };
    const lista = montarQuemAcessa({
      ...base,
      atribuicoes: [
        { entidadeTipo: "TAREFA", entidadeId: "t1", usuario: carlos },
        { entidadeTipo: "TAREFA", entidadeId: "t2", usuario: carlos },
      ],
      subtarefasAtribuidas: [{ usuario: carlos }],
    });
    expect(lista.filter((p) => p.nome === "Carlos")).toEqual([{ chave: "usuario:u2", nome: "Carlos", descricao: "Colaborador externo · 2 tarefas · 1 subtarefa" }]);
  });

  it("a equipe vem antes dos externos, em ordem alfabética", () => {
    const lista = montarQuemAcessa({
      ...base,
      atribuicoes: [
        { entidadeTipo: "TAREFA", entidadeId: "t1", usuario: { id: "u3", nome: "Bruno", perfil: "ADMIN_EXTERNO" } },
        { entidadeTipo: "PROJETO", entidadeId: "p1", usuario: { id: "u4", nome: "Zélia", perfil: "ADMIN_INTERNO" } },
        { entidadeTipo: "PROJETO", entidadeId: "p1", usuario: { id: "u5", nome: "Ana", perfil: "ADMIN_INTERNO" } },
      ],
    });
    expect(lista.map((p) => p.nome)).toEqual(["Talita", "Ana", "Zélia", "Bruno"]);
  });

  it("a administração não se repete se também tiver atribuição", () => {
    const lista = montarQuemAcessa({ ...base, atribuicoes: [{ entidadeTipo: "PROJETO", entidadeId: "p1", usuario: { id: "a1", nome: "Talita", perfil: "ADMIN" } }] });
    expect(lista).toHaveLength(1);
  });

  it("o portal do cliente entra só quando há pessoas com acesso ativo", () => {
    expect(montarQuemAcessa({ ...base, cliente: { razaoSocial: "Indústria Alfa Ltda", pessoasComAcesso: 1 } }).at(-1)).toEqual({
      chave: "portal",
      nome: "Indústria Alfa Ltda",
      descricao: "Portal do cliente · 1 pessoa com acesso",
    });
    expect(montarQuemAcessa({ ...base, cliente: { razaoSocial: "Indústria Alfa Ltda", pessoasComAcesso: 3 } }).at(-1)?.descricao).toBe("Portal do cliente · 3 pessoas com acesso");
    expect(montarQuemAcessa(base).some((p) => p.chave === "portal")).toBe(false);
  });
});
