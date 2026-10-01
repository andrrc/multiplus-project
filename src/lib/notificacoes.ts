import { EventoNotificacao } from "@prisma/client";
import { enviarEmail } from "@/lib/email";
import { renderTemplateMencaoComentario, renderTemplateNotificacao } from "@/lib/email-templates";
import { prisma } from "@/lib/prisma";
import { comContextoDeUsuario, type ContextoUsuario } from "@/lib/prisma-app";

type DadosEvento = {
  titulo: string;
  mensagem: string;
  url?: string | null;
  entidadeId?: string | null;
  dedupeKey?: string | null;
  usuarioIds: string[];
};

type Destinatario = {
  id: string;
  nome: string;
  email: string;
  preferenciasNotificacao: { email: boolean; inApp: boolean }[];
};

async function listarDestinatarios(evento: EventoNotificacao, usuarioIds: string[]) {
  if (usuarioIds.length === 0) return [];
  const preferencias = await prisma.preferenciaNotificacao.findMany({
    where: { evento, OR: [{ email: true }, { inApp: true }] },
  });
  const perfis = preferencias.map((preferencia) => preferencia.perfil);
  const usuarios = await prisma.usuario.findMany({
    where: {
      ativo: true,
      id: { in: [...new Set(usuarioIds)] },
      perfil: { in: perfis },
    },
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
    },
  });
  return usuarios.map((usuario) => ({
    ...usuario,
    preferenciasNotificacao: preferencias.filter((preferencia) => preferencia.perfil === usuario.perfil),
  }));
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
          html: renderTemplateNotificacao(evento, {
            nome: destinatario.nome,
            titulo: dados.titulo,
            mensagem: dados.mensagem,
            url: dados.url,
          }),
        }).catch((erro: unknown) => {
          console.error(`[notificacao] falha ao enviar para ${destinatario.email}:`, erro);
        });
      }
    }));
  } catch (erro) {
    console.error(`[notificacao] falha no evento ${evento}:`, erro);
  }
}

/** Menções são direcionadas, mas respeitam os canais de NOVO_COMENTARIO do perfil. */
export async function dispararNotificacoesMencaoComentario(dados: { destinatarioIds: string[]; autorId: string; comentario: string; url: string; entidadeId: string }) {
  try {
    const ids = [...new Set(dados.destinatarioIds)];
    if (!ids.length) return;
    const usuarios = await prisma.usuario.findMany({ where: { id: { in: ids }, ativo: true }, select: { id: true, nome: true, email: true, perfil: true } });
    const autor = await prisma.usuario.findUnique({ where: { id: dados.autorId }, select: { nome: true } });
    const preferencias = await prisma.preferenciaNotificacao.findMany({ where: { evento: EventoNotificacao.NOVO_COMENTARIO } });
    await Promise.all(usuarios.map(async (usuario) => {
      const preferencia = preferencias.find((item) => item.perfil === usuario.perfil);
      if (!preferencia) return;
      const eAutor = usuario.id === dados.autorId;
      const titulo = eAutor ? "Menção enviada em comentário" : "Você foi mencionado em um comentário";
      const mensagem = eAutor ? "Esta confirmação registra a publicação da menção no comentário." : `${autor?.nome ?? "Alguém"} mencionou você em um comentário.`;
      if (preferencia.inApp) {
        await prisma.notificacao.create({
          data: {
            usuarioId: usuario.id,
            evento: EventoNotificacao.NOVO_COMENTARIO,
            titulo,
            mensagem,
            url: dados.url,
            entidadeId: dados.entidadeId,
            dedupeKey: `mencao:${dados.entidadeId}:${usuario.id}`,
          },
        }).catch((erro: unknown) => {
          if ((erro as { code?: string }).code !== "P2002") throw erro;
        });
      }
      if (preferencia.email) {
        await enviarEmail({
          to: usuario.email,
          subject: titulo,
          html: renderTemplateMencaoComentario({ nome: usuario.nome, titulo, mensagem, autor: autor?.nome ?? "Usuário", comentario: dados.comentario, url: dados.url }),
        }).catch((erro: unknown) => console.error(`[mencao] falha ao enviar para ${usuario.email}:`, erro));
      }
    }));
  } catch (erro) {
    console.error("[mencao] falha ao preparar e-mails de comentário:", erro);
  }
}

/** O perfil ADMIN representa a conta da Talita, destinatária dos avisos de conclusão. */
export async function listarAdministradoresAtivos(): Promise<string[]> {
  const administradores = await prisma.usuario.findMany({
    where: { ativo: true, perfil: "ADMIN" },
    select: { id: true },
  });
  return administradores.map(({ id }) => id);
}

