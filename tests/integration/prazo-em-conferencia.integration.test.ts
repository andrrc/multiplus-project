/**
 * Etapa 2 dos comprovantes, contra o Postgres de verdade e pela role restrita pelo RLS: o prazo para de contar enquanto um
 * envio com comprovante aguarda conferência, em cliente com atraso, listas, agenda e aviso de prazo. A pausa é derivada do
 * pedido (nada novo no banco): pedido PENDENTE com arquivo. Pedido sem arquivo, devolvido ou retirado continua contando.
 * Análise aprovada: docs/analises/comprovantes-etapa2-prazo.md.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/email", async (importOriginal) => {
  const modulo = await importOriginal<typeof import("@/lib/email")>();
  return { ...modulo, enviarEmail: vi.fn(async () => {}) };
});

import { listarClientes, listarClientesContextuais } from "@/lib/clientes";
import { dispararPrazoProximo } from "@/lib/notificacoes";
import { comContextoDeUsuario } from "@/lib/prisma-app";
import {
  cancelarSolicitacaoConclusao,
  contarAtrasadosAnterioresAgenda,
  contarAtrasadosAnterioresColaborador,
  decidirSolicitacaoConclusao,
  listarItensAgenda,
  listarItensAgendaColaborador,
  listarPrazos,
  listarSubtarefasAtribuidas,
  listarSubtarefasPrazos,
  listarTarefasAtribuidas,
} from "@/lib/projetos-tarefas";
import { fecharConexoes, limparFixtures, ownerDb } from "./setup/helpers";

const VENCIDO = new Date("2000-01-10T00:00:00.000Z");
const FUTURO = new Date("2999-01-01T00:00:00.000Z");

let admin: { id: string };
let interno: { id: string };
let externo: { id: string };
let clienteUsuario: { id: string };

let clienteConferencia: { id: string };
let clienteDevolvido: { id: string };
let clienteSemArquivo: { id: string };
let projetoConferencia: { id: string };
let tarefaConferencia: { id: string };
let tarefaSemArquivo: { id: string };
let tarefaDevolvida: { id: string };
let tarefaRetirada: { id: string };
let tarefaNormal: { id: string };
let tarefaMae: { id: string };
let subtarefaConferencia: { id: string };
let pedidoConferencia: { id: string };

const ctxAdmin = () => ({ usuarioId: admin.id, perfil: "ADMIN" as const });
const ctxInterno = () => ({ usuarioId: interno.id, perfil: "ADMIN_INTERNO" as const });
const ctxExterno = () => ({ usuarioId: externo.id, perfil: "ADMIN_EXTERNO" as const });
const ctxCliente = () => ({ usuarioId: clienteUsuario.id, perfil: "CLIENTE" as const });

async function novoCliente(nome: string, cnpj: string) {
  return ownerDb.cliente.create({ data: { razaoSocial: nome, cnpj, segmento: "Indústria", origemContato: "Indicação" } });
}

/** O colaborador envia o pedido de conclusão com `arquivos` comprovantes (0 = pedido de item que não exige comprovante). */
async function enviarPedido(alvo: { tarefaId?: string; subtarefaId?: string }, arquivos: number) {
  const criado = await ownerDb.solicitacaoConclusao.create({
    data: { ...alvo, solicitadoPorId: externo.id, solicitadoPorNome: "Externo prazo", statusAnterior: "EM_ANDAMENTO" },
  });
  for (let i = 0; i < arquivos; i += 1) {
    await ownerDb.arquivoComprovante.create({
      data: { ...alvo, solicitacaoId: criado.id, chave: `comprovantes/${criado.id}/${i}.jpg`, nomeOriginal: `foto-${i}.jpg`, tipo: "image/jpeg", tamanhoBytes: 1000, enviadoPorId: externo.id, enviadoPorNome: "Externo prazo" },
    });
  }
  return criado;
}

/** A administração devolve o envio com motivo: o pedido vira REJEITADA e o item volta a contar prazo. */
const devolver = (pedidoId: string) => decidirSolicitacaoConclusao(ctxAdmin(), pedidoId, false, "Refaça a foto");

