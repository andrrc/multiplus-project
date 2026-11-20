/**
 * "Quem acessa este projeto": só a administração lê a lista, que junta atribuições de projeto e de tarefa, subtarefas
 * atribuídas e o portal do cliente. Roda contra o Postgres de verdade, pela role RLS-restrita.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listarQuemAcessaProjeto } from "@/lib/acesso-projeto";
import { ownerDb, limparFixtures, fecharConexoes } from "./setup/helpers";

const ctxAdmin = { usuarioId: "qa-admin", perfil: "ADMIN" as const };

beforeAll(async () => {
  await limparFixtures();
  await ownerDb.cliente.createMany({ data: [
    { id: "qa-ca", razaoSocial: "Cliente QA A", cnpj: "44555566000201", segmento: "Industrial", origemContato: "Indicação" },
    { id: "qa-cb", razaoSocial: "Cliente QA B", cnpj: "44555566000202", segmento: "Industrial", origemContato: "Indicação" },
  ] });
  await ownerDb.usuario.createMany({ data: [
    { id: "qa-admin", nome: "Talita acesso", email: "talita.qa@teste.local", perfil: "ADMIN" },
    { id: "qa-interno", nome: "Interno do projeto", email: "interno.qa@teste.local", perfil: "ADMIN_INTERNO" },
    { id: "qa-interno-fora", nome: "Interno de outro projeto", email: "interno.fora.qa@teste.local", perfil: "ADMIN_INTERNO" },
    { id: "qa-externo", nome: "Externo da tarefa", email: "externo.qa@teste.local", perfil: "ADMIN_EXTERNO" },
    { id: "qa-externo-sub", nome: "Externo da subtarefa", email: "externo.sub.qa@teste.local", perfil: "ADMIN_EXTERNO" },
    { id: "qa-externo-inativo", nome: "Externo desativado", email: "externo.inativo.qa@teste.local", perfil: "ADMIN_EXTERNO", ativo: false },
    { id: "qa-cliente", nome: "Pessoa do portal", email: "cliente.qa@teste.local", perfil: "CLIENTE", clienteId: "qa-ca" },
  ] });
  await ownerDb.projeto.createMany({ data: [
    { id: "qa-pa", clienteId: "qa-ca", nome: "Projeto QA A" },
    { id: "qa-pb", clienteId: "qa-cb", nome: "Projeto QA B" },
  ] });
  await ownerDb.tarefa.createMany({ data: [
    { id: "qa-ta", projetoId: "qa-pa", nome: "Tarefa A" },
    { id: "qa-tb", projetoId: "qa-pb", nome: "Tarefa B" },
  ] });
  await ownerDb.subtarefa.create({ data: { id: "qa-sa", tarefaId: "qa-ta", titulo: "Subtarefa A", atribuidoAUsuarioId: "qa-externo-sub" } });
  await ownerDb.atribuicao.createMany({ data: [
    { usuarioId: "qa-interno", entidadeTipo: "PROJETO", entidadeId: "qa-pa" },
    { usuarioId: "qa-interno-fora", entidadeTipo: "PROJETO", entidadeId: "qa-pb" },
    { usuarioId: "qa-externo", entidadeTipo: "TAREFA", entidadeId: "qa-ta" },
    { usuarioId: "qa-externo-inativo", entidadeTipo: "TAREFA", entidadeId: "qa-ta" },
  ] });
});

afterAll(async () => { await limparFixtures(); await fecharConexoes(); });

describe("quem acessa o projeto", () => {
  it("junta a administração, a equipe, os externos e o portal do cliente do projeto", async () => {
    const lista = await listarQuemAcessaProjeto(ctxAdmin, "qa-pa");
    expect(lista.map((p) => [p.nome, p.descricao])).toEqual([
      ["Talita acesso", "Administração"],
      ["Interno do projeto", "Equipe Múltiplus · projeto inteiro"],
      ["Externo da subtarefa", "Colaborador externo · 1 subtarefa"],
      ["Externo da tarefa", "Colaborador externo · 1 tarefa"],
      ["Cliente QA A", "Portal do cliente · 1 pessoa com acesso"],
    ]);
  });

  it("não traz atribuição de outro projeto nem pessoa desativada", async () => {
    const nomes = (await listarQuemAcessaProjeto(ctxAdmin, "qa-pa")).map((p) => p.nome);
    expect(nomes).not.toContain("Interno de outro projeto");
    expect(nomes).not.toContain("Externo desativado");
    const outro = (await listarQuemAcessaProjeto(ctxAdmin, "qa-pb")).map((p) => p.nome);
    expect(outro).toEqual(["Talita acesso", "Interno de outro projeto"]);
  });

  it("projeto inexistente devolve lista vazia", async () => {
    expect(await listarQuemAcessaProjeto(ctxAdmin, "nao-existe")).toEqual([]);
  });

  it.each(["ADMIN_INTERNO", "ADMIN_EXTERNO", "CLIENTE"] as const)("recusa o perfil %s", async (perfil) => {
    await expect(listarQuemAcessaProjeto({ usuarioId: "qa-interno", perfil }, "qa-pa")).rejects.toThrow("Ação restrita ao Administrador.");
  });
});
