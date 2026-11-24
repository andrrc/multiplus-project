import { Prisma, type TipoPedidoPrazo } from "@prisma/client";
import { comContextoDeUsuario, type ContextoUsuario } from "@/lib/prisma-app";
import {
  lerDataPedido, motivoBloqueioPedido, validarNovaDataPedido, validarTextoPedido, type PrazoDoItem,
} from "@/lib/pedidos-prazo-regras";

export type AlvoPedidoPrazo = { tipo: "TAREFA" | "SUBTAREFA"; id: string };
type EstadoPedido = PrazoDoItem & { fechado: boolean; conferencia: boolean; pendente: boolean };
type EstadoComId = EstadoPedido & { id: string };

const dadosDoAlvo = {
  tarefa: { select: { id: true, nome: true, projetoId: true, prazo: true, periodicidade: true, prazoOriginal: true, diaSemana: true } },
  subtarefa: { select: { id: true, titulo: true, prazo: true, tarefa: { select: { id: true, projetoId: true } } } },
} satisfies Prisma.PedidoPrazoInclude;

export type PedidoComAlvo = Prisma.PedidoPrazoGetPayload<{ include: typeof dadosDoAlvo }>;

export function dadosItemDoPedido(pedido: PedidoComAlvo) {
  const tarefa = pedido.tarefa ?? pedido.subtarefa?.tarefa;
  if (!tarefa) throw new Error("Item do pedido indisponível.");
  return {
    tarefaId: tarefa.id,
    subtarefaId: pedido.subtarefaId,
    projetoId: tarefa.projetoId,
    titulo: pedido.tarefa?.nome ?? pedido.subtarefa?.titulo ?? "Item",
  };
}

export function rotaPedidoPrazo(
  perfil: ContextoUsuario["perfil"], tarefaId: string, subtarefaId: string | null, pedidoId: string,
) {
  const rota = perfil === "ADMIN" ? "/tarefas" : "/minhas-tarefas";
  const consulta = subtarefaId ? `?subtarefa=${encodeURIComponent(subtarefaId)}` : "";
  return `${rota}/${encodeURIComponent(tarefaId)}${consulta}#pedido-prazo-${encodeURIComponent(pedidoId)}`;
}

async function estadoDoItem(tx: Prisma.TransactionClient, alvo: AlvoPedidoPrazo) {
  const [estado] = await tx.$queryRaw<EstadoPedido[]>`
    SELECT * FROM estado_pedido_prazo(${alvo.tipo}, ${alvo.id})
  `;
  return estado;
}

export function carregarPedidosPrazo(
  ctx: ContextoUsuario, tarefaId: string, subtarefas: readonly string[],
) {
  return comContextoDeUsuario(ctx, async (tx) => {
    const pedidos = await tx.pedidoPrazo.findMany({
      where: { OR: [{ tarefaId }, { subtarefaId: { in: [...subtarefas] } }] },
      orderBy: [{ status: "asc" }, { solicitadoEm: "desc" }, { id: "desc" }],
    });
    const estados = ctx.perfil === "ADMIN_EXTERNO" ? await tx.$queryRaw<EstadoComId[]>`
      SELECT alvo.id, estado.*
      FROM (VALUES ('TAREFA', ${tarefaId}) ${subtarefas.length
        ? Prisma.sql`, ${Prisma.join(subtarefas.map((id) => Prisma.sql`('SUBTAREFA', ${id})`))}`
        : Prisma.empty}) AS alvo(tipo, id)
      CROSS JOIN LATERAL estado_pedido_prazo(alvo.tipo, alvo.id) AS estado
    ` : [];
    const porItem = new Map<string, typeof pedidos>();
    for (const pedido of pedidos) {
      const id = pedido.tarefaId ?? pedido.subtarefaId;
      if (!id) continue;
      const historico = porItem.get(id);
      if (historico) historico.push(pedido);
      else porItem.set(id, [pedido]);
    }
    const tarefa = ctx.perfil === "ADMIN" || ctx.perfil === "ADMIN_INTERNO"
      ? await tx.tarefa.findUnique({ where: { id: tarefaId }, select: { projeto: { select: { dataPrevistaConclusao: true } } } })
      : null;
    return {
      porItem,
      estados: new Map(estados.map(({ id, ...estado }) => [id, estado])),
      previsaoDoProjeto: tarefa?.projeto.dataPrevistaConclusao ?? null,
    };
  });
}