beforeAll(async () => {
  await limparFixtures();
  admin = await ownerDb.usuario.create({ data: { nome: "Talita prazo", email: "talita.prazo@teste.local", perfil: "ADMIN" } });
  interno = await ownerDb.usuario.create({ data: { nome: "Interno prazo", email: "interno.prazo@teste.local", perfil: "ADMIN_INTERNO" } });
  externo = await ownerDb.usuario.create({ data: { nome: "Externo prazo", email: "externo.prazo@teste.local", perfil: "ADMIN_EXTERNO" } });

  clienteConferencia = await novoCliente("Conferência Ltda", "20000000000101");
  clienteDevolvido = await novoCliente("Devolvido Ltda", "20000000000102");
  clienteSemArquivo = await novoCliente("Sem Arquivo Ltda", "20000000000103");
  clienteUsuario = await ownerDb.usuario.create({ data: { nome: "Cliente prazo", email: "cliente.prazo@teste.local", perfil: "CLIENTE", clienteId: clienteConferencia.id } });

  projetoConferencia = await ownerDb.projeto.create({ data: { clienteId: clienteConferencia.id, nome: "P conferência" } });
  const projetoDevolvido = await ownerDb.projeto.create({ data: { clienteId: clienteDevolvido.id, nome: "P devolvido" } });
  const projetoSemArquivo = await ownerDb.projeto.create({ data: { clienteId: clienteSemArquivo.id, nome: "P sem arquivo" } });

  // O interno é atribuído ao projeto da conferência; o externo é atribuído às tarefas dele.
  await ownerDb.atribuicao.create({ data: { usuarioId: interno.id, entidadeTipo: "PROJETO", entidadeId: projetoConferencia.id } });

  tarefaConferencia = await ownerDb.tarefa.create({ data: { projetoId: projetoConferencia.id, nome: "Em conferência", prazo: VENCIDO, status: "EM_ANDAMENTO", comprovanteExigido: true, comprovanteQuantidade: 1, responsavelUsuarioId: externo.id } });
  tarefaNormal = await ownerDb.tarefa.create({ data: { projetoId: projetoConferencia.id, nome: "Atrasada normal", prazo: VENCIDO, status: "EM_ANDAMENTO", responsavelUsuarioId: externo.id } });
  tarefaDevolvida = await ownerDb.tarefa.create({ data: { projetoId: projetoDevolvido.id, nome: "Devolvida", prazo: VENCIDO, status: "EM_ANDAMENTO", comprovanteExigido: true, comprovanteQuantidade: 1, responsavelUsuarioId: externo.id } });
  tarefaSemArquivo = await ownerDb.tarefa.create({ data: { projetoId: projetoSemArquivo.id, nome: "Pedido sem arquivo", prazo: VENCIDO, status: "EM_ANDAMENTO", responsavelUsuarioId: externo.id } });
  tarefaRetirada = await ownerDb.tarefa.create({ data: { projetoId: projetoDevolvido.id, nome: "Retirada", prazo: FUTURO, status: "EM_ANDAMENTO", comprovanteExigido: true, comprovanteQuantidade: 1, responsavelUsuarioId: externo.id } });
  tarefaMae = await ownerDb.tarefa.create({ data: { projetoId: projetoConferencia.id, nome: "Tarefa-mãe vencida", prazo: VENCIDO, status: "EM_ANDAMENTO", responsavelUsuarioId: externo.id } });
  subtarefaConferencia = await ownerDb.subtarefa.create({ data: { tarefaId: tarefaMae.id, titulo: "Subtarefa em conferência", prazo: VENCIDO, comprovanteExigido: true, comprovanteQuantidade: 1, atribuidoAUsuarioId: externo.id } });
  for (const tarefa of [tarefaConferencia, tarefaNormal, tarefaDevolvida, tarefaSemArquivo, tarefaRetirada, tarefaMae]) {
    await ownerDb.atribuicao.create({ data: { usuarioId: externo.id, entidadeTipo: "TAREFA", entidadeId: tarefa.id } });
  }

  pedidoConferencia = await enviarPedido({ tarefaId: tarefaConferencia.id }, 2);
  await enviarPedido({ tarefaId: tarefaSemArquivo.id }, 0);
  await devolver((await enviarPedido({ tarefaId: tarefaDevolvida.id }, 1)).id);
  await cancelarSolicitacaoConclusao(ctxAdmin(), (await enviarPedido({ tarefaId: tarefaRetirada.id }, 1)).id);
  await enviarPedido({ subtarefaId: subtarefaConferencia.id }, 1);
});

afterAll(async () => {
  await limparFixtures();
  await fecharConexoes();
});

