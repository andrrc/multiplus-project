/**
 * Cliente "com atraso", tarefa "aguardando outras pessoas" e "marcar como não lido". Roda contra o Postgres de
 * verdade, pela role RLS-restrita: o colaborador só enxerga o atraso e as tarefas do escopo dele.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listarClientes, listarClientesContextuais } from "@/lib/clientes";
import { listarTarefasAtribuidas } from "@/lib/projetos-tarefas";
import { marcarNotificacaoLida, marcarNotificacaoNaoLida } from "@/lib/notificacoes";
import { ownerDb, limparFixtures, fecharConexoes } from "./setup/helpers";

const passado = new Date("2000-01-01T00:00:00Z");
const futuro = new Date("2999-01-01T00:00:00Z");

let admin: { id: string };
let interno: { id: string };
let colega: { id: string };
let clienteAtrasado: { id: string };
let clienteSubAtrasada: { id: string };
let clienteEmDia: { id: string };
let clienteSoFechado: { id: string };
let clienteDeOutro: { id: string };
let tarefaDelegada: { id: string };
let tarefaComPedido: { id: string };
let tarefaSozinha: { id: string };

const ctxAdmin = () => ({ usuarioId: admin.id, perfil: "ADMIN" as const });
const ctxInterno = () => ({ usuarioId: interno.id, perfil: "ADMIN_INTERNO" as const });

async function novoCliente(nome: string, cnpj: string) {
  return ownerDb.cliente.create({ data: { razaoSocial: nome, cnpj, segmento: "Indústria", origemContato: "Indicação" } });
}

beforeAll(async () => {
  await limparFixtures();
  admin = await ownerDb.usuario.create({ data: { nome: "Talita atraso", email: "talita.atraso@teste.local", perfil: "ADMIN" } });
  interno = await ownerDb.usuario.create({ data: { nome: "Interno atraso", email: "interno.atraso@teste.local", perfil: "ADMIN_INTERNO" } });
  colega = await ownerDb.usuario.create({ data: { nome: "Colega atraso", email: "colega.atraso@teste.local", perfil: "ADMIN_INTERNO" } });

  clienteAtrasado = await novoCliente("Atrasado Ltda", "10000000000101");
  clienteSubAtrasada = await novoCliente("Subtarefa Atrasada Ltda", "10000000000102");
  clienteEmDia = await novoCliente("Em Dia Ltda", "10000000000103");
  clienteSoFechado = await novoCliente("So Fechado Ltda", "10000000000104");
  clienteDeOutro = await novoCliente("De Outro Ltda", "10000000000105");

  const pAtrasado = await ownerDb.projeto.create({ data: { clienteId: clienteAtrasado.id, nome: "P atrasado" } });
  const pSub = await ownerDb.projeto.create({ data: { clienteId: clienteSubAtrasada.id, nome: "P subtarefa" } });
  const pDia = await ownerDb.projeto.create({ data: { clienteId: clienteEmDia.id, nome: "P em dia" } });
  const pFechado = await ownerDb.projeto.create({ data: { clienteId: clienteSoFechado.id, nome: "P fechado" } });
  const pOutro = await ownerDb.projeto.create({ data: { clienteId: clienteDeOutro.id, nome: "P de outro" } });

  await ownerDb.tarefa.create({ data: { projetoId: pAtrasado.id, nome: "Vencida", prazo: passado, responsavelUsuarioId: interno.id } });
  const tSub = await ownerDb.tarefa.create({ data: { projetoId: pSub.id, nome: "Com subtarefa vencida", prazo: futuro, responsavelUsuarioId: interno.id } });
  await ownerDb.subtarefa.create({ data: { tarefaId: tSub.id, titulo: "Sub vencida", prazo: passado, atribuidoAUsuarioId: interno.id } });
  await ownerDb.tarefa.create({ data: { projetoId: pDia.id, nome: "No prazo", prazo: futuro, responsavelUsuarioId: interno.id } });
  await ownerDb.tarefa.create({ data: { projetoId: pFechado.id, nome: "Vencida e concluída", prazo: passado, status: "CONCLUIDO", responsavelUsuarioId: interno.id } });
  await ownerDb.tarefa.create({ data: { projetoId: pFechado.id, nome: "Vencida e desativada", prazo: passado, ativo: false, responsavelUsuarioId: interno.id } });
  // Do colega, fora do escopo do colaborador interno.
  await ownerDb.tarefa.create({ data: { projetoId: pOutro.id, nome: "Vencida de outro", prazo: passado, responsavelUsuarioId: colega.id } });

  // O colaborador interno é atribuído ao projeto (RN-005); só assim a RLS mostra a ele as subtarefas dos colegas.
  await ownerDb.atribuicao.create({ data: { usuarioId: interno.id, entidadeTipo: "PROJETO", entidadeId: pDia.id } });
  // Aguardando outras pessoas: subtarefa em andamento do colega, pedido de conclusão pendente e tarefa só dele.
  tarefaDelegada = await ownerDb.tarefa.create({ data: { projetoId: pDia.id, nome: "Delegada", prazo: futuro, responsavelUsuarioId: interno.id } });
  await ownerDb.subtarefa.create({ data: { tarefaId: tarefaDelegada.id, titulo: "Do colega", atribuidoAUsuarioId: colega.id } });
  tarefaComPedido = await ownerDb.tarefa.create({ data: { projetoId: pDia.id, nome: "Com pedido", prazo: futuro, responsavelUsuarioId: interno.id } });
  await ownerDb.solicitacaoConclusao.create({ data: { tarefaId: tarefaComPedido.id, solicitadoPorId: interno.id, solicitadoPorNome: "Interno atraso", statusAnterior: "EM_ANDAMENTO" } });
  tarefaSozinha = await ownerDb.tarefa.create({ data: { projetoId: pDia.id, nome: "Sozinha", prazo: futuro, responsavelUsuarioId: interno.id } });
  await ownerDb.subtarefa.create({ data: { tarefaId: tarefaSozinha.id, titulo: "Minha", atribuidoAUsuarioId: interno.id } });
  await ownerDb.subtarefa.create({ data: { tarefaId: tarefaSozinha.id, titulo: "Do colega concluída", atribuidoAUsuarioId: colega.id, status: "CONCLUIDO" } });
});

afterAll(async () => {
  await limparFixtures();
  await fecharConexoes();
});

describe("cliente com atraso", () => {
  it("a administração vê atraso de tarefa e de subtarefa, e ignora o que está fechado ou desativado", async () => {
    const lista = await listarClientes(ctxAdmin());
    const por = Object.fromEntries(lista.map((c) => [c.razaoSocial, c.emAtraso]));
    expect(por).toMatchObject({
      "Atrasado Ltda": true,
      "Subtarefa Atrasada Ltda": true,
      "Em Dia Ltda": false,
      "So Fechado Ltda": false,
      "De Outro Ltda": true,
    });
  });

  it("o colaborador interno só enxerga o atraso do que está no escopo dele", async () => {
    const lista = await listarClientesContextuais(ctxInterno());
    const por = Object.fromEntries(lista.map((c) => [c.razaoSocial, c.emAtraso]));
    expect(por["Atrasado Ltda"]).toBe(true);
    expect(por["Em Dia Ltda"]).toBe(false);
    expect(por).not.toHaveProperty("De Outro Ltda");
  });
});

describe("tarefa aguardando outras pessoas", () => {
  it("marca a tarefa com subtarefa em andamento de outra pessoa ou com pedido de conclusão pendente", async () => {
    const tarefas = await listarTarefasAtribuidas(ctxInterno());
    const por = Object.fromEntries(tarefas.map((t) => [t.nome, t.aguardandoOutras]));
    expect(por["Delegada"]).toBe(true);
    expect(por["Com pedido"]).toBe(true);
  });

  it("não marca a tarefa só dele, mesmo com subtarefa concluída de outra pessoa", async () => {
    const tarefas = await listarTarefasAtribuidas(ctxInterno());
    const por = Object.fromEntries(tarefas.map((t) => [t.nome, t.aguardandoOutras]));
    expect(por["Sozinha"]).toBe(false);
    expect(por["No prazo"]).toBe(false);
  });
});

describe("marcar aviso como não lido", () => {
  it("desfaz a leitura do próprio aviso e não mexe no de outra conta", async () => {
    const meu = await ownerDb.notificacao.create({ data: { usuarioId: interno.id, evento: "NOVO_COMENTARIO", titulo: "Meu aviso", mensagem: "m", lida: true } });
    const alheio = await ownerDb.notificacao.create({ data: { usuarioId: colega.id, evento: "NOVO_COMENTARIO", titulo: "Aviso alheio", mensagem: "m", lida: true } });

    await marcarNotificacaoNaoLida(ctxInterno(), meu.id);
    await marcarNotificacaoNaoLida(ctxInterno(), alheio.id);
    expect((await ownerDb.notificacao.findUniqueOrThrow({ where: { id: meu.id } })).lida).toBe(false);
    expect((await ownerDb.notificacao.findUniqueOrThrow({ where: { id: alheio.id } })).lida).toBe(true);

    await marcarNotificacaoLida(ctxInterno(), meu.id);
    expect((await ownerDb.notificacao.findUniqueOrThrow({ where: { id: meu.id } })).lida).toBe(true);
  });
});