export function listarPedidosPrazoPendentes(ctx: ContextoUsuario) {
  if (ctx.perfil !== "ADMIN" && ctx.perfil !== "ADMIN_INTERNO") return Promise.resolve([]);
  return comContextoDeUsuario(ctx, (tx) => tx.pedidoPrazo.findMany({
    where: { status: "PENDENTE" },
    orderBy: [{ solicitadoEm: "asc" }, { id: "asc" }],
    include: dadosDoAlvo,
  }));
}

export async function solicitarPedidoPrazo(
  ctx: ContextoUsuario, alvo: AlvoPedidoPrazo, tipo: TipoPedidoPrazo, novaData: string, texto: string,
) {
  if (ctx.perfil !== "ADMIN_EXTERNO") throw new Error("Só o colaborador externo responsável pode enviar o pedido.");
  const motivo = validarTextoPedido(texto, "Informe um motivo de até 2.000 caracteres.", true);
  return comContextoDeUsuario(ctx, async (tx) => {
    const estado = await estadoDoItem(tx, alvo);
    if (!estado) throw new Error("Só o colaborador externo responsável pode enviar o pedido.");
    const bloqueio = motivoBloqueioPedido(estado);
    if (bloqueio) throw new Error(bloqueio);
    if (tipo === "PRAZO") validarNovaDataPedido(estado, lerDataPedido(novaData));
    const [pedido] = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM solicitar_pedido_prazo(${alvo.tipo}, ${alvo.id}, CAST(${tipo} AS "TipoPedidoPrazo"),
        CAST(${tipo === "PRAZO" ? novaData : null} AS date), ${motivo})
    `;
    return tx.pedidoPrazo.findUniqueOrThrow({ where: { id: pedido.id }, include: dadosDoAlvo });
  });
}

export async function decidirPedidoPrazo(
  ctx: ContextoUsuario, id: string, aprovar: boolean, texto: string, prazoConfirmado: string | null,
) {
  if (ctx.perfil !== "ADMIN" && ctx.perfil !== "ADMIN_INTERNO") throw new Error("Sem permissão para decidir este pedido.");
  const resposta = validarTextoPedido(texto, aprovar
    ? "A resposta deve ter até 2.000 caracteres."
    : "Informe uma resposta de até 2.000 caracteres para recusar o pedido.", !aprovar);
  return comContextoDeUsuario(ctx, async (tx) => {
    const atual = await tx.pedidoPrazo.findUnique({ where: { id }, include: dadosDoAlvo });
    if (!atual) throw new Error("Sem permissão para decidir este pedido.");
    if (atual.status !== "PENDENTE") throw new Error("O pedido já foi respondido ou retirado.");
    if (aprovar && atual.prazoNovo) {
      const prazo = atual.tarefa?.prazo ?? atual.subtarefa?.prazo ?? null;
      if (prazo?.getTime() !== atual.prazoAtual?.getTime() &&
          prazoConfirmado !== (prazo?.toISOString() ?? "sem-prazo")) {
        throw new Error("O prazo mudou. Confira a data vigente e confirme a aprovação.");
      }
      validarNovaDataPedido({
        prazo, periodicidade: atual.tarefa?.periodicidade ?? null,
        ancora: atual.tarefa?.prazoOriginal ?? null, dia_semana: atual.tarefa?.diaSemana ?? null,
      }, atual.prazoNovo);
    }
    const [pedido] = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM decidir_pedido_prazo(${id}, ${aprovar}, ${resposta},
        ${prazoConfirmado !== null}, CAST(${prazoConfirmado === "sem-prazo" ? null : prazoConfirmado} AS timestamp))
    `;
    return tx.pedidoPrazo.findUniqueOrThrow({ where: { id: pedido.id }, include: dadosDoAlvo });
  });
}

export async function retirarPedidoPrazo(ctx: ContextoUsuario, id: string) {
  if (ctx.perfil !== "ADMIN" && ctx.perfil !== "ADMIN_EXTERNO") throw new Error("Sem permissão para retirar este pedido.");
  return comContextoDeUsuario(ctx, async (tx) => {
    const [pedido] = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM cancelar_pedido_prazo(${id})`;
    return tx.pedidoPrazo.findUniqueOrThrow({ where: { id: pedido.id }, include: dadosDoAlvo });
  });
}
