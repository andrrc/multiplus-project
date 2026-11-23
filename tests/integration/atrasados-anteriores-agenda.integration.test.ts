/**
 * Faixa "de meses anteriores continuam abertos" da agenda (protótipo 09-agenda): conta os itens abertos e vencidos antes do
 * mês exibido, com os filtros da tela. A agenda do colaborador interno só conta o que a RLS entrega a ele.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { contarAtrasadosAnterioresAgenda, contarAtrasadosAnterioresColaborador } from "@/lib/projetos-tarefas";
import { ownerDb, limparFixtures, fecharConexoes } from "./setup/helpers";

const data = (valor: string) => new Date(`${valor}T00:00:00.000Z`);
const inicioDoMes = data("2030-01-01");

const ctxAdmin = { usuarioId: "atr-admin", perfil: "ADMIN" as const };
const ctxInterno = { usuarioId: "atr-interno", perfil: "ADMIN_INTERNO" as const };

beforeAll(async () => {
  await limparFixtures();
  await ownerDb.usuario.createMany({ data: [
    { id: "atr-admin", nome: "Talita atrasos", email: "talita.atrasos@teste.local", perfil: "ADMIN" },
    { id: "atr-interno", nome: "Interno atrasos", email: "interno.atrasos@teste.local", perfil: "ADMIN_INTERNO" },
    { id: "atr-externo", nome: "Externo atrasos", email: "externo.atrasos@teste.local", perfil: "ADMIN_EXTERNO" },
  ] });
  await ownerDb.cliente.create({ data: { id: "atr-cliente", razaoSocial: "Cliente atrasos", cnpj: "55666777000301", segmento: "Industrial", origemContato: "Indicação" } });
  await ownerDb.projeto.createMany({ data: [
    { id: "atr-p-interno", clienteId: "atr-cliente", nome: "Projeto do interno" },
    { id: "atr-p-outro", clienteId: "atr-cliente", nome: "Projeto de outra equipe" },
    { id: "atr-p-inativo", clienteId: "atr-cliente", nome: "Projeto desativado", ativo: false },
  ] });
  await ownerDb.atribuicao.create({ data: { usuarioId: "atr-interno", entidadeTipo: "PROJETO", entidadeId: "atr-p-interno" } });
  await ownerDb.tarefa.createMany({ data: [
    { id: "atr-t1", projetoId: "atr-p-interno", nome: "Atrasada antiga do interno", prazo: data("2020-01-10") },
    { id: "atr-t2", projetoId: "atr-p-interno", nome: "Atrasada do interno em 2026", prazo: data("2026-10-10") },
    { id: "atr-t3", projetoId: "atr-p-interno", nome: "Concluída antiga", prazo: data("2020-02-10"), status: "CONCLUIDO" },
    { id: "atr-t4", projetoId: "atr-p-interno", nome: "Cancelada antiga", prazo: data("2020-03-10"), status: "CANCELADO" },
    { id: "atr-t5", projetoId: "atr-p-interno", nome: "Desativada antiga", prazo: data("2020-04-10"), ativo: false },
    { id: "atr-t6", projetoId: "atr-p-interno", nome: "Sem prazo" },
    { id: "atr-t7", projetoId: "atr-p-interno", nome: "No mês exibido", prazo: data("2030-01-20") },
    { id: "atr-t8", projetoId: "atr-p-interno", nome: "Visita antiga", prazo: data("2020-05-10"), status: "VISITA_REUNIAO_AGENDADA" },
    { id: "atr-t9", projetoId: "atr-p-outro", nome: "Atrasada de outra equipe", prazo: data("2020-01-12"), responsavelUsuarioId: "atr-externo" },
    { id: "atr-t10", projetoId: "atr-p-inativo", nome: "De projeto desativado", prazo: data("2020-06-10") },
  ] });
});

afterAll(async () => { await limparFixtures(); await fecharConexoes(); });

describe("atrasados de meses anteriores na agenda da administração", () => {
  it("conta só o que está aberto, ativo e vencido antes do mês exibido", async () => {
    // Atrasada antiga, atrasada de 2026, visita antiga e a de outra equipe; as demais são fechadas, sem prazo, do mês ou de projeto desativado.
    expect(await contarAtrasadosAnterioresAgenda(ctxAdmin, inicioDoMes)).toBe(4);
  });

  it("respeita os filtros de projeto, responsável e só visitas", async () => {
    expect(await contarAtrasadosAnterioresAgenda(ctxAdmin, inicioDoMes, { projetoId: "atr-p-interno" })).toBe(3);
    expect(await contarAtrasadosAnterioresAgenda(ctxAdmin, inicioDoMes, { responsavel: "usuario:atr-externo" })).toBe(1);
    expect(await contarAtrasadosAnterioresAgenda(ctxAdmin, inicioDoMes, { visitas: true })).toBe(1);
    expect(await contarAtrasadosAnterioresAgenda(ctxAdmin, inicioDoMes, { responsavel: "invalido" })).toBe(0);
  });

  it("um mês anterior às datas não conta o que ainda vai vencer", async () => {
    expect(await contarAtrasadosAnterioresAgenda(ctxAdmin, data("2020-01-01"))).toBe(0);
    // Em 2029-12 as três do projeto do interno (2020 e 10/2026) já venceram e são de mês anterior; o prazo de 2030-01-20 ainda não chegou.
    expect(await contarAtrasadosAnterioresAgenda(ctxAdmin, data("2029-12-01"), { projetoId: "atr-p-interno" })).toBe(3);
  });

  it.each(["ADMIN_INTERNO", "ADMIN_EXTERNO", "CLIENTE"] as const)("recusa o perfil %s", async (perfil) => {
    await expect(contarAtrasadosAnterioresAgenda({ usuarioId: "atr-interno", perfil }, inicioDoMes)).rejects.toThrow("Ação restrita ao Administrador.");
  });
});

describe("atrasados de meses anteriores na agenda do colaborador interno", () => {
  it("conta só o que está no escopo dele", async () => {
    // As três do projeto dele: a atrasada antiga, a de 2026 e a visita antiga. A de outra equipe não entra.
    expect(await contarAtrasadosAnterioresColaborador(ctxInterno, inicioDoMes)).toBe(3);
  });

  it.each(["ADMIN", "ADMIN_EXTERNO", "CLIENTE"] as const)("recusa o perfil %s", async (perfil) => {
    await expect(contarAtrasadosAnterioresColaborador({ usuarioId: "atr-admin", perfil }, inicioDoMes)).rejects.toThrow("Agenda disponível somente para o colaborador interno.");
  });
});
