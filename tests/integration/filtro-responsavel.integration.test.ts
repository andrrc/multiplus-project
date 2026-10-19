/** RF-005/RF-037/RF-039, RN-007/RN-009: filtros no servidor, opções mínimas e acesso negado. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listarPrazos, listarSubtarefasPrazos, listarResponsaveisParaFiltro, listarItensAgenda, indicadorDePrazosSubtarefas } from "@/lib/projetos-tarefas";
import { ownerDb, limparFixtures, fecharConexoes } from "./setup/helpers";

const ctx = { usuarioId: "filtro-admin", perfil: "ADMIN" as const };
const prazo = new Date("2099-12-20T00:00:00Z");
const outroPrazo = new Date("2020-01-01T00:00:00Z");

beforeAll(async () => {
  await limparFixtures();
  await ownerDb.usuario.createMany({ data: [
    { id: ctx.usuarioId, nome: "Administradora", email: "admin.filtro@teste.local", perfil: "ADMIN" },
    { id: "filtro-comum", nome: "Ana", email: "equipe.filtro@teste.local", perfil: "ADMIN_INTERNO", ativo: false },
    { id: "filtro-externo", nome: "Externo", email: "externo.filtro@teste.local", perfil: "ADMIN_EXTERNO" },
    { id: "filtro-cliente", nome: "Cliente", email: "cliente.filtro@teste.local", perfil: "CLIENTE" },
  ] });
  await ownerDb.cliente.createMany({ data: [
    { id: "filtro-ca", razaoSocial: "Cliente A", cnpj: "44555566000105", segmento: "Industrial", origemContato: "Indicação" },
    { id: "filtro-cb", razaoSocial: "Cliente B", cnpj: "44555566000106", segmento: "Industrial", origemContato: "Indicação" },
    { id: "filtro-ci", razaoSocial: "Cliente desativado", cnpj: "44555566000107", segmento: "Industrial", origemContato: "Indicação", ativo: false },
  ] });
  await ownerDb.pessoaEnvolvida.createMany({ data: [
    { id: "filtro-comum", clienteId: "filtro-ca", nome: "Ana", email: "pessoa.filtro@teste.local", telefone: "11999999999", ativo: false, temAcesso: false },
    { id: "filtro-pb", clienteId: "filtro-cb", nome: "Ana", email: "pessoa.b.filtro@teste.local", temAcesso: false },
    { id: "filtro-oculta", clienteId: "filtro-ca", nome: "Sem registros elegíveis", email: "oculta.filtro@teste.local" },
  ] });
  await ownerDb.projeto.createMany({ data: [
    { id: "filtro-pa", clienteId: "filtro-ca", nome: "Projeto A" },
    { id: "filtro-pb", clienteId: "filtro-cb", nome: "Projeto B" },
    { id: "filtro-pi", clienteId: "filtro-ca", nome: "Projeto inativo", ativo: false },
    { id: "filtro-pci", clienteId: "filtro-ci", nome: "Projeto cliente inativo" },
  ] });
  await ownerDb.tarefa.createMany({ data: [
    { id: "filtro-tp", projetoId: "filtro-pa", nome: "Pessoa", prazo, responsavelId: "filtro-comum" },
    { id: "filtro-tu", projetoId: "filtro-pa", nome: "Equipe", prazo, responsavelUsuarioId: "filtro-comum" },
    { id: "filtro-ts", projetoId: "filtro-pa", nome: "Sem responsável", prazo },
    { id: "filtro-tb", projetoId: "filtro-pb", nome: "Outro cliente", prazo, responsavelId: "filtro-pb" },
    { id: "filtro-ti", projetoId: "filtro-pa", nome: "Tarefa inativa", prazo, ativo: false, responsavelId: "filtro-oculta" },
    { id: "filtro-tpi", projetoId: "filtro-pi", nome: "Projeto inativo", prazo, responsavelId: "filtro-oculta" },
    { id: "filtro-tci", projetoId: "filtro-pci", nome: "Cliente inativo", prazo, responsavelUsuarioId: "filtro-comum" },
  ] });
  await ownerDb.subtarefa.createMany({ data: [
    { id: "filtro-sp", tarefaId: "filtro-tu", titulo: "Pessoa na tarefa da equipe", prazo, atribuidoAId: "filtro-comum" },
    { id: "filtro-su", tarefaId: "filtro-tp", titulo: "Equipe na tarefa da pessoa", prazo: outroPrazo, atribuidoAUsuarioId: "filtro-comum" },
    { id: "filtro-ss", tarefaId: "filtro-tp", titulo: "Sem responsável", prazo },
    { id: "filtro-sc", tarefaId: "filtro-tu", titulo: "Concluída", prazo, atribuidoAUsuarioId: "filtro-externo", status: "CONCLUIDO" },
    { id: "filtro-sx", tarefaId: "filtro-tu", titulo: "Cancelada", prazo, atribuidoAUsuarioId: "filtro-externo", status: "CANCELADO" },
    { id: "filtro-sb", tarefaId: "filtro-tb", titulo: "Outro cliente", prazo, atribuidoAId: "filtro-pb" },
    { id: "filtro-si", tarefaId: "filtro-tp", titulo: "Inativa", prazo, ativo: false, atribuidoAId: "filtro-oculta" },
    { id: "filtro-sti", tarefaId: "filtro-ti", titulo: "Tarefa inativa", prazo, atribuidoAId: "filtro-oculta" },
    { id: "filtro-spi", tarefaId: "filtro-tpi", titulo: "Projeto inativo", prazo, atribuidoAId: "filtro-oculta" },
    { id: "filtro-sci", tarefaId: "filtro-tci", titulo: "Cliente inativo", prazo, atribuidoAUsuarioId: "filtro-comum" },
  ] });
});

afterAll(async () => { await limparFixtures(); await fecharConexoes(); });
const ids = (registros: { id: string }[]) => registros.map(r => r.id).sort();

describe("consulta filtrada", () => {
  it("distingue pessoa e equipe mesmo com nome e id iguais", async () => {
    expect(ids(await listarPrazos(ctx, { clienteId: "filtro-ca", responsavel: "pessoa:filtro-comum" }))).toEqual(["filtro-tp"]);
    expect(ids(await listarPrazos(ctx, { clienteId: "filtro-ca", responsavel: "usuario:filtro-comum" }))).toEqual(["filtro-tu"]);
    expect(ids(await listarSubtarefasPrazos(ctx, { clienteId: "filtro-ca", responsavel: "pessoa:filtro-comum" }))).toEqual(["filtro-sp"]);
    expect(ids(await listarSubtarefasPrazos(ctx, { clienteId: "filtro-ca", responsavel: "usuario:filtro-comum" }))).toEqual(["filtro-su"]);
  });
  it("sem responsável exige ambos os vínculos nulos", async () => {
    expect(ids(await listarPrazos(ctx, { responsavel: "sem" }))).toEqual(["filtro-ts"]);
    expect(ids(await listarSubtarefasPrazos(ctx, { responsavel: "sem" }))).toEqual(["filtro-ss"]);
  });
  it("combina cliente, projeto e tarefa sem herdar responsável do pai", async () => {
    const filtros = { clienteId: "filtro-ca", projetoId: "filtro-pa", tarefaId: "filtro-tu", responsavel: "pessoa:filtro-comum" };
    expect(ids(await listarSubtarefasPrazos(ctx, filtros))).toEqual(["filtro-sp"]);
    expect(await listarPrazos(ctx, filtros)).toEqual([]);
    expect(await listarSubtarefasPrazos(ctx, { ...filtros, clienteId: "filtro-cb" })).toEqual([]);
    expect(await listarPrazos(ctx, { clienteId: "filtro-cb", responsavel: "pessoa:filtro-comum" })).toEqual([]);
  });
  it.each(["pessoa:inexistente", "usuario:inexistente", "invalido", ["sem", "usuario:filtro-comum"]])("não amplia resultado para %j", async responsavel => {
    expect(await listarPrazos(ctx, { responsavel })).toEqual([]);
    expect(await listarSubtarefasPrazos(ctx, { responsavel })).toEqual([]);
  });
  it("toggle inclui concluídas/canceladas e indicador acompanha o responsável", async () => {
    expect(await listarSubtarefasPrazos(ctx, { responsavel: "usuario:filtro-externo", pendentes: true })).toEqual([]);
    expect(ids(await listarSubtarefasPrazos(ctx, { responsavel: "usuario:filtro-externo", pendentes: false }))).toEqual(["filtro-sc", "filtro-sx"]);
    expect(indicadorDePrazosSubtarefas(await listarSubtarefasPrazos(ctx, { responsavel: "pessoa:filtro-comum" }))).toMatchObject({ emDia: 1, total: 1, percentual: 100 });
    expect(indicadorDePrazosSubtarefas(await listarSubtarefasPrazos(ctx, { clienteId: "filtro-ca", responsavel: "usuario:filtro-comum" }))).toMatchObject({ emDia: 0, total: 1, percentual: 0 });
  });
  it("retira registros e pais desativados, preservando a visão ADMIN de cliente desativado", async () => {
    expect(ids(await listarPrazos(ctx))).toEqual(["filtro-tb", "filtro-tci", "filtro-tp", "filtro-ts", "filtro-tu"]);
    expect(ids(await listarSubtarefasPrazos(ctx))).toEqual(["filtro-sb", "filtro-sc", "filtro-sci", "filtro-sp", "filtro-ss", "filtro-su", "filtro-sx"]);
  });
  it("preserva a agenda sem seleção de responsável", async () => {
    const inicio = new Date("2099-12-01T00:00:00Z"), fim = new Date("2100-01-01T00:00:00Z");
    expect(ids(await listarItensAgenda(ctx, inicio, fim, { clienteId: "filtro-ca" }))).toEqual(["filtro-tp", "filtro-ts", "filtro-tu"]);
  });
});

describe("opções mínimas de responsável", () => {
  it.each(["tarefas", "subtarefas"] as const)("%s mantém homônimos distintos, inclusive inativos com registros ativos", async entidade => {
    const opcoes = await listarResponsaveisParaFiltro(ctx, entidade, { pendentes: true });
    expect(opcoes).toEqual([
      { valor: "usuario:filtro-comum", nome: "Ana · Equipe Múltiplus" },
      { valor: "pessoa:filtro-comum", nome: "Ana · Pessoa envolvida · Cliente A" },
      { valor: "pessoa:filtro-pb", nome: "Ana · Pessoa envolvida · Cliente B" },
    ]);
    expect(JSON.stringify(opcoes)).not.toMatch(/email|telefone|cpf|cnpj|@teste.local/);
  });
  it("considera os demais filtros e o toggle, mas ignora a seleção de responsável", async () => {
    expect(await listarResponsaveisParaFiltro(ctx, "subtarefas", { clienteId: "filtro-ca", projetoId: "filtro-pa", tarefaId: "filtro-tu", pendentes: true, responsavel: "sem" })).toEqual([
      { valor: "pessoa:filtro-comum", nome: "Ana · Pessoa envolvida · Cliente A" },
    ]);
    const opcoes = await listarResponsaveisParaFiltro(ctx, "subtarefas", { tarefaId: "filtro-tu", pendentes: false });
    expect(opcoes.map(o => o.valor)).toEqual(["pessoa:filtro-comum", "usuario:filtro-externo"]);
    expect(await listarResponsaveisParaFiltro(ctx, "tarefas", { tarefaId: "filtro-ts" })).toEqual([]);
  });
});

it.each(["ADMIN_INTERNO", "ADMIN_EXTERNO", "CLIENTE"] as const)("nega consultas diretas a %s mesmo com ids conhecidos", async perfil => {
  const usuarioId = perfil === "ADMIN_INTERNO" ? "filtro-comum" : perfil === "ADMIN_EXTERNO" ? "filtro-externo" : "filtro-cliente";
  const negado = { usuarioId, perfil };
  const filtros = { clienteId: "filtro-cb", responsavel: "pessoa:filtro-pb" };
  await expect(listarPrazos(negado, filtros)).rejects.toThrow(/Ação restrita ao Administrador/);
  await expect(listarSubtarefasPrazos(negado, filtros)).rejects.toThrow(/Ação restrita ao Administrador/);
  await expect(listarResponsaveisParaFiltro(negado, "tarefas", filtros)).rejects.toThrow(/Ação restrita ao Administrador/);
  await expect(listarResponsaveisParaFiltro(negado, "subtarefas", filtros)).rejects.toThrow(/Ação restrita ao Administrador/);
});
