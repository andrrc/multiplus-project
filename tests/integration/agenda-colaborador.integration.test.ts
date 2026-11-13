/**
 * Agenda do colaborador interno e restrição de dados do colaborador externo (análise de 13/11/2026,
 * docs/analises/restricao-externo-e-agenda-interno.md). Roda contra o Postgres de verdade, pela role RLS-restrita.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listarItensAgenda, listarItensAgendaColaborador } from "@/lib/projetos-tarefas";
import { buscarClienteContextual, listarClientesContextuais } from "@/lib/clientes";
import { ownerDb, limparFixtures, fecharConexoes } from "./setup/helpers";

const data = (valor: string) => new Date(`${valor}T00:00:00.000Z`);
const inicio = data("2030-01-01");
const fim = new Date("2030-01-31T23:59:59.000Z");

let admin: { id: string };
let interno: { id: string };
let externo: { id: string };
let cliente: { id: string };
let projetoDoInterno: { id: string };
let projetoDeOutro: { id: string };

const ctxAdmin = () => ({ usuarioId: admin.id, perfil: "ADMIN" as const });
const ctxInterno = () => ({ usuarioId: interno.id, perfil: "ADMIN_INTERNO" as const });
const ctxExterno = () => ({ usuarioId: externo.id, perfil: "ADMIN_EXTERNO" as const });

beforeAll(async () => {
  await limparFixtures();
  admin = await ownerDb.usuario.create({ data: { nome: "Talita agenda", email: "talita.agenda@teste.local", perfil: "ADMIN" } });
  interno = await ownerDb.usuario.create({ data: { nome: "Interno agenda", email: "interno.agenda@teste.local", perfil: "ADMIN_INTERNO" } });
  externo = await ownerDb.usuario.create({ data: { nome: "Externo agenda", email: "externo.agenda@teste.local", perfil: "ADMIN_EXTERNO" } });
  cliente = await ownerDb.cliente.create({
    data: {
      razaoSocial: "Cliente agenda Ltda",
      cnpj: "55666777000108",
      segmento: "Industrial",
      origemContato: "Indicação",
      endereco: "Rua Reservada, 100",
      cep: "18000000",
      rg: "12.345.678-9",
    },
  });
  projetoDoInterno = await ownerDb.projeto.create({ data: { clienteId: cliente.id, nome: "Projeto do interno" } });
  projetoDeOutro = await ownerDb.projeto.create({ data: { clienteId: cliente.id, nome: "Projeto de outra equipe" } });
  await ownerDb.atribuicao.create({ data: { usuarioId: interno.id, entidadeTipo: "PROJETO", entidadeId: projetoDoInterno.id } });
  await ownerDb.tarefa.create({ data: { projetoId: projetoDoInterno.id, nome: "Prazo do interno", prazo: data("2030-01-10") } });
  await ownerDb.tarefa.create({ data: { projetoId: projetoDeOutro.id, nome: "Prazo de outra equipe", prazo: data("2030-01-12") } });
  await ownerDb.tarefa.create({ data: { projetoId: projetoDoInterno.id, nome: "Prazo fora do mês", prazo: data("2030-03-05") } });
});

afterAll(async () => {
  await limparFixtures();
  await fecharConexoes();
});

describe("agenda do colaborador interno", () => {
  it("lista só os prazos do mês das tarefas do escopo dele", async () => {
    const itens = await listarItensAgendaColaborador(ctxInterno(), inicio, fim);
    expect(itens.map((item) => item.nome)).toEqual(["Prazo do interno"]);
    expect(itens[0]).toMatchObject({ projeto: { nome: "Projeto do interno", cliente: { razaoSocial: "Cliente agenda Ltda" } } });
  });

  it("a administração continua vendo todos os prazos na própria agenda", async () => {
    const itens = await listarItensAgenda(ctxAdmin(), inicio, fim);
    expect(itens.map((item) => item.nome)).toEqual(["Prazo do interno", "Prazo de outra equipe"]);
  });

  it("recusa o colaborador externo e a administração na consulta do colaborador", async () => {
    await expect(listarItensAgendaColaborador(ctxExterno(), inicio, fim)).rejects.toThrow("Agenda disponível somente para o colaborador interno.");
    await expect(listarItensAgendaColaborador(ctxAdmin(), inicio, fim)).rejects.toThrow("Agenda disponível somente para o colaborador interno.");
  });

  it("o colaborador não usa a consulta da administração", async () => {
    await expect(listarItensAgenda(ctxInterno(), inicio, fim)).rejects.toThrow(/Ação restrita ao Administrador/);
  });
});

describe("cadastro contextual do cliente para colaboradores", () => {
  it("não entrega RG, endereço nem CEP ao colaborador interno", async () => {
    const detalhe = await buscarClienteContextual(ctxInterno(), cliente.id);
    expect(detalhe).toMatchObject({ id: cliente.id, razaoSocial: "Cliente agenda Ltda" });
    for (const campo of ["rg", "endereco", "cep"]) expect(detalhe).not.toHaveProperty(campo);
    const lista = await listarClientesContextuais(ctxInterno());
    for (const campo of ["rg", "endereco", "cep"]) expect(lista[0]).not.toHaveProperty(campo);
  });
});
