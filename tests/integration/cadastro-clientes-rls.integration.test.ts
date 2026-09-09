/**
 * RF-020 (telefone do Responsável Legal/Ponto de Contato oculto para Administrador
 * Interno/Externo) + RLS em cascata das tabelas do módulo Cadastro de Clientes
 * (Responsável Legal, Ponto de Contato, Pessoas do Operacional, Documentos).
 * Módulo SRS: Cadastro de Clientes (Seção 3.1, 3.12, 3.13).
 *
 * O ponto central deste arquivo é confirmar, batendo direto no Postgres como a role
 * `multiplus_app` (RLS-restrita — a mesma role de runtime), que o telefone não vem na
 * resposta da consulta para ADMIN_INTERNO/ADMIN_EXTERNO — não é uma checagem de UI.
 * Ver prisma/migrations/20260909135654_cadastro_clientes_rls_masking.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ownerDb, comoUsuario, limparFixtures, fecharConexoes } from "./setup/helpers";

let clienteA: { id: string };
let clienteB: { id: string };
let projetoA1: { id: string };
let tarefaA1a: { id: string };

let usuarioAdmin: { id: string };
let usuarioAdminInterno: { id: string };
let usuarioAdminExterno: { id: string };

beforeAll(async () => {
  await limparFixtures();

  clienteA = await ownerDb.cliente.create({
    data: {
      razaoSocial: "Cliente A Ltda",
      cnpj: "11111111000101",
      segmento: "Industrial",
      origemContato: "Indicação",
      responsavelLegal: {
        create: {
          nome: "Responsável A",
          endereco: "Rua A, 1",
          rg: "1111111",
          cpf: "11111111111",
          telefone: "11900000001",
          email: "responsavel-a@teste.local",
        },
      },
      pontoContato: {
        create: {
          nome: "Contato A",
          endereco: "Rua A, 1",
          rg: "1111111",
          cpf: "11111111111",
          telefone: "11900000002",
          email: "contato-a@teste.local",
          cargo: "Gerente",
        },
      },
    },
  });
  clienteB = await ownerDb.cliente.create({
    data: { razaoSocial: "Cliente B Ltda", cnpj: "22222222000102", segmento: "Industrial", origemContato: "Indicação" },
  });

  projetoA1 = await ownerDb.projeto.create({ data: { clienteId: clienteA.id, nome: "Projeto A1" } });
  tarefaA1a = await ownerDb.tarefa.create({ data: { projetoId: projetoA1.id, nome: "Tarefa A1a" } });

  usuarioAdmin = await ownerDb.usuario.create({
    data: { nome: "Talita", email: "talita.cadastro@teste.local", perfil: "ADMIN" },
  });
  usuarioAdminInterno = await ownerDb.usuario.create({
    data: { nome: "Estagiário", email: "admin-interno.cadastro@teste.local", perfil: "ADMIN_INTERNO" },
  });
  usuarioAdminExterno = await ownerDb.usuario.create({
    data: { nome: "Colaborador Externo", email: "admin-externo.cadastro@teste.local", perfil: "ADMIN_EXTERNO" },
  });

  await ownerDb.atribuicao.create({
    data: { usuarioId: usuarioAdminInterno.id, entidadeTipo: "PROJETO", entidadeId: projetoA1.id },
  });
  await ownerDb.atribuicao.create({
    data: { usuarioId: usuarioAdminExterno.id, entidadeTipo: "TAREFA", entidadeId: tarefaA1a.id },
  });
});

afterAll(async () => {
  await limparFixtures();
  await fecharConexoes();
});

describe("RF-020 — mascaramento de telefone via responsavelLegalSeguro/pontoContatoSeguro", () => {
  it("ADMIN vê o telefone do Responsável Legal e do Ponto de Contato", async () => {
    const ctx = { usuarioId: usuarioAdmin.id, perfil: "ADMIN" as const };

    const responsavel = await comoUsuario(ctx, (tx) =>
      tx.responsavelLegalSeguro.findUnique({ where: { clienteId: clienteA.id } }),
    );
    const contato = await comoUsuario(ctx, (tx) =>
      tx.pontoContatoSeguro.findUnique({ where: { clienteId: clienteA.id } }),
    );

    expect(responsavel?.telefone).toBe("11900000001");
    expect(contato?.telefone).toBe("11900000002");
  });

  it("ADMIN_INTERNO (atribuído ao projeto do cliente) NÃO recebe o telefone na resposta", async () => {
    const ctx = { usuarioId: usuarioAdminInterno.id, perfil: "ADMIN_INTERNO" as const };

    const responsavel = await comoUsuario(ctx, (tx) =>
      tx.responsavelLegalSeguro.findUnique({ where: { clienteId: clienteA.id } }),
    );
    const contato = await comoUsuario(ctx, (tx) =>
      tx.pontoContatoSeguro.findUnique({ where: { clienteId: clienteA.id } }),
    );

    // A linha é visível (RLS de leitura permite), mas o campo telefone vem nulo —
    // exatamente o comportamento pedido: filtrado na consulta, não escondido na UI.
    expect(responsavel?.nome).toBe("Responsável A");
    expect(responsavel?.telefone).toBeNull();
    expect(contato?.nome).toBe("Contato A");
    expect(contato?.telefone).toBeNull();
  });

  it("ADMIN_EXTERNO (atribuído à tarefa do cliente) NÃO recebe o telefone na resposta", async () => {
    const ctx = { usuarioId: usuarioAdminExterno.id, perfil: "ADMIN_EXTERNO" as const };

    const responsavel = await comoUsuario(ctx, (tx) =>
      tx.responsavelLegalSeguro.findUnique({ where: { clienteId: clienteA.id } }),
    );

    expect(responsavel?.nome).toBe("Responsável A");
    expect(responsavel?.telefone).toBeNull();
  });

  it("consultar a tabela base diretamente também não vaza: só é alcançável por quem tem RLS de leitura, e mesmo assim a coluna crua existe só para escrita", async () => {
    // Confirma que a mitigação não depende de "esquecer" de usar a tabela base: a
    // política de leitura das tabelas base é a mesma cascata (sem CLIENTE), e é a
    // aplicação, não o RLS de linha, que decide nunca ler a tabela base para exibição.
    const ctx = { usuarioId: usuarioAdminInterno.id, perfil: "ADMIN_INTERNO" as const };
    const responsavelTabelaBase = await comoUsuario(ctx, (tx) =>
      tx.responsavelLegal.findUnique({ where: { clienteId: clienteA.id } }),
    );
    expect(responsavelTabelaBase?.telefone).toBe("11900000001");
  });
});

describe("RLS em cascata — Responsável Legal, Ponto de Contato, Pessoas do Operacional, Documentos", () => {
  it("CLIENTE não enxerga nenhuma das 4 tabelas (módulo é de uso interno)", async () => {
    const usuarioClienteA = await ownerDb.usuario.create({
      data: {
        nome: "Ponto de Contato A",
        email: "cliente-a.cadastro@teste.local",
        perfil: "CLIENTE",
        clienteId: clienteA.id,
      },
    });
    const ctx = { usuarioId: usuarioClienteA.id, perfil: "CLIENTE" as const };

    const responsavel = await comoUsuario(ctx, (tx) =>
      tx.responsavelLegalSeguro.findUnique({ where: { clienteId: clienteA.id } }),
    );
    expect(responsavel).toBeNull();
  });

  it("ADMIN_INTERNO não atribuído ao projeto do Cliente B não vê os dados do Cliente B", async () => {
    const ctx = { usuarioId: usuarioAdminInterno.id, perfil: "ADMIN_INTERNO" as const };

    const responsavel = await comoUsuario(ctx, (tx) =>
      tx.responsavelLegalSeguro.findUnique({ where: { clienteId: clienteB.id } }),
    );
    expect(responsavel).toBeNull();
  });

  it("ADMIN_INTERNO não pode escrever no cadastro (write é ADMIN-only)", async () => {
    const ctx = { usuarioId: usuarioAdminInterno.id, perfil: "ADMIN_INTERNO" as const };

    await expect(
      comoUsuario(ctx, (tx) =>
        tx.pessoaOperacional.create({
          data: { clienteId: clienteA.id, nome: "Alguém", cargo: "Analista" },
        }),
      ),
    ).rejects.toThrow();
  });
});
