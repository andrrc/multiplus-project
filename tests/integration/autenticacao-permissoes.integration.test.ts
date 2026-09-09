/**
 * RNF-001 (isolamento por cliente), RF-018 (Administrador Interno — escopo
 * por projeto), RF-019 (Administrador Externo — escopo por tarefa).
 * Módulo SRS: Autenticação / Permissões (Seção 3.9).
 *
 * Roda contra o Postgres de verdade, autenticado como a role `multiplus_app`
 * (RLS-restrita) — não a role dona das tabelas. Ver
 * docs/architecture-multiplus-software.md Seção 3.2 e ADR-004, e
 * prisma/migrations/*_rls_policies/migration.sql.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ownerDb, comoUsuario, limparFixtures, fecharConexoes } from "./setup/helpers";

let clienteA: { id: string };
let clienteB: { id: string };
let projetoA1: { id: string };
let projetoA2: { id: string };
let projetoB1: { id: string };
let tarefaA1a: { id: string };
let tarefaA1b: { id: string };
let tarefaA2a: { id: string };

let usuarioAdmin: { id: string };
let usuarioClienteA: { id: string };
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
    },
  });
  clienteB = await ownerDb.cliente.create({
    data: {
      razaoSocial: "Cliente B Ltda",
      cnpj: "22222222000102",
      segmento: "Industrial",
      origemContato: "Indicação",
    },
  });

  projetoA1 = await ownerDb.projeto.create({
    data: { clienteId: clienteA.id, nome: "Projeto A1" },
  });
  projetoA2 = await ownerDb.projeto.create({
    data: { clienteId: clienteA.id, nome: "Projeto A2" },
  });
  projetoB1 = await ownerDb.projeto.create({
    data: { clienteId: clienteB.id, nome: "Projeto B1" },
  });

  tarefaA1a = await ownerDb.tarefa.create({
    data: { projetoId: projetoA1.id, nome: "Tarefa A1a" },
  });
  tarefaA1b = await ownerDb.tarefa.create({
    data: { projetoId: projetoA1.id, nome: "Tarefa A1b" },
  });
  tarefaA2a = await ownerDb.tarefa.create({
    data: { projetoId: projetoA2.id, nome: "Tarefa A2a" },
  });

  usuarioAdmin = await ownerDb.usuario.create({
    data: { nome: "Talita", email: "talita.rls@teste.local", perfil: "ADMIN" },
  });
  usuarioClienteA = await ownerDb.usuario.create({
    data: {
      nome: "Ponto de Contato A",
      email: "cliente-a.rls@teste.local",
      perfil: "CLIENTE",
      clienteId: clienteA.id,
    },
  });
  usuarioAdminInterno = await ownerDb.usuario.create({
    data: { nome: "Estagiário", email: "admin-interno.rls@teste.local", perfil: "ADMIN_INTERNO" },
  });
  usuarioAdminExterno = await ownerDb.usuario.create({
    data: { nome: "Colaborador Externo", email: "admin-externo.rls@teste.local", perfil: "ADMIN_EXTERNO" },
  });

  // ADMIN_INTERNO atribuído só ao projetoA1 (RF-018) — projetoA2 fica de fora de propósito.
  await ownerDb.atribuicao.create({
    data: { usuarioId: usuarioAdminInterno.id, entidadeTipo: "PROJETO", entidadeId: projetoA1.id },
  });

  // ADMIN_EXTERNO atribuído só à tarefaA1a (RF-019) — tarefaA1b (mesmo projeto) fica de fora.
  await ownerDb.atribuicao.create({
    data: { usuarioId: usuarioAdminExterno.id, entidadeTipo: "TAREFA", entidadeId: tarefaA1a.id },
  });
});

afterAll(async () => {
  await limparFixtures();
  await fecharConexoes();
});

describe("ADMIN — acesso total (RF-015)", () => {
  it("vê clientes, projetos e tarefas de todos os clientes", async () => {
    const ctx = { usuarioId: usuarioAdmin.id, perfil: "ADMIN" as const };

    const clientes = await comoUsuario(ctx, (tx) =>
      tx.cliente.findMany({ where: { id: { in: [clienteA.id, clienteB.id] } } }),
    );
    expect(clientes.map((c) => c.id).sort()).toEqual([clienteA.id, clienteB.id].sort());

    const projetos = await comoUsuario(ctx, (tx) =>
      tx.projeto.findMany({ where: { id: { in: [projetoA1.id, projetoA2.id, projetoB1.id] } } }),
    );
    expect(projetos).toHaveLength(3);

    const tarefas = await comoUsuario(ctx, (tx) =>
      tx.tarefa.findMany({ where: { id: { in: [tarefaA1a.id, tarefaA1b.id, tarefaA2a.id] } } }),
    );
    expect(tarefas).toHaveLength(3);
  });
});

describe("CLIENTE — só os próprios projetos (RNF-001)", () => {
  const ctx = () => ({ usuarioId: usuarioClienteA.id, perfil: "CLIENTE" as const });

  it("vê o próprio cliente, mas não outro cliente", async () => {
    const proprio = await comoUsuario(ctx(), (tx) => tx.cliente.findUnique({ where: { id: clienteA.id } }));
    expect(proprio?.id).toBe(clienteA.id);

    const outro = await comoUsuario(ctx(), (tx) => tx.cliente.findUnique({ where: { id: clienteB.id } }));
    expect(outro).toBeNull();
  });

  it("vê os próprios projetos, mas não o projeto de outro cliente", async () => {
    const proprios = await comoUsuario(ctx(), (tx) =>
      tx.projeto.findMany({ where: { id: { in: [projetoA1.id, projetoA2.id] } } }),
    );
    expect(proprios.map((p) => p.id).sort()).toEqual([projetoA1.id, projetoA2.id].sort());

    const deOutroCliente = await comoUsuario(ctx(), (tx) =>
      tx.projeto.findUnique({ where: { id: projetoB1.id } }),
    );
    expect(deOutroCliente).toBeNull();

    const todos = await comoUsuario(ctx(), (tx) => tx.projeto.findMany());
    expect(todos.some((p) => p.id === projetoB1.id)).toBe(false);
  });
});

describe("ADMIN_INTERNO — só o(s) projeto(s) atribuído(s) (RF-018)", () => {
  const ctx = () => ({ usuarioId: usuarioAdminInterno.id, perfil: "ADMIN_INTERNO" as const });

  it("vê o projeto atribuído, mas o projeto não atribuído (mesmo cliente) fica invisível", async () => {
    const atribuido = await comoUsuario(ctx(), (tx) => tx.projeto.findUnique({ where: { id: projetoA1.id } }));
    expect(atribuido?.id).toBe(projetoA1.id);

    const naoAtribuido = await comoUsuario(ctx(), (tx) =>
      tx.projeto.findUnique({ where: { id: projetoA2.id } }),
    );
    expect(naoAtribuido).toBeNull();
  });

  it("vê todas as tarefas do projeto atribuído, mas nenhuma de outro projeto", async () => {
    const tarefasDoProjeto = await comoUsuario(ctx(), (tx) =>
      tx.tarefa.findMany({ where: { id: { in: [tarefaA1a.id, tarefaA1b.id] } } }),
    );
    expect(tarefasDoProjeto.map((t) => t.id).sort()).toEqual([tarefaA1a.id, tarefaA1b.id].sort());

    const tarefaDeOutroProjeto = await comoUsuario(ctx(), (tx) =>
      tx.tarefa.findUnique({ where: { id: tarefaA2a.id } }),
    );
    expect(tarefaDeOutroProjeto).toBeNull();
  });
});

describe("ADMIN_EXTERNO — só a(s) tarefa(s) atribuída(s), não o projeto inteiro (RF-019)", () => {
  const ctx = () => ({ usuarioId: usuarioAdminExterno.id, perfil: "ADMIN_EXTERNO" as const });

  it("vê a tarefa atribuída, mas não outra tarefa do mesmo projeto", async () => {
    const atribuida = await comoUsuario(ctx(), (tx) => tx.tarefa.findUnique({ where: { id: tarefaA1a.id } }));
    expect(atribuida?.id).toBe(tarefaA1a.id);

    const naoAtribuida = await comoUsuario(ctx(), (tx) => tx.tarefa.findUnique({ where: { id: tarefaA1b.id } }));
    expect(naoAtribuida).toBeNull();
  });

  it("não vê tarefas de um projeto ao qual não tem nenhuma tarefa atribuída", async () => {
    const deOutroProjeto = await comoUsuario(ctx(), (tx) => tx.tarefa.findUnique({ where: { id: tarefaA2a.id } }));
    expect(deOutroProjeto).toBeNull();
  });
});
