/**
 * Subtarefas do colaborador interno na lista "Minhas tarefas": só as dele, pela role RLS-restrita, e só para esse perfil.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listarSubtarefasAtribuidas, listarTarefasAtribuidas } from "@/lib/projetos-tarefas";
import { ownerDb, limparFixtures, fecharConexoes } from "./setup/helpers";

const ctxInterno = { usuarioId: "sa-interno", perfil: "ADMIN_INTERNO" as const };

beforeAll(async () => {
  await limparFixtures();
  await ownerDb.usuario.createMany({ data: [
    { id: "sa-interno", nome: "Interno subtarefas", email: "interno.sa@teste.local", perfil: "ADMIN_INTERNO" },
    { id: "sa-colega", nome: "Colega subtarefas", email: "colega.sa@teste.local", perfil: "ADMIN_INTERNO" },
    { id: "sa-externo", nome: "Externo subtarefas", email: "externo.sa@teste.local", perfil: "ADMIN_EXTERNO" },
  ] });
  await ownerDb.cliente.create({ data: { id: "sa-cliente", razaoSocial: "Cliente subtarefas", cnpj: "55666777000401", segmento: "Industrial", origemContato: "Indicação" } });
  await ownerDb.projeto.createMany({ data: [
    { id: "sa-p1", clienteId: "sa-cliente", nome: "Projeto do interno" },
    { id: "sa-p2", clienteId: "sa-cliente", nome: "Projeto de outra equipe" },
    { id: "sa-p3", clienteId: "sa-cliente", nome: "Projeto desativado", ativo: false },
  ] });
  await ownerDb.atribuicao.createMany({ data: [
    { usuarioId: "sa-interno", entidadeTipo: "PROJETO", entidadeId: "sa-p1" },
    { usuarioId: "sa-colega", entidadeTipo: "PROJETO", entidadeId: "sa-p2" },
  ] });
  await ownerDb.tarefa.createMany({ data: [
    { id: "sa-t1", projetoId: "sa-p1", nome: "Tarefa do projeto do interno", prazo: new Date("2030-02-10T00:00:00Z") },
    { id: "sa-t2", projetoId: "sa-p2", nome: "Tarefa de outra equipe", prazo: new Date("2030-02-11T00:00:00Z") },
    // A desativação do projeto desativa as tarefas e subtarefas em cascata; aqui a subtarefa ficou ativa de propósito.
    { id: "sa-t3", projetoId: "sa-p3", nome: "Tarefa de projeto desativado", ativo: false },
    { id: "sa-t4", projetoId: "sa-p1", nome: "Tarefa em que ele é o responsável", responsavelUsuarioId: "sa-interno" },
  ] });
  await ownerDb.subtarefa.createMany({ data: [
    { id: "sa-s1", tarefaId: "sa-t1", titulo: "Minha subtarefa", prazo: new Date("2030-02-05T00:00:00Z"), atribuidoAUsuarioId: "sa-interno", comprovanteExigido: true, comprovanteQuantidade: 1 },
    { id: "sa-s2", tarefaId: "sa-t1", titulo: "Subtarefa de um colega", atribuidoAUsuarioId: "sa-colega" },
    { id: "sa-s3", tarefaId: "sa-t1", titulo: "Subtarefa sem responsável" },
    { id: "sa-s4", tarefaId: "sa-t1", titulo: "Minha subtarefa desativada", atribuidoAUsuarioId: "sa-interno", ativo: false },
    { id: "sa-s5", tarefaId: "sa-t2", titulo: "Minha subtarefa em projeto de outra equipe", atribuidoAUsuarioId: "sa-interno" },
    { id: "sa-s6", tarefaId: "sa-t3", titulo: "Minha subtarefa em projeto desativado", atribuidoAUsuarioId: "sa-interno" },
    { id: "sa-s7", tarefaId: "sa-t1", titulo: "Minha subtarefa com pedido pendente", atribuidoAUsuarioId: "sa-interno" },
  ] });
  await ownerDb.solicitacaoConclusao.create({ data: { subtarefaId: "sa-s7", solicitadoPorId: "sa-interno", solicitadoPorNome: "Interno subtarefas", statusAnterior: "EM_ANDAMENTO" } });
});

afterAll(async () => {
  await ownerDb.solicitacaoConclusao.deleteMany();
  await limparFixtures();
  await fecharConexoes();
});

describe("subtarefas do colaborador interno", () => {
  it("traz só as ativas em que ele é o responsável, com a tarefa e o projeto de origem", async () => {
    const lista = await listarSubtarefasAtribuidas(ctxInterno);
    const titulos = lista.map((s) => s.titulo);
    expect(titulos).toContain("Minha subtarefa");
    expect(titulos).toContain("Minha subtarefa com pedido pendente");
    expect(titulos).not.toContain("Subtarefa de um colega");
    expect(titulos).not.toContain("Subtarefa sem responsável");
    expect(titulos).not.toContain("Minha subtarefa desativada");
    expect(titulos).not.toContain("Minha subtarefa em projeto desativado");
    const minha = lista.find((s) => s.titulo === "Minha subtarefa");
    expect(lista.find((s) => s.titulo === "Minha subtarefa com pedido pendente")?.pedidoPendente).toBe(true);
    expect(minha).toMatchObject({ comprovanteExigido: true, pedidoPendente: false, tarefa: { nome: "Tarefa do projeto do interno", projeto: { nome: "Projeto do interno", cliente: { razaoSocial: "Cliente subtarefas" } } } });
  });

  it("a tarefa do colaborador diz se o item é dele (`meu`)", async () => {
    const tarefas = await listarTarefasAtribuidas(ctxInterno);
    const por = Object.fromEntries(tarefas.map((t) => [t.id, t.meu]));
    // Ele é o responsável da sa-t4; na sa-t1 só tem subtarefas, então a tarefa não é dele.
    expect(por["sa-t4"]).toBe(true);
    expect(por["sa-t1"]).toBe(false);
  });

  it.each(["ADMIN", "ADMIN_EXTERNO", "CLIENTE"] as const)("recusa o perfil %s", async (perfil) => {
    await expect(listarSubtarefasAtribuidas({ usuarioId: "sa-externo", perfil })).rejects.toThrow("Visão exclusiva do colaborador interno.");
  });
});