describe("listas da administração", () => {
  it("só o item com pedido pendente com arquivo fica em conferência; sem arquivo, devolvido e retirado continuam contando", async () => {
    const tarefas = await listarPrazos(ctxAdmin(), { pendentes: true });
    const por = Object.fromEntries(tarefas.map((t) => [t.nome, t.emConferenciaDesde]));
    expect(por["Em conferência"]).toBeInstanceOf(Date);
    expect(por["Pedido sem arquivo"]).toBeNull();
    expect(por["Devolvida"]).toBeNull();
    expect(por["Retirada"]).toBeNull();
    expect(por["Atrasada normal"]).toBeNull();
  });

  it("o instante do envio é o do banco (solicitadoEm do pedido)", async () => {
    const tarefas = await listarPrazos(ctxAdmin(), { pendentes: true });
    const noBanco = await ownerDb.solicitacaoConclusao.findUniqueOrThrow({ where: { id: pedidoConferencia.id }, select: { solicitadoEm: true } });
    expect(tarefas.find((t) => t.nome === "Em conferência")?.emConferenciaDesde?.getTime()).toBe(noBanco.solicitadoEm.getTime());
  });

  it("a pausa vale só para o item que recebeu o pedido: a subtarefa pausa, a tarefa-mãe continua contando", async () => {
    const subtarefas = await listarSubtarefasPrazos(ctxAdmin(), { pendentes: true });
    expect(subtarefas.find((s) => s.titulo === "Subtarefa em conferência")?.emConferenciaDesde).toBeInstanceOf(Date);
    const tarefas = await listarPrazos(ctxAdmin(), { pendentes: true });
    expect(tarefas.find((t) => t.nome === "Tarefa-mãe vencida")?.emConferenciaDesde).toBeNull();
  });
});

describe("cliente com atraso", () => {
  it("devolvido e pedido sem arquivo continuam com atraso", async () => {
    const lista = await listarClientes(ctxAdmin());
    const por = Object.fromEntries(lista.map((c) => [c.razaoSocial, c.emAtraso]));
    expect(por["Devolvido Ltda"]).toBe(true);
    expect(por["Sem Arquivo Ltda"]).toBe(true);
  });

  it("o único item vencido em conferência não gera atraso (administração e interno), e a devolução faz o atraso voltar", async () => {
    const cliente = await novoCliente("Só Conferência Ltda", "20000000000104");
    const projeto = await ownerDb.projeto.create({ data: { clienteId: cliente.id, nome: "P só conferência" } });
    await ownerDb.atribuicao.create({ data: { usuarioId: interno.id, entidadeTipo: "PROJETO", entidadeId: projeto.id } });
    const tarefa = await ownerDb.tarefa.create({ data: { projetoId: projeto.id, nome: "Única vencida", prazo: VENCIDO, status: "EM_ANDAMENTO", comprovanteExigido: true, comprovanteQuantidade: 1 } });
    try {
      const envio = await enviarPedido({ tarefaId: tarefa.id }, 1);
      const emAtraso = async () => ({
        admin: Object.fromEntries((await listarClientes(ctxAdmin())).map((c) => [c.razaoSocial, c.emAtraso]))["Só Conferência Ltda"],
        interno: Object.fromEntries((await listarClientesContextuais(ctxInterno())).map((c) => [c.razaoSocial, c.emAtraso]))["Só Conferência Ltda"],
      });

      expect(await emAtraso()).toEqual({ admin: false, interno: false });
      // Devolução: o pedido deixa de ser pendente e o prazo volta a contar, com a mesma data.
      await devolver(envio.id);
      expect(await emAtraso()).toEqual({ admin: true, interno: true });
    } finally {
      await ownerDb.tarefa.delete({ where: { id: tarefa.id } });
      await ownerDb.atribuicao.deleteMany({ where: { entidadeId: projeto.id } });
      await ownerDb.projeto.delete({ where: { id: projeto.id } });
      await ownerDb.cliente.delete({ where: { id: cliente.id } });
    }
  });
});

describe("visão do colaborador", () => {
  it("o externo dono vê a pausa nos próprios itens", async () => {
    const tarefas = await listarTarefasAtribuidas(ctxExterno());
    const por = Object.fromEntries(tarefas.map((t) => [t.nome, t.emConferenciaDesde]));
    expect(por["Em conferência"]).toBeInstanceOf(Date);
    expect(por["Atrasada normal"]).toBeNull();
    expect(por["Pedido sem arquivo"]).toBeNull();
    expect(por["Devolvida"]).toBeNull();
  });

  it("o interno responsável pela subtarefa vê o instante do envio dela", async () => {
    const dele = await ownerDb.subtarefa.create({ data: { tarefaId: tarefaMae.id, titulo: "Subtarefa do interno", prazo: VENCIDO, comprovanteExigido: true, comprovanteQuantidade: 1, atribuidoAUsuarioId: interno.id } });
    const comArquivo = await enviarPedido({ subtarefaId: dele.id }, 1);
    try {
      const lista = await listarSubtarefasAtribuidas(ctxInterno());
      expect(lista.find((s) => s.titulo === "Subtarefa do interno")?.emConferenciaDesde).toBeInstanceOf(Date);
    } finally {
      await ownerDb.solicitacaoConclusao.delete({ where: { id: comArquivo.id } });
      await ownerDb.subtarefa.delete({ where: { id: dele.id } });
    }
  });
});

