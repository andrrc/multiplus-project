/**
 * RF-039 / RN-009 / ADR-008 — desativação (soft delete) e a cascata por herança.
 *
 * Todas as leituras passam pela role `multiplus_app` com contexto de usuário setado, que é
 * exatamente o que a aplicação usa em runtime — então o que este arquivo testa é a política
 * de RLS de verdade, não a query da aplicação. É o retrofit de maior risco da sprint: um
 * `ativo` esquecido numa política não quebra nada visivelmente, só deixa vazar registro
 * desativado para quem não deveria enxergá-lo.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { ownerDb, appDb, comoUsuario, limparFixtures, fecharConexoes } from "./setup/helpers";
import { atualizarCliente } from "@/lib/clientes";
import { PESSOA_VAZIA } from "@/lib/heranca-pessoa";

type Fixture = Awaited<ReturnType<typeof montarFixture>>;

async function montarFixture() {
  const admin = await ownerDb.usuario.create({
    data: { nome: "Talita", email: "talita.softdelete@teste.local", perfil: "ADMIN" },
  });

  const cliente = await ownerDb.cliente.create({
    data: {
      tipo: "PESSOA_JURIDICA",
      razaoSocial: "Empreendimento Alfa",
      cnpj: "11222333000181",
      segmento: "Indústria",
      origemContato: "Indicação",
      responsavelLegal: { create: { nome: "Ana", telefone: "11999990000" } },
      pontoContato: { create: { nome: "Bruno", telefone: "11988880000" } },
    },
  });

  const pessoa = await ownerDb.pessoaEnvolvida.create({
    data: { clienteId: cliente.id, nome: "Carlos", email: "carlos@teste.local" },
  });

  const documento = await ownerDb.documento.create({
    data: { clienteId: cliente.id, nome: "Licença de Operação", link: "https://drive/lo" },
  });

  // Colaborador Interno com acesso legítimo ao cliente, via projeto atribuído: sem isso,
  // "não vê o cliente desativado" passaria por ele nunca ter visto o cliente.
  const projeto = await ownerDb.projeto.create({
    data: { clienteId: cliente.id, nome: "Licenciamento Alfa" },
  });

  // Tarefa e subtarefa existem aqui para o caso-limite da cascata alcançar a cadeia inteira
  // (cliente -> projeto -> tarefa -> subtarefa). Sem elas, o teste de "pai desativado com
  // filhos ativos" cobria só as filhas diretas do cliente — que é por que o vazamento das
  // políticas de projetos/tarefas/subtarefas passou pela Sprint 3 inteira.
  const tarefa = await ownerDb.tarefa.create({
    data: { projetoId: projeto.id, nome: "Protocolar EIA" },
  });
  const subtarefa = await ownerDb.subtarefa.create({
    data: { tarefaId: tarefa.id, titulo: "Anexar ART" },
  });

  const interno = await ownerDb.usuario.create({
    data: { nome: "Interno", email: "interno.softdelete@teste.local", perfil: "ADMIN_INTERNO" },
  });
  await ownerDb.atribuicao.create({
    data: { usuarioId: interno.id, entidadeTipo: "PROJETO", entidadeId: projeto.id },
  });

  const usuarioCliente = await ownerDb.usuario.create({
    data: {
      nome: "Cliente",
      email: "cliente.softdelete@teste.local",
      perfil: "CLIENTE",
      clienteId: cliente.id,
    },
  });

  return {
    ctxAdmin: { usuarioId: admin.id, perfil: "ADMIN" as const },
    ctxInterno: { usuarioId: interno.id, perfil: "ADMIN_INTERNO" as const },
    ctxCliente: { usuarioId: usuarioCliente.id, perfil: "CLIENTE" as const },
    clienteId: cliente.id,
    pessoaId: pessoa.id,
    documentoId: documento.id,
    projetoId: projeto.id,
    tarefaId: tarefa.id,
    subtarefaId: subtarefa.id,
  };
}

function desativar(clienteId: string) {
  return ownerDb.cliente.update({
    where: { id: clienteId },
    data: { ativo: false, desativadoEm: new Date(), desativadoPor: "qualquer" },
  });
}

let f: Fixture;

beforeEach(async () => {
  await limparFixtures();
  f = await montarFixture();
});

afterEach(async () => {
  await limparFixtures();
});

afterAll(async () => {
  await fecharConexoes();
});

describe("RN-009 — registro desativado sai das listagens", () => {
  it("cliente ativo é visível para o Colaborador Interno atribuído e para o Cliente", async () => {
    const paraInterno = await comoUsuario(f.ctxInterno, (tx) => tx.cliente.findMany());
    const paraCliente = await comoUsuario(f.ctxCliente, (tx) => tx.cliente.findMany());

    expect(paraInterno).toHaveLength(1);
    expect(paraCliente).toHaveLength(1);
  });

  it("cliente desativado desaparece para todos os perfis que não são Administrador", async () => {
    await desativar(f.clienteId);

    const paraInterno = await comoUsuario(f.ctxInterno, (tx) => tx.cliente.findMany());
    const paraCliente = await comoUsuario(f.ctxCliente, (tx) => tx.cliente.findMany());

    expect(paraInterno).toHaveLength(0);
    expect(paraCliente).toHaveLength(0);
  });

  it("o Administrador continua enxergando o desativado — é ele quem reativa", async () => {
    await desativar(f.clienteId);

    const todos = await comoUsuario(f.ctxAdmin, (tx) => tx.cliente.findMany());
    const soAtivos = await comoUsuario(f.ctxAdmin, (tx) =>
      tx.cliente.findMany({ where: { ativo: true } }),
    );

    expect(todos).toHaveLength(1);
    expect(soAtivos).toHaveLength(0);
  });

  it("reativar devolve o cliente ao estado anterior", async () => {
    await desativar(f.clienteId);
    await ownerDb.cliente.update({
      where: { id: f.clienteId },
      data: { ativo: true, desativadoEm: null, desativadoPor: null },
    });

    const paraInterno = await comoUsuario(f.ctxInterno, (tx) => tx.cliente.findMany());
    expect(paraInterno).toHaveLength(1);
  });
});

describe("ADR-008 — cascata por herança, sem marcar os filhos", () => {
  it("desativar o cliente torna pessoas e documentos inacessíveis sem marcá-los", async () => {
    await desativar(f.clienteId);

    const pessoas = await comoUsuario(f.ctxInterno, (tx) => tx.pessoaEnvolvida.findMany());
    const documentos = await comoUsuario(f.ctxInterno, (tx) => tx.documento.findMany());

    expect(pessoas).toHaveLength(0);
    expect(documentos).toHaveLength(0);

    // O ponto do ADR-008: os filhos continuam `ativo = true` no banco. É isso que faz a
    // reativação devolver o estado exato anterior em vez de ser destrutiva.
    const pessoaNoBanco = await ownerDb.pessoaEnvolvida.findUniqueOrThrow({
      where: { id: f.pessoaId },
    });
    const documentoNoBanco = await ownerDb.documento.findUniqueOrThrow({
      where: { id: f.documentoId },
    });
    expect(pessoaNoBanco.ativo).toBe(true);
    expect(documentoNoBanco.ativo).toBe(true);
  });

  it("caso-limite: pai desativado com filhos ativos não vaza nem um dos filhos", async () => {
    await desativar(f.clienteId);

    const responsavel = await comoUsuario(f.ctxInterno, (tx) =>
      tx.responsavelLegalSeguro.findMany(),
    );
    const ponto = await comoUsuario(f.ctxInterno, (tx) => tx.pontoContatoSeguro.findMany());

    expect(responsavel).toHaveLength(0);
    expect(ponto).toHaveLength(0);
  });

  it("a cascata alcança projeto, tarefa e subtarefa — não só as filhas diretas do cliente", async () => {
    // O Colaborador Interno está atribuído ao projeto, então antes de desativar ele vê tudo:
    // sem esta metade, "não vê depois" passaria por ele nunca ter visto.
    const antes = await comoUsuario(f.ctxInterno, async (tx) => ({
      clientes: await tx.cliente.findMany(),
      projetos: await tx.projeto.findMany(),
      tarefas: await tx.tarefa.findMany(),
      subtarefas: await tx.subtarefa.findMany(),
    }));

    expect(antes.clientes).toHaveLength(1);
    expect(antes.projetos).toHaveLength(1);
    expect(antes.tarefas).toHaveLength(1);
    expect(antes.subtarefas).toHaveLength(1);

    await desativar(f.clienteId);

    const depois = await comoUsuario(f.ctxInterno, async (tx) => ({
      clientes: await tx.cliente.findMany(),
      projetos: await tx.projeto.findMany(),
      tarefas: await tx.tarefa.findMany(),
      subtarefas: await tx.subtarefa.findMany(),
    }));

    expect(depois.clientes).toHaveLength(0);
    expect(depois.projetos).toHaveLength(0);
    expect(depois.tarefas).toHaveLength(0);
    expect(depois.subtarefas).toHaveLength(0);

    // ADR-008: nada foi marcado nos filhos — as três tabelas nem têm coluna `ativo` ainda
    // (Sprint 4), e continuam com as linhas intactas no banco.
    expect(await ownerDb.projeto.findUnique({ where: { id: f.projetoId } })).not.toBeNull();
    expect(await ownerDb.tarefa.findUnique({ where: { id: f.tarefaId } })).not.toBeNull();
    expect(await ownerDb.subtarefa.findUnique({ where: { id: f.subtarefaId } })).not.toBeNull();
  });

  it("reativar o cliente devolve projeto, tarefa e subtarefa", async () => {
    await desativar(f.clienteId);
    await ownerDb.cliente.update({
      where: { id: f.clienteId },
      data: { ativo: true, desativadoEm: null, desativadoPor: null },
    });

    const devolvidos = await comoUsuario(f.ctxInterno, async (tx) => ({
      projetos: await tx.projeto.findMany(),
      tarefas: await tx.tarefa.findMany(),
      subtarefas: await tx.subtarefa.findMany(),
    }));

    expect(devolvidos.projetos).toHaveLength(1);
    expect(devolvidos.tarefas).toHaveLength(1);
    expect(devolvidos.subtarefas).toHaveLength(1);
  });

  it("o Administrador continua enxergando projeto e tarefa de cliente desativado — é ele quem reativa", async () => {
    await desativar(f.clienteId);

    const paraAdmin = await comoUsuario(f.ctxAdmin, async (tx) => ({
      projetos: await tx.projeto.findMany(),
      tarefas: await tx.tarefa.findMany(),
      subtarefas: await tx.subtarefa.findMany(),
    }));

    expect(paraAdmin.projetos).toHaveLength(1);
    expect(paraAdmin.tarefas).toHaveLength(1);
    expect(paraAdmin.subtarefas).toHaveLength(1);
  });

  it("escrita em projeto, tarefa e subtarefa de cliente desativado é recusada, inclusive para o Administrador", async () => {
    await desativar(f.clienteId);

    // Mesmo comportamento que pessoas_envolvidas_write e documentos_write já tinham: o
    // registro desativado é somente leitura (RF-039), e nem o Administrador escreve nele.
    const projeto = await comoUsuario(f.ctxAdmin, (tx) =>
      tx.projeto.updateMany({ where: { id: f.projetoId }, data: { nome: "Renomeado" } }),
    );
    const tarefa = await comoUsuario(f.ctxAdmin, (tx) =>
      tx.tarefa.updateMany({ where: { id: f.tarefaId }, data: { nome: "Renomeada" } }),
    );
    const subtarefa = await comoUsuario(f.ctxAdmin, (tx) =>
      tx.subtarefa.updateMany({ where: { id: f.subtarefaId }, data: { status: "CONCLUIDO" } }),
    );

    expect(projeto.count).toBe(0);
    expect(tarefa.count).toBe(0);
    expect(subtarefa.count).toBe(0);

    await expect(
      comoUsuario(f.ctxAdmin, (tx) =>
        tx.tarefa.create({ data: { projetoId: f.projetoId, nome: "Nova" } }),
      ),
    ).rejects.toThrow();
  });

  it("cliente_do_projeto_esta_ativo e cliente_da_tarefa_esta_ativo devolvem false, nunca NULL", async () => {
    const [{ do_projeto, da_tarefa }] = await appDb.$queryRaw<
      { do_projeto: boolean; da_tarefa: boolean }[]
    >`
      SELECT cliente_do_projeto_esta_ativo('nao-existe') AS do_projeto,
             cliente_da_tarefa_esta_ativo('nao-existe')  AS da_tarefa
    `;

    expect(do_projeto).toBe(false);
    expect(da_tarefa).toBe(false);
  });

  it("filho desativado some mesmo com o pai ativo", async () => {
    await ownerDb.pessoaEnvolvida.update({
      where: { id: f.pessoaId },
      data: { ativo: false, desativadoEm: new Date() },
    });

    const pessoas = await comoUsuario(f.ctxInterno, (tx) => tx.pessoaEnvolvida.findMany());
    expect(pessoas).toHaveLength(0);

    const paraAdmin = await comoUsuario(f.ctxAdmin, (tx) => tx.pessoaEnvolvida.findMany());
    expect(paraAdmin).toHaveLength(1);
  });

  it("reativar o pai devolve os filhos sem nenhuma outra ação", async () => {
    await desativar(f.clienteId);
    await ownerDb.cliente.update({ where: { id: f.clienteId }, data: { ativo: true } });

    const pessoas = await comoUsuario(f.ctxInterno, (tx) => tx.pessoaEnvolvida.findMany());
    const documentos = await comoUsuario(f.ctxInterno, (tx) => tx.documento.findMany());

    expect(pessoas).toHaveLength(1);
    expect(documentos).toHaveLength(1);
  });
});

describe("RF-039 — registro desativado é somente leitura", () => {
  it("o banco recusa adicionar documento a cliente desativado, mesmo para o Administrador", async () => {
    await desativar(f.clienteId);

    await expect(
      comoUsuario(f.ctxAdmin, (tx) =>
        tx.documento.create({
          data: { clienteId: f.clienteId, nome: "Novo", link: "https://drive/novo" },
        }),
      ),
    ).rejects.toThrow();
  });

  it("o banco recusa editar pessoa envolvida de cliente desativado", async () => {
    await desativar(f.clienteId);

    const { count } = await comoUsuario(f.ctxAdmin, (tx) =>
      tx.pessoaEnvolvida.updateMany({
        where: { id: f.pessoaId },
        data: { nome: "Nome alterado" },
      }),
    );

    expect(count).toBe(0);
  });

  it("a aplicação recusa editar o cadastro de um cliente desativado", async () => {
    await desativar(f.clienteId);

    // Esta é a metade que a RLS não cobre, e é por isso que `exigirClienteAtivo` existe:
    // `clientes_write` precisa aceitar UPDATE em cliente desativado, senão não haveria como
    // reativá-lo. Sem a guarda da aplicação, editar razão social, segmento ou endereço de um
    // cliente desativado passaria direto (ADR-008).
    await expect(
      atualizarCliente(f.ctxAdmin, f.clienteId, {
        tipo: "PESSOA_JURIDICA",
        razaoSocial: "Nome Alterado À Força",
        segmento: "Indústria",
        origemContato: "Indicação",
        responsavelLegal: { ...PESSOA_VAZIA, nome: "Ana", telefone: "11999990000" },
        pontoContato: { ...PESSOA_VAZIA, nome: "Bruno", telefone: "11988880000" },
      }),
    ).rejects.toThrow(/desativado/i);

    const cliente = await ownerDb.cliente.findUniqueOrThrow({ where: { id: f.clienteId } });
    expect(cliente.razaoSocial).toBe("Empreendimento Alfa");
  });

  it("mas o Administrador continua podendo reativar o cliente", async () => {
    await desativar(f.clienteId);

    const { count } = await comoUsuario(f.ctxAdmin, (tx) =>
      tx.cliente.updateMany({ where: { id: f.clienteId }, data: { ativo: true } }),
    );

    expect(count).toBe(1);
  });
});

describe("RN-007 — só o Administrador desativa", () => {
  it("Colaborador Interno não consegue desativar um cliente que enxerga", async () => {
    const { count } = await comoUsuario(f.ctxInterno, (tx) =>
      tx.cliente.updateMany({ where: { id: f.clienteId }, data: { ativo: false } }),
    );

    expect(count).toBe(0);

    const cliente = await ownerDb.cliente.findUniqueOrThrow({ where: { id: f.clienteId } });
    expect(cliente.ativo).toBe(true);
  });

  it("Cliente não consegue desativar o próprio cadastro", async () => {
    const { count } = await comoUsuario(f.ctxCliente, (tx) =>
      tx.cliente.updateMany({ where: { id: f.clienteId }, data: { ativo: false } }),
    );

    expect(count).toBe(0);
  });
});

describe("cliente_esta_ativo — a função que sustenta a cascata", () => {
  it("devolve false (nunca NULL) para cliente inexistente", async () => {
    // O NULL aqui seria a repetição do bug de RN-004: numa comparação, NULL não se comporta
    // como false, e a condição que deveria bloquear passaria batido.
    const resultado = await appDb.$queryRaw<
      { ativo: boolean | null }[]
    >`SELECT cliente_esta_ativo('id-que-nao-existe') AS ativo`;

    expect(resultado[0]?.ativo).toBe(false);
  });
});
