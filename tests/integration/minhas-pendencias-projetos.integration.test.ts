/**
 * "Minhas pendências" por projeto em Meus projetos (protótipo interno/03): só os itens abertos em que o colaborador é o
 * responsável. Roda contra o Postgres de verdade, pela role RLS-restrita.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listarProjetosAtribuidos } from "@/lib/projetos-tarefas";
import { ownerDb, limparFixtures, fecharConexoes } from "./setup/helpers";

const data = (valor: string) => new Date(`${valor}T00:00:00.000Z`);
const ctxInterno = { usuarioId: "mp-interno", perfil: "ADMIN_INTERNO" as const };

beforeAll(async () => {
  await limparFixtures();
  await ownerDb.usuario.createMany({ data: [
    { id: "mp-interno", nome: "Interno pendências", email: "interno.mp@teste.local", perfil: "ADMIN_INTERNO" },
    { id: "mp-colega", nome: "Colega pendências", email: "colega.mp@teste.local", perfil: "ADMIN_INTERNO" },
  ] });
  await ownerDb.cliente.create({ data: { id: "mp-cliente", razaoSocial: "Cliente pendências", cnpj: "55666777000501", segmento: "Industrial", origemContato: "Indicação" } });
  await ownerDb.projeto.createMany({ data: [
    { id: "mp-p1", clienteId: "mp-cliente", nome: "Projeto com minhas pendências" },
    { id: "mp-p2", clienteId: "mp-cliente", nome: "Projeto só da equipe" },
  ] });
  await ownerDb.atribuicao.createMany({ data: [
    { usuarioId: "mp-interno", entidadeTipo: "PROJETO", entidadeId: "mp-p1" },
    { usuarioId: "mp-interno", entidadeTipo: "PROJETO", entidadeId: "mp-p2" },
  ] });
  await ownerDb.tarefa.createMany({ data: [
    { id: "mp-t1", projetoId: "mp-p1", nome: "Minha tarefa atrasada", prazo: data("2020-01-10"), responsavelUsuarioId: "mp-interno" },
    { id: "mp-t2", projetoId: "mp-p1", nome: "Minha tarefa no futuro", prazo: data("2099-01-10"), responsavelUsuarioId: "mp-interno" },
    { id: "mp-t3", projetoId: "mp-p1", nome: "Minha tarefa concluída", prazo: data("2020-02-10"), responsavelUsuarioId: "mp-interno", status: "CONCLUIDO" },
    { id: "mp-t4", projetoId: "mp-p1", nome: "Tarefa do colega", prazo: data("2020-03-10"), responsavelUsuarioId: "mp-colega" },
    { id: "mp-t5", projetoId: "mp-p2", nome: "Tarefa do colega no outro projeto", prazo: data("2020-03-10"), responsavelUsuarioId: "mp-colega" },
  ] });
  await ownerDb.subtarefa.createMany({ data: [
    { id: "mp-s1", tarefaId: "mp-t4", titulo: "Minha subtarefa na tarefa do colega", prazo: data("2020-04-10"), atribuidoAUsuarioId: "mp-interno" },
    { id: "mp-s2", tarefaId: "mp-t4", titulo: "Minha subtarefa concluída", atribuidoAUsuarioId: "mp-interno", status: "CONCLUIDO" },
    { id: "mp-s3", tarefaId: "mp-t4", titulo: "Subtarefa do colega", atribuidoAUsuarioId: "mp-colega" },
  ] });
});

afterAll(async () => { await limparFixtures(); await fecharConexoes(); });

describe("minhas pendências em Meus projetos", () => {
  it("conta só os itens abertos dele: tarefas e subtarefas, e as vencidas como atrasadas", async () => {
    const projetos = await listarProjetosAtribuidos(ctxInterno);
    const por = Object.fromEntries(projetos.map((p) => [p.id, p]));
    // Duas tarefas abertas (uma atrasada) e uma subtarefa aberta e atrasada na tarefa do colega.
    expect(por["mp-p1"]).toMatchObject({ minhasPendencias: 3, minhasAtrasadas: 2 });
    // No outro projeto a tarefa é do colega e não há nada dele: ele alcança o projeto, mas não tem pendência.
    expect(por["mp-p2"]).toMatchObject({ minhasPendencias: 0, minhasAtrasadas: 0 });
  });

  it("o número da equipe continua vindo das tarefas abertas do projeto", async () => {
    const p1 = (await listarProjetosAtribuidos(ctxInterno)).find((p) => p.id === "mp-p1");
    expect(p1?.tarefas.filter((t) => t.status !== "CONCLUIDO")).toHaveLength(3);
  });

  it.each(["ADMIN", "CLIENTE"] as const)("recusa o perfil %s", async (perfil) => {
    await expect(listarProjetosAtribuidos({ usuarioId: "mp-interno", perfil })).rejects.toThrow("Visão exclusiva de colaboradores.");
  });
});