describe("agenda", () => {
  const inicio = new Date("2000-01-01T00:00:00.000Z");
  const fim = new Date("2000-01-31T00:00:00.000Z");

  it("a administração recebe o item da agenda com o instante do envio", async () => {
    const itens = await listarItensAgenda(ctxAdmin(), inicio, fim);
    expect(itens.find((i) => i.nome === "Em conferência")?.emConferenciaDesde).toBeInstanceOf(Date);
    expect(itens.find((i) => i.nome === "Atrasada normal")?.emConferenciaDesde ?? null).toBeNull();
  });

  it("a agenda do interno do projeto também", async () => {
    const itens = await listarItensAgendaColaborador(ctxInterno(), inicio, fim);
    expect(itens.find((i) => i.nome === "Em conferência")?.emConferenciaDesde).toBeInstanceOf(Date);
  });

  it("a faixa de atrasados de meses anteriores não conta o item em conferência (administração e interno)", async () => {
    const mes = new Date("2026-11-01T00:00:00.000Z");
    // Vencidas em 2000 e abertas: atrasada normal, pedido sem arquivo, devolvida e tarefa-mãe. A em conferência fica de fora.
    expect(await contarAtrasadosAnterioresAgenda(ctxAdmin(), mes)).toBe(4);
    // O interno alcança só o projeto dele: atrasada normal e tarefa-mãe contam; a em conferência não.
    expect(await contarAtrasadosAnterioresColaborador(ctxInterno(), mes)).toBe(2);
  });
});

describe("RLS: nada de dado novo para o cliente", () => {
  it("o CLIENTE continua sem ler pedidos de conclusão e arquivos de comprovante", async () => {
    const [pedidos, arquivos] = await comContextoDeUsuario(ctxCliente(), async (tx) => [
      await tx.solicitacaoConclusao.count(),
      await tx.arquivoComprovante.count(),
    ]);
    expect(pedidos).toBe(0);
    expect(arquivos).toBe(0);
  });
});

describe("aviso de prazo próximo", () => {
  const hoje = new Date("2026-10-01T12:00:00.000Z");
  const prazoProximo = new Date("2026-10-03T00:00:00.000Z");

  beforeEach(async () => {
    await ownerDb.registroEnvioPrazo.deleteMany();
    await ownerDb.notificacao.deleteMany();
  });

  afterEach(async () => {
    await ownerDb.tarefa.deleteMany({ where: { nome: { startsWith: "Prazo próximo" } } });
  });

  it("o item em conferência não gera aviso; o mesmo item volta a gerar depois da devolução", async () => {
    const emConferencia = await ownerDb.tarefa.create({ data: { projetoId: projetoConferencia.id, nome: "Prazo próximo em conferência", prazo: prazoProximo, status: "EM_ANDAMENTO", comprovanteExigido: true, comprovanteQuantidade: 1, responsavelUsuarioId: admin.id } });
    const normal = await ownerDb.tarefa.create({ data: { projetoId: projetoConferencia.id, nome: "Prazo próximo normal", prazo: prazoProximo, status: "EM_ANDAMENTO", responsavelUsuarioId: admin.id } });
    const envio = await enviarPedido({ tarefaId: emConferencia.id }, 1);

    const primeira = await dispararPrazoProximo(7, hoje);
    const avisados = async () => (await ownerDb.notificacao.findMany({ where: { evento: "PRAZO_PROXIMO" }, select: { entidadeId: true } })).map((a) => a.entidadeId);
    expect(primeira.encontradas).toBe(1);
    expect(await avisados()).toContain(normal.id);
    expect(await avisados()).not.toContain(emConferencia.id);

    // Devolvido, o item deixa de estar em conferência e o aviso passa a valer.
    await devolver(envio.id);
    const segunda = await dispararPrazoProximo(7, hoje);
    expect(segunda.encontradas).toBe(2);
    expect(await avisados()).toContain(emConferencia.id);
  });

  it("pedido pendente sem arquivo (item que não exige comprovante) continua recebendo o aviso", async () => {
    const tarefa = await ownerDb.tarefa.create({ data: { projetoId: projetoConferencia.id, nome: "Prazo próximo sem arquivo", prazo: prazoProximo, status: "EM_ANDAMENTO", responsavelUsuarioId: admin.id } });
    await enviarPedido({ tarefaId: tarefa.id }, 0);
    const resultado = await dispararPrazoProximo(7, hoje);
    expect(resultado.encontradas).toBe(1);
    const avisos = await ownerDb.notificacao.findMany({ where: { evento: "PRAZO_PROXIMO" }, select: { entidadeId: true } });
    expect(avisos.map((a) => a.entidadeId)).toContain(tarefa.id);
  });
});