/** Dispara ATRIBUICAO_RECEBIDA conforme a preferência do usuário atribuído. */
export async function dispararNotificacaoAtribuicaoRecebida(usuarioId: string, entidadeTipo: "PROJETO" | "TAREFA" | "SUBTAREFA", entidadeId: string) {
  try {
    const registro = entidadeTipo === "PROJETO"
      ? await prisma.projeto.findUnique({ where: { id: entidadeId }, select: { nome: true } })
      : entidadeTipo === "TAREFA"
      ? await prisma.tarefa.findUnique({ where: { id: entidadeId }, select: { nome: true } })
      : await prisma.subtarefa.findUnique({ where: { id: entidadeId }, select: { titulo: true, tarefaId: true } });
    if (!registro) return;
    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { perfil: true } });
    if (!usuario) return;
    const nome = "nome" in registro ? registro.nome : registro.titulo;
    let url: string;
    if (entidadeTipo === "PROJETO") {
      url = `${usuario.perfil === "ADMIN" ? "/projetos" : "/meus-projetos"}/${entidadeId}`;
    } else if (entidadeTipo === "TAREFA") {
      url = `${usuario.perfil === "ADMIN" ? "/tarefas" : "/minhas-tarefas"}/${entidadeId}`;
    } else {
      if (!("tarefaId" in registro)) return;
      url = usuario.perfil === "ADMIN"
        ? `/tarefas/${registro.tarefaId}?subtarefa=${entidadeId}#subtarefa-${entidadeId}`
        : `/minhas-tarefas/${registro.tarefaId}`;
    }
    await dispararEventoNotificacao(EventoNotificacao.ATRIBUICAO_RECEBIDA, {
      titulo: `Nova atribuição: ${nome}`,
      mensagem: entidadeTipo === "PROJETO" ? "Você recebeu acesso a um projeto." : entidadeTipo === "TAREFA" ? "Você recebeu uma tarefa." : "Você recebeu uma subtarefa.",
      url,
      entidadeId,
      usuarioIds: [usuarioId],
    });
  } catch (erro) {
    console.error(`[notificacao] falha ao preparar atribuição ${entidadeTipo}:${entidadeId}:`, erro);
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
      status: { notIn: ["CONCLUIDO", "CANCELADO"] },
      projeto: { ativo: true, cliente: { ativo: true } },
    },
    select: {
      id: true,
      nome: true,
      prazo: true,
      responsavel: { select: { usuario: { select: { id: true, ativo: true } } } },
      responsavelUsuario: { select: { id: true, ativo: true } },
    },
  });

  let processadas = 0;
  const administradores = await prisma.usuario.findMany({ where: { ativo: true, perfil: "ADMIN" }, select: { id: true } });
  for (const tarefa of tarefas) {
    const alvo = tarefa.responsavelUsuario?.ativo
      ? [tarefa.responsavelUsuario.id]
      : tarefa.responsavel?.usuario?.ativo
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

export async function listarNotificacoes(ctx: ContextoUsuario) {
  return comContextoDeUsuario(ctx, async (tx) => {
    const [itens, naoLidas] = await Promise.all([
      tx.notificacao.findMany({ where: { usuarioId: ctx.usuarioId }, orderBy: { criadaEm: "desc" }, take: 50 }),
      tx.notificacao.count({ where: { usuarioId: ctx.usuarioId, lida: false } }),
    ]);
    return { itens, naoLidas };
  });
}

export async function marcarNotificacaoLida(ctx: ContextoUsuario, id: string) {
  return comContextoDeUsuario(ctx, (tx) => tx.notificacao.updateMany({ where: { id, usuarioId: ctx.usuarioId }, data: { lida: true } }));
}

export async function marcarTodasNotificacoesLidas(ctx: ContextoUsuario) {
  return comContextoDeUsuario(ctx, (tx) => tx.notificacao.updateMany({ where: { usuarioId: ctx.usuarioId, lida: false }, data: { lida: true } }));
}

export async function listarPreferenciasNotificacao(ctx: ContextoUsuario) {
  if (ctx.perfil !== "ADMIN") throw new Error("Ação restrita ao Administrador.");
  return comContextoDeUsuario(ctx, (tx) => tx.preferenciaNotificacao.findMany({ orderBy: [{ perfil: "asc" }, { evento: "asc" }] }));
}

export async function atualizarPreferenciaNotificacao(ctx: ContextoUsuario, perfil: "ADMIN" | "ADMIN_INTERNO" | "ADMIN_EXTERNO" | "CLIENTE", evento: EventoNotificacao, canais: { email: boolean; inApp: boolean }) {
  if (ctx.perfil !== "ADMIN") throw new Error("Ação restrita ao Administrador.");
  return comContextoDeUsuario(ctx, (tx) => tx.preferenciaNotificacao.update({ where: { perfil_evento: { perfil, evento } }, data: canais }));
}
