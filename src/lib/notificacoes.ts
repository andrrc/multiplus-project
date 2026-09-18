import { EventoNotificacao } from "@prisma/client";
import { enviarEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

type DadosEvento = {
  titulo: string;
  mensagem: string;
  url?: string | null;
  entidadeId?: string | null;
  dedupeKey?: string | null;
  usuarioIds?: string[];
};

type Destinatario = {
  id: string;
  nome: string;
  email: string;
  preferenciasNotificacao: { email: boolean; inApp: boolean }[];
};

function escaparHtml(valor: string) {
  return valor.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

async function listarDestinatarios(evento: EventoNotificacao, usuarioIds?: string[]) {
  return prisma.usuario.findMany({
    where: {
      ativo: true,
      ...(usuarioIds ? { id: { in: usuarioIds } } : {}),
      preferenciasNotificacao: { some: { evento, OR: [{ email: true }, { inApp: true }] } },
    },
    select: {
      id: true,
      nome: true,
      email: true,
      preferenciasNotificacao: { where: { evento }, select: { email: true, inApp: true } },
    },
  });
}

/** B6 — dispara in-app e e-mail sem deixar a integração externa bloquear a ação. */
export async function dispararEventoNotificacao(evento: EventoNotificacao, dados: DadosEvento) {
  try {
    const destinatarios = await listarDestinatarios(evento, dados.usuarioIds);
    await Promise.all(destinatarios.map(async (destinatario: Destinatario) => {
      const preferencia = destinatario.preferenciasNotificacao[0];
      if (!preferencia) return;

      if (preferencia.inApp) {
        await prisma.notificacao.create({
          data: {
            usuarioId: destinatario.id,
            evento,
            titulo: dados.titulo,
            mensagem: dados.mensagem,
            url: dados.url ?? null,
            entidadeId: dados.entidadeId ?? null,
            dedupeKey: dados.dedupeKey ? `${dados.dedupeKey}:${destinatario.id}` : null,
          },
        }).catch((erro: unknown) => {
          if ((erro as { code?: string }).code !== "P2002") throw erro;
        });
      }

      if (preferencia.email) {
        await enviarEmail({
          to: destinatario.email,
          subject: dados.titulo,
          html: `<p>Olá, ${escaparHtml(destinatario.nome)}.</p><p>${escaparHtml(dados.mensagem)}</p>`,
        }).catch((erro: unknown) => {
          console.error(`[notificacao] falha ao enviar para ${destinatario.email}:`, erro);
        });
      }
    }));
  } catch (erro) {
    console.error(`[notificacao] falha no evento ${evento}:`, erro);
  }
}

export async function dispararPrazoProximo(dias?: number, hoje = new Date()) {
  const configuracao = await prisma.configuracaoNotificacao.findUnique({ where: { id: 1 } });
  const antecedencia = dias ?? configuracao?.diasAntecedenciaPadrao ?? 7;
  const inicio = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));
  const fim = new Date(inicio);
  fim.setUTCDate(fim.getUTCDate() + antecedencia);
  const tarefas = await prisma.tarefa.findMany({
    where: {
      ativo: true,
      prazo: { gte: inicio, lte: fim },
      status: { not: "CONCLUIDO" },
      projeto: { ativo: true, cliente: { ativo: true } },
    },
    select: {
      id: true,
      nome: true,
      prazo: true,
      responsavel: { select: { usuario: { select: { id: true, ativo: true } } } },
    },
  });

  let processadas = 0;
  const administradores = await prisma.usuario.findMany({ where: { ativo: true, perfil: "ADMIN" }, select: { id: true } });
  for (const tarefa of tarefas) {
    const alvo = tarefa.responsavel?.usuario?.ativo
      ? [tarefa.responsavel.usuario.id]
      : administradores.map((administrador) => administrador.id);
    await dispararEventoNotificacao(EventoNotificacao.PRAZO_PROXIMO, {
      titulo: `Prazo próximo: ${tarefa.nome}`,
      mensagem: `A tarefa vence em ${tarefa.prazo?.toLocaleDateString("pt-BR")}.`,
      url: `/tarefas/${tarefa.id}`,
      entidadeId: tarefa.id,
      dedupeKey: `prazo:${tarefa.id}:${inicio.toISOString().slice(0, 10)}`,
      usuarioIds: alvo,
    });
    processadas += 1;
  }
  return { encontradas: tarefas.length, processadas };
}
