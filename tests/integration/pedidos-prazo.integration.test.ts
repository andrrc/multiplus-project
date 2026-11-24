import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { enviarEmail } from "@/lib/email";
import { dispararEventoNotificacao } from "@/lib/notificacoes";
import { concluirTarefa, solicitarConclusao } from "@/lib/projetos-tarefas";
import { carregarPedidosPrazo, decidirPedidoPrazo, retirarPedidoPrazo, solicitarPedidoPrazo } from "@/lib/pedidos-prazo";
import { comoUsuario, ownerDb, limparFixtures, fecharConexoes, type ContextoUsuario } from "./setup/helpers";

vi.mock("@/lib/email", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/email")>();
  return { ...original, enviarEmail: vi.fn(async () => {}) };
});

const data = (valor: string) => new Date(valor + "T00:00:00Z");
const hoje = new Date();
const anoSeguinte = hoje.getUTCFullYear() + 1;
const ano = new Date(Date.UTC(anoSeguinte, 1, 29)).getUTCMonth() === 1 ? anoSeguinte + 1 : anoSeguinte;
const prazo = data(`${ano}-01-31`);
const novaData = `${ano}-02-01`;
let projetoId: string;
let admin: ContextoUsuario;
let interno: ContextoUsuario;
let outroInterno: ContextoUsuario;
let externo: ContextoUsuario;
let outroExterno: ContextoUsuario;
let cliente: ContextoUsuario;

async function usuario(nome: string, perfil: ContextoUsuario["perfil"], clienteId?: string) {
  const { id } = await ownerDb.usuario.create({ data: { nome, perfil, clienteId, email: `${nome}@pedido.teste` } });
  return { usuarioId: id, perfil };
}

function criarTarefa(dados: Partial<Prisma.TarefaUncheckedCreateInput> = {}) {
  return ownerDb.tarefa.create({ data: {
    projetoId, nome: "Tarefa de pedido de prazo", prazo, responsavelUsuarioId: externo.usuarioId, ...dados,
  } });
}

