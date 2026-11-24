"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { obterContexto } from "@/server/auth/contexto";
import {
  dadosItemDoPedido, decidirPedidoPrazo, retirarPedidoPrazo, rotaPedidoPrazo, solicitarPedidoPrazo,
  type AlvoPedidoPrazo, type PedidoComAlvo,
} from "@/lib/pedidos-prazo";
import { rotuloStatusPedido, rotuloTipoPedido } from "@/lib/pedidos-prazo-regras";
import { dispararEventoNotificacao, listarAdministradoresAtivos, listarInternosAtribuidosAoProjeto } from "@/lib/notificacoes";

type EstadoFormulario = { erro?: string };
type Acao = "solicitar" | "decidir" | "retirar";

function texto(form: FormData, campo: string) {
  const valor = form.get(campo);
  return typeof valor === "string" ? valor : "";
}

function atualizarTelas(tarefaId: string) {
  revalidatePath(`/tarefas/${tarefaId}`);
  revalidatePath(`/minhas-tarefas/${tarefaId}`);
  revalidatePath("/painel");
  revalidatePath("/agenda");
}

async function avisarPedido(pedido: PedidoComAlvo, acao: "solicitar" | "decidir") {
  const item = dadosItemDoPedido(pedido);
  const rota = (perfil: "ADMIN" | "ADMIN_INTERNO" | "ADMIN_EXTERNO") =>
    rotaPedidoPrazo(perfil, item.tarefaId, item.subtarefaId, pedido.id);
  if (acao === "solicitar") {
    const [administradores, internos] = await Promise.all([
      listarAdministradoresAtivos(), listarInternosAtribuidosAoProjeto(item.projetoId),
    ]);
    const dados = {
      titulo: rotuloStatusPedido(pedido.tipo, pedido.status),
      mensagem: `${rotuloTipoPedido(pedido.tipo)} em “${item.titulo}”. Confira o pedido para responder.`,
      entidadeId: pedido.id,
      dedupeKey: `pedido-prazo:${pedido.id}:recebido`,
    };
    await Promise.all([
      dispararEventoNotificacao("PEDIDO_PRAZO_RECEBIDO", { ...dados, url: rota("ADMIN"), usuarioIds: administradores }),
      dispararEventoNotificacao("PEDIDO_PRAZO_RECEBIDO", { ...dados, url: rota("ADMIN_INTERNO"), usuarioIds: internos }),
    ]);
  } else if (pedido.solicitadoPorId) {
    await dispararEventoNotificacao("PEDIDO_PRAZO_RESPONDIDO", {
      titulo: rotuloStatusPedido(pedido.tipo, pedido.status),
      mensagem: `Seu pedido em “${item.titulo}” foi respondido.${pedido.respostaDecisao ? ` Resposta: ${pedido.respostaDecisao}` : ""}`,
      url: rota("ADMIN_EXTERNO"),
      entidadeId: pedido.id,
      dedupeKey: `pedido-prazo:${pedido.id}:respondido`,
      usuarioIds: [pedido.solicitadoPorId],
    });
  }
}

function mensagemErro(erro: unknown) {
  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    if (erro.code === "P2010" && erro.meta?.code === "P0001" && typeof erro.meta.message === "string") {
      return erro.meta.message.replace(/^ERROR:\s*/, "");
    }
    console.error("[pedido-prazo] falha na operação", erro.code);
    return "Não foi possível salvar. Tente novamente.";
  }
  return erro instanceof Error ? erro.message : "Não foi possível salvar. Tente novamente.";
}

export async function pedidoPrazoFormAction(
  acao: Acao, tarefaId: string, alvo: AlvoPedidoPrazo, pedidoId: string,
  _estado: EstadoFormulario, form: FormData,
): Promise<EstadoFormulario> {
  const ctx = await obterContexto();
  try {
    if (acao === "retirar") {
      await retirarPedidoPrazo(ctx, pedidoId);
    } else {
      let pedido: PedidoComAlvo;
      if (acao === "solicitar") {
        const tipo = texto(form, "tipo");
        if (tipo !== "PRAZO" && tipo !== "IMPEDIMENTO") return { erro: "Escolha uma opção." };
        pedido = await solicitarPedidoPrazo(ctx, alvo, tipo, texto(form, "prazoNovo"), texto(form, "motivo"));
      } else {
        const decisao = texto(form, "decisao");
        if (decisao !== "APROVAR" && decisao !== "RECUSAR") return { erro: "Escolha uma decisão." };
        const prazoConfirmado = form.get("confirmarPrazo") === "sim" ? texto(form, "prazoConfirmado") : null;
        if (prazoConfirmado !== null && prazoConfirmado !== "sem-prazo" &&
            !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(prazoConfirmado)) {
          return { erro: "Confira o prazo vigente e confirme a aprovação." };
        }
        pedido = await decidirPedidoPrazo(ctx, pedidoId, decisao === "APROVAR", texto(form, "resposta"), prazoConfirmado);
      }
      after(() => avisarPedido(pedido, acao));
    }
    atualizarTelas(tarefaId);
    return {};
  } catch (erro) {
    atualizarTelas(tarefaId);
    return { erro: mensagemErro(erro) };
  }
}
