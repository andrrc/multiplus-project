/** RF-005/RF-008/RF-039, RN-007/RN-009: progresso agregado das subtarefas nas tarefas. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listarPrazos, listarItensAgenda, atualizarStatusSubtarefa } from "@/lib/projetos-tarefas";
import { ownerDb, limparFixtures, fecharConexoes } from "./setup/helpers";

const ctx = { usuarioId: "progresso-admin", perfil: "ADMIN" as const };
const prazo = new Date("2099-12-20T00:00:00Z");
beforeAll(async () => {
  await limparFixtures();
  await ownerDb.usuario.createMany({ data: [
    { id: ctx.usuarioId, nome: "Administradora", email: "admin.progresso@teste.local", perfil: "ADMIN" },
    { id: "progresso-equipe", nome: "Equipe", email: "equipe.progresso@teste.local", perfil: "ADMIN_INTERNO" },
  ] });
  await ownerDb.cliente.createMany({ data: [
    { id: "progresso-ca", razaoSocial: "Cliente A", cnpj: "44555566000105", segmento: "Industrial", origemContato: "Indicação" },
    { id: "progresso-cb", razaoSocial: "Cliente B", cnpj: "44555566000106", segmento: "Industrial", origemContato: "Indicação" },
  ] });
  await ownerDb.pessoaEnvolvida.create({ data: { id: "progresso-pessoa", clienteId: "progresso-ca", nome: "Pessoa", email: "pessoa.progresso@teste.local", temAcesso: false } });
  await ownerDb.projeto.createMany({ data: [
    { id: "progresso-pa", clienteId: "progresso-ca", nome: "Projeto A" },
    { id: "progresso-pb", clienteId: "progresso-cb", nome: "Projeto B" },
    { id: "progresso-pi", clienteId: "progresso-ca", nome: "Projeto desativado", ativo: false },
  ] });
  await ownerDb.tarefa.createMany({ data: [
    { id: "progresso-t1", projetoId: "progresso-pa", nome: "Mista", prazo, responsavelUsuarioId: "progresso-equipe" },
    { id: "progresso-t2", projetoId: "progresso-pa", nome: "Sem subtarefas", prazo, responsavelId: "progresso-pessoa" },
    { id: "progresso-t3", projetoId: "progresso-pb", nome: "Todas concluídas", prazo, responsavelUsuarioId: "progresso-equipe" },
    { id: "progresso-t4", projetoId: "progresso-pa", nome: "Somente canceladas", prazo },
    { id: "progresso-ti", projetoId: "progresso-pa", nome: "Tarefa inativa", prazo, ativo: false },
    { id: "progresso-tpi", projetoId: "progresso-pi", nome: "Projeto inativo", prazo },
  ] });
  await ownerDb.subtarefa.createMany({ data: [
    { id: "progresso-s1", tarefaId: "progresso-t1", titulo: "Conteúdo interno 1", status: "CONCLUIDO", atribuidoAId: "progresso-pessoa" },
    { id: "progresso-s2", tarefaId: "progresso-t1", titulo: "Conteúdo interno 2", status: "CONCLUIDO", atribuidoAUsuarioId: "progresso-equipe" },
    ...[3, 4, 5, 6].map(n => ({ id: `progresso-s${n}`, tarefaId: "progresso-t1", titulo: `Pendente ${n}` })),
    { id: "progresso-sc", tarefaId: "progresso-t1", titulo: "Cancelada", status: "CANCELADO" },
    { id: "progresso-si", tarefaId: "progresso-t1", titulo: "Concluída inativa", status: "CONCLUIDO", ativo: false },
    { id: "progresso-spi", tarefaId: "progresso-t1", titulo: "Pendente inativa", ativo: false },
    { id: "progresso-sb", tarefaId: "progresso-t3", titulo: "Outro cliente", status: "CONCLUIDO" },
    { id: "progresso-sx", tarefaId: "progresso-t4", titulo: "Cancelada", status: "CANCELADO" },
    { id: "progresso-sti", tarefaId: "progresso-ti", titulo: "Pai inativo", status: "CONCLUIDO" },
    { id: "progresso-spai", tarefaId: "progresso-tpi", titulo: "Projeto inativo", status: "CONCLUIDO" },
  ] });
});
afterAll(async () => { await limparFixtures(); await fecharConexoes(); });

describe("progresso de subtarefas", () => {
  it("conta 2/6 incluindo outros responsáveis e sem responsável; exclui canceladas e inativas", async () => {
    const tarefas = await listarPrazos(ctx, { clienteId: "progresso-ca", responsavel: "usuario:progresso-equipe" }, true);
    expect(tarefas.map(t => ({ id: t.id, progresso: t.progressoSubtarefas, aviso: t._count.subtarefas }))).toEqual([
      { id: "progresso-t1", progresso: { concluidas: 2, total: 6 }, aviso: 4 },
    ]);
    expect(tarefas[0]).not.toHaveProperty("subtarefas");
    expect(Object.keys(tarefas[0].progressoSubtarefas!).sort()).toEqual(["concluidas", "total"]);
    expect(JSON.stringify(tarefas)).not.toContain("Conteúdo interno");
  });
  it("mantém contagens independentes de várias tarefas/clientes e exclui pais desativados", async () => {
    const tarefas = await listarPrazos(ctx, {}, true);
    expect(tarefas.map(t => ({ id: t.id, progresso: t.progressoSubtarefas })).sort((a, b) => a.id.localeCompare(b.id))).toEqual([
      { id: "progresso-t1", progresso: { concluidas: 2, total: 6 } },
      { id: "progresso-t2", progresso: { concluidas: 0, total: 0 } },
      { id: "progresso-t3", progresso: { concluidas: 1, total: 1 } },
      { id: "progresso-t4", progresso: { concluidas: 0, total: 0 } },
    ]);
    expect((await listarPrazos(ctx, { responsavel: "pessoa:progresso-pessoa" }, true))[0].progressoSubtarefas).toEqual({ concluidas: 0, total: 0 });
    expect((await listarPrazos(ctx, { responsavel: "sem" }, true))[0].progressoSubtarefas).toEqual({ concluidas: 0, total: 0 });
  });
  it("não carrega progresso quando não solicitado, preservando agenda e retorno anterior", async () => {
    expect((await listarPrazos(ctx)).every(t => !Object.hasOwn(t, "progressoSubtarefas"))).toBe(true);
    const agenda = await listarItensAgenda(ctx, new Date("2099-12-01"), new Date("2100-01-01"), { clienteId: "progresso-ca" });
    expect(agenda.map(t => t.id).sort()).toEqual(["progresso-t1", "progresso-t2", "progresso-t4"]);
    expect(agenda.every(t => !Object.hasOwn(t, "progressoSubtarefas"))).toBe(true);
  });
  it("combina filtros e retorna vazio para seleção sem correspondência ou inválida", async () => {
    expect(await listarPrazos(ctx, { clienteId: "progresso-cb", tarefaId: "progresso-t1" }, true)).toEqual([]);
    expect(await listarPrazos(ctx, { responsavel: "invalido" }, true)).toEqual([]);
  });
  it("reflete conclusão, reabertura, cancelamento e desativação na próxima consulta", async () => {
    const filtros = { tarefaId: "progresso-t1" };
    try {
      await atualizarStatusSubtarefa(ctx, "progresso-s3", "CONCLUIDO");
      expect((await listarPrazos(ctx, filtros, true))[0].progressoSubtarefas).toEqual({ concluidas: 3, total: 6 });
      await atualizarStatusSubtarefa(ctx, "progresso-s3", "EM_ANDAMENTO");
      expect((await listarPrazos(ctx, filtros, true))[0].progressoSubtarefas).toEqual({ concluidas: 2, total: 6 });
      await atualizarStatusSubtarefa(ctx, "progresso-s3", "CANCELADO");
      expect((await listarPrazos(ctx, filtros, true))[0].progressoSubtarefas).toEqual({ concluidas: 2, total: 5 });
      await ownerDb.subtarefa.update({ where: { id: "progresso-s1" }, data: { ativo: false } });
      expect((await listarPrazos(ctx, filtros, true))[0].progressoSubtarefas).toEqual({ concluidas: 1, total: 4 });
    } finally {
      await ownerDb.subtarefa.update({ where: { id: "progresso-s1" }, data: { ativo: true } });
      await atualizarStatusSubtarefa(ctx, "progresso-s3", "EM_ANDAMENTO");
    }
  });
  it.each(["ADMIN_INTERNO", "ADMIN_EXTERNO", "CLIENTE"] as const)("nega a nova contagem ao perfil %s", async perfil => {
    await expect(listarPrazos({ usuarioId: "progresso-equipe", perfil }, { tarefaId: "progresso-t1" }, true)).rejects.toThrow(/Ação restrita ao Administrador/);
  });
});