const tarefa = (id: string) => ({ tipo: "TAREFA", id } as const);
const subtarefa = (id: string) => ({ tipo: "SUBTAREFA", id } as const);
const pedirDireto = (ctx: ContextoUsuario, id: string, nova: string | null = novaData) =>
  comoUsuario(ctx, (tx) => tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM solicitar_pedido_prazo('TAREFA', ${id}, 'PRAZO', ${nova}::date, 'Motivo do teste')
  `);

beforeAll(async () => {
  await limparFixtures();
  const empresa = await ownerDb.cliente.create({ data: { razaoSocial: "Empresa Pedido Prazo", segmento: "Teste", origemContato: "Teste" } });
  projetoId = (await ownerDb.projeto.create({ data: { clienteId: empresa.id, nome: "Projeto Pedido Prazo" } })).id;
  [admin, interno, outroInterno, externo, outroExterno, cliente] = await Promise.all([
    usuario("admin", "ADMIN"),
    usuario("interno", "ADMIN_INTERNO"),
    usuario("interno-alheio", "ADMIN_INTERNO"),
    usuario("externo", "ADMIN_EXTERNO"),
    usuario("externo-alheio", "ADMIN_EXTERNO"),
    usuario("cliente", "CLIENTE", empresa.id),
  ]);
  const outroProjeto = await ownerDb.projeto.create({ data: { clienteId: empresa.id, nome: "Outro projeto" } });
  const outroItem = await criarTarefa({ projetoId: outroProjeto.id, responsavelUsuarioId: outroExterno.usuarioId });
  await ownerDb.atribuicao.createMany({ data: [
    { usuarioId: interno.usuarioId, entidadeTipo: "PROJETO", entidadeId: projetoId },
    { usuarioId: outroInterno.usuarioId, entidadeTipo: "PROJETO", entidadeId: outroProjeto.id },
    { usuarioId: outroExterno.usuarioId, entidadeTipo: "TAREFA", entidadeId: outroItem.id },
  ] });
});

afterAll(async () => {
  await ownerDb.pedidoPrazo.deleteMany();
  await ownerDb.registroEnvioPrazo.deleteMany({ where: { chave: { startsWith: "pedido-prazo:" } } });
  await limparFixtures();
  await fecharConexoes();
});

describe("pedidos de prazo com a role restrita", () => {
  it("autoriza só o externo responsável; protege a leitura e a escrita da tabela", async () => {
    const t = await criarTarefa();
    for (const ctx of [admin, interno, outroExterno, cliente]) {
      await expect(pedirDireto(ctx, t.id)).rejects.toThrow(/externo responsável/);
      await expect(solicitarPedidoPrazo(ctx, tarefa(t.id), "PRAZO", novaData, "Motivo")).rejects.toThrow(/externo responsável/);
    }
    const [{ id }] = await pedirDireto(externo, t.id);
    for (const [ctx, autorizado] of [
      [admin, true], [interno, true], [externo, true], [outroInterno, false], [outroExterno, false], [cliente, false],
    ] as const) {
      const visto = await comoUsuario(ctx, (tx) => tx.pedidoPrazo.findUnique({ where: { id } }));
      expect(!!visto).toBe(autorizado);
    }
    await expect(comoUsuario(externo, (tx) => tx.pedidoPrazo.create({
      data: { tarefaId: t.id, tipo: "IMPEDIMENTO", motivo: "Direto", solicitadoPorNome: "Externo" },
    }))).rejects.toThrow();
    await expect(decidirPedidoPrazo(outroInterno, id, true, "", null)).rejects.toThrow(/Sem permissão/);
    await expect(comoUsuario(outroInterno, (tx) => tx.$queryRaw`SELECT id FROM decidir_pedido_prazo(${id}, true, NULL, false, NULL)`)).rejects.toThrow(/Sem permissão/);
  });

  it("aprova como interno, preserva o restante do item e guarda os dois prazos", async () => {
    const t = await criarTarefa();
    const pedido = await solicitarPedidoPrazo(externo, tarefa(t.id), "PRAZO", novaData, "  Motivo  ");
    const prazoVigente = data(`${ano}-01-30`);
    const antes = await ownerDb.tarefa.update({ where: { id: t.id }, data: { prazo: prazoVigente } });
    await expect(decidirPedidoPrazo(interno, pedido.id, true, "", null)).rejects.toThrow(/prazo mudou/);
    await expect(comoUsuario(interno, (tx) =>
      tx.$queryRaw`SELECT id FROM decidir_pedido_prazo(${pedido.id}, true, NULL, true, ${prazo.toISOString()}::timestamp)`,
    )).rejects.toThrow(/prazo mudou/);
    // Exercita o guard de coluna pelo contexto do proprietário usado pela função de decisão.
    await expect(ownerDb.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.perfil', 'ADMIN_INTERNO', true)`;
      await tx.$executeRaw`SELECT set_config('app.pedido_prazo_item', ${`TAREFA:${t.id}`}, true)`;
      await tx.tarefa.update({ where: { id: t.id }, data: { nome: "Outro título" } });
    })).rejects.toThrow(/só permite alterar o prazo/);
    await expect(decidirPedidoPrazo(interno, pedido.id, true, "Tudo certo", prazoVigente.toISOString())).resolves.toMatchObject({
      status: "APROVADO", prazoAtual: prazo, prazoSubstituido: prazoVigente, motivo: "Motivo", respostaDecisao: "Tudo certo",
    });
    expect(await ownerDb.tarefa.findUniqueOrThrow({ where: { id: t.id } })).toEqual({ ...antes, prazo: data(novaData) });
    expect(await comoUsuario(interno, tx => tx.tarefa.updateMany({
      where: { id: t.id }, data: { nome: "Outro título" },
    }))).toMatchObject({ count: 0 });
    await expect(ownerDb.pedidoPrazo.update({ where: { id: pedido.id }, data: { motivo: "Alterado" } }))
      .rejects.toThrow(/imutável/);
  });

  it("respeita a próxima ocorrência mensal na prorrogação de 31/01 para 01/02", async () => {
    const t = await criarTarefa({ periodicidade: "MENSAL", prazoOriginal: prazo });
    const limite = `${ano}-02-28`;
    await expect(pedirDireto(externo, t.id, limite)).rejects.toThrow(/próxima ocorrência/);
    await expect(solicitarPedidoPrazo(externo, tarefa(t.id), "PRAZO", limite, "Motivo")).rejects.toThrow(/próxima ocorrência/);
    const pedido = await solicitarPedidoPrazo(externo, tarefa(t.id), "PRAZO", novaData, "Motivo");
    await decidirPedidoPrazo(interno, pedido.id, true, "", null);
    expect(await ownerDb.tarefa.findUniqueOrThrow({ where: { id: t.id } })).toMatchObject({
      prazo: data(novaData), prazoOriginal: prazo,
    });
    expect((await concluirTarefa(admin, t.id)).proxima).toMatchObject({
      prazo: data(limite), prazoOriginal: prazo,
    });
  });

  it("as subtarefas da próxima ocorrência medem a distância pela data da série, não pelo prazo prorrogado", async () => {
    const proximoDe = async (t: { id: string }) => {
      const proxima = (await concluirTarefa(admin, t.id)).proxima;
      if (!proxima) throw new Error("A próxima ocorrência deveria existir.");
      return ownerDb.subtarefa.findFirstOrThrow({ where: { tarefaId: proxima.id } });
    };
    // Subtarefa cinco dias antes da data da série (31/01): 26/01. A próxima ocorrência é 28/02, então a cópia fica em 23/02.
    const dadosSubtarefa = (tarefaId: string) => ({ tarefaId, titulo: "Subtarefa da série", prazo: data(`${ano}-01-26`) });

    const semPedido = await criarTarefa({ periodicidade: "MENSAL", prazoOriginal: prazo });
    await ownerDb.subtarefa.create({ data: dadosSubtarefa(semPedido.id) });
    expect((await proximoDe(semPedido)).prazo).toEqual(data(`${ano}-02-23`));

    const prorrogada = await criarTarefa({ periodicidade: "MENSAL", prazoOriginal: prazo });
    await ownerDb.subtarefa.create({ data: dadosSubtarefa(prorrogada.id) });
    const pedido = await solicitarPedidoPrazo(externo, tarefa(prorrogada.id), "PRAZO", `${ano}-02-20`, "Motivo");
    await decidirPedidoPrazo(interno, pedido.id, true, "", null);
    expect(await ownerDb.tarefa.findUniqueOrThrow({ where: { id: prorrogada.id } })).toMatchObject({ prazo: data(`${ano}-02-20`) });
    // A conta antiga mediria até 20/02 (25 dias) e levaria a cópia para 03/02.
    expect((await proximoDe(prorrogada)).prazo).toEqual(data(`${ano}-02-23`));
  });

  it("serializa criação e decisão concorrentes e permite novo pedido depois da resposta", async () => {
    const t = await criarTarefa();
    const criacoes = await Promise.allSettled([pedirDireto(externo, t.id), pedirDireto(externo, t.id)]);
    expect(criacoes.map(r => r.status).sort()).toEqual(["fulfilled", "rejected"]);
    const pedido = await ownerDb.pedidoPrazo.findFirstOrThrow({ where: { tarefaId: t.id } });
    await expect(decidirPedidoPrazo(interno, pedido.id, false, "", null)).rejects.toThrow(/resposta/);
    const decisoes = await Promise.allSettled([
      decidirPedidoPrazo(interno, pedido.id, false, "Indeferido", null),
      decidirPedidoPrazo(admin, pedido.id, false, "Recusado", null),
    ]);
    expect(decisoes.map(r => r.status).sort()).toEqual(["fulfilled", "rejected"]);
    const novo = await solicitarPedidoPrazo(externo, tarefa(t.id), "PRAZO", novaData, "Motivo atualizado");
    await expect(retirarPedidoPrazo(outroExterno, novo.id)).rejects.toThrow(/Sem permissão/);
    await expect(retirarPedidoPrazo(externo, novo.id)).resolves.toMatchObject({ status: "CANCELADO" });
  });

  it("só o autor retira o pedido: administração, interno, cliente e outro externo são recusados", async () => {
    const t = await criarTarefa();
    const pedido = await solicitarPedidoPrazo(externo, tarefa(t.id), "PRAZO", novaData, "Motivo");
    for (const ctx of [admin, interno, outroInterno, cliente, outroExterno]) {
      await expect(retirarPedidoPrazo(ctx, pedido.id)).rejects.toThrow(/Sem permissão para retirar/);
      await expect(comoUsuario(ctx, (tx) => tx.$queryRaw`SELECT id FROM cancelar_pedido_prazo(${pedido.id})`))
        .rejects.toThrow(/Sem permissão para retirar/);
    }
    expect(await ownerDb.pedidoPrazo.findUniqueOrThrow({ where: { id: pedido.id } })).toMatchObject({ status: "PENDENTE" });
    await expect(retirarPedidoPrazo(externo, pedido.id)).resolves.toMatchObject({ status: "CANCELADO" });
  });

  it("na troca de responsável, mostra só a existência do pedido ao novo responsável", async () => {
    const t = await criarTarefa();
    const pedido = await solicitarPedidoPrazo(externo, tarefa(t.id), "PRAZO", novaData, "Texto privado");
    await ownerDb.tarefa.update({ where: { id: t.id }, data: { responsavelUsuarioId: outroExterno.usuarioId } });
    const novo = await carregarPedidosPrazo(outroExterno, t.id, []);
    expect(novo.estados.get(t.id)).toMatchObject({ pendente: true });
    expect(novo.porItem.get(t.id)).toBeUndefined();
    const antigo = await carregarPedidosPrazo(externo, t.id, []);
    expect(antigo.porItem.get(t.id)).toMatchObject([{ id: pedido.id, motivo: "Texto privado" }]);
    expect(antigo.estados.has(t.id)).toBe(false);
  });

  it("permite impedimento em subtarefa sem prazo e cancela pedido pendente quando o item fecha", async () => {
    const t = await criarTarefa({ prazo: null });
    const s = await ownerDb.subtarefa.create({ data: { tarefaId: t.id, titulo: "Subtarefa", atribuidoAUsuarioId: externo.usuarioId } });
    await expect(pedirDireto(externo, t.id)).rejects.toThrow(/não tem prazo/);
    await expect(solicitarPedidoPrazo(externo, subtarefa(s.id), "PRAZO", novaData, "Motivo")).rejects.toThrow(/não tem prazo/);
    const pedido = await solicitarPedidoPrazo(externo, subtarefa(s.id), "IMPEDIMENTO", "", "Sem acesso ao local");
    await decidirPedidoPrazo(interno, pedido.id, true, "", null);
    expect(await ownerDb.subtarefa.findUniqueOrThrow({ where: { id: s.id } })).toEqual(s);
    const novo = await solicitarPedidoPrazo(externo, subtarefa(s.id), "IMPEDIMENTO", "", "Acesso ainda bloqueado");
    await ownerDb.subtarefa.update({ where: { id: s.id }, data: { status: "CONCLUIDO" } });
    expect(await ownerDb.pedidoPrazo.findUnique({ where: { id: novo.id } })).toMatchObject({ status: "CANCELADO" });
    await expect(solicitarPedidoPrazo(externo, subtarefa(s.id), "IMPEDIMENTO", "", "Motivo")).rejects.toThrow(/fechado/);
    await ownerDb.tarefa.update({ where: { id: t.id }, data: { ativo: false } });
    await expect(pedirDireto(externo, t.id)).rejects.toThrow(/fechado/);
    const aberta = await criarTarefa();
    const pendente = await solicitarPedidoPrazo(externo, tarefa(aberta.id), "PRAZO", novaData, "Motivo");
    await concluirTarefa(admin, aberta.id);
    expect(await ownerDb.pedidoPrazo.findUnique({ where: { id: pendente.id } })).toMatchObject({ status: "CANCELADO" });
  });

  it.each(["CONCLUIDO", "CANCELADO"] as const)(
    "cancela o pedido da subtarefa quando a tarefa principal fica %s",
    async (status) => {
      const t = await criarTarefa();
      const s = await ownerDb.subtarefa.create({
        data: { tarefaId: t.id, titulo: "Subtarefa aberta", prazo, atribuidoAUsuarioId: externo.usuarioId },
      });
      const pedido = await solicitarPedidoPrazo(externo, subtarefa(s.id), "PRAZO", novaData, "Motivo");

      if (status === "CONCLUIDO") await concluirTarefa(admin, t.id);
      else await ownerDb.tarefa.update({ where: { id: t.id }, data: { status } });

      expect(await ownerDb.pedidoPrazo.findUniqueOrThrow({ where: { id: pedido.id } })).toMatchObject({ status: "CANCELADO" });
      await expect(decidirPedidoPrazo(interno, pedido.id, true, "", null)).rejects.toThrow(/já foi respondido ou retirado/);
      await expect(comoUsuario(interno, (tx) =>
        tx.$queryRaw`SELECT id FROM decidir_pedido_prazo(${pedido.id}, true, NULL, false, NULL)`,
      )).rejects.toThrow(/item está fechado/);
      await expect(solicitarPedidoPrazo(externo, subtarefa(s.id), "PRAZO", novaData, "Novo pedido"))
        .rejects.toThrow(/item está fechado/);
      expect(await ownerDb.subtarefa.findUniqueOrThrow({ where: { id: s.id } })).toMatchObject({
        status: "EM_ANDAMENTO", prazo,
      });
    },
  );

  it("bloqueia pedidos na conferência e recusa datas passadas ou iguais ao prazo no banco", async () => {
    const t = await criarTarefa({ comprovanteExigido: true, comprovanteQuantidade: 1 });
    await expect(pedirDireto(externo, t.id, `${ano}-01-31`)).rejects.toThrow(/posterior ao prazo/);
    const vencida = await criarTarefa({ prazo: data("2000-01-01") });
    await expect(pedirDireto(externo, vencida.id, "2001-01-01")).rejects.toThrow(/anterior a hoje/);
    await comoUsuario(externo, (tx) => tx.$queryRaw`
      SELECT registrar_arquivo_comprovante('TAREFA', ${t.id}, 'comprovantes/pedido-prazo.pdf',
        'arquivo.pdf', 'application/pdf', 2048)
    `);
    await solicitarConclusao(externo, "TAREFA", t.id);
    await expect(pedirDireto(externo, t.id)).rejects.toThrow(/em conferência/);
    await expect(solicitarPedidoPrazo(externo, tarefa(t.id), "IMPEDIMENTO", "", "Motivo")).rejects.toThrow(/em conferência/);
  });

  it("insere preferências para os quatro perfis e deduplica os dois eventos inclusive no canal só e-mail", async () => {
    const eventos = ["PEDIDO_PRAZO_RECEBIDO", "PEDIDO_PRAZO_RESPONDIDO"] as const;
    const preferencias = await ownerDb.preferenciaNotificacao.findMany({ where: { evento: { in: [...eventos] } } });
    expect(preferencias).toHaveLength(8);
    expect(preferencias.every(p => p.email && p.inApp)).toBe(true);
    try {
      await ownerDb.preferenciaNotificacao.updateMany({
        where: { evento: eventos[0], perfil: "ADMIN" }, data: { email: false },
      });
      await ownerDb.preferenciaNotificacao.updateMany({
        where: { evento: eventos[1], perfil: "ADMIN_EXTERNO" }, data: { inApp: false },
      });
      vi.mocked(enviarEmail).mockClear();
      const recebido = {
        titulo: "Recebido", mensagem: "Pedido", usuarioIds: [admin.usuarioId, cliente.usuarioId, externo.usuarioId],
        dedupeKey: "pedido-prazo:teste:recebido",
      };
      const respondido = {
        titulo: "Respondido", mensagem: "Decisão", usuarioIds: [externo.usuarioId, cliente.usuarioId, interno.usuarioId],
        dedupeKey: "pedido-prazo:teste:respondido",
      };
      await Promise.all([
        dispararEventoNotificacao(eventos[0], recebido), dispararEventoNotificacao(eventos[0], recebido),
        dispararEventoNotificacao(eventos[1], respondido), dispararEventoNotificacao(eventos[1], respondido),
      ]);
      expect(await ownerDb.notificacao.count({ where: { evento: eventos[0], usuarioId: admin.usuarioId } })).toBe(1);
      expect(await ownerDb.notificacao.count({ where: { evento: { in: [...eventos] } } })).toBe(1);
      expect(enviarEmail).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ subject: "Respondido", to: "externo@pedido.teste" }));
    } finally {
      await ownerDb.preferenciaNotificacao.updateMany({ where: { evento: { in: [...eventos] } }, data: { email: true, inApp: true } });
    }
  });
});
