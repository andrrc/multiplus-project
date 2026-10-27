/**
 * Biblioteca de domínio `comentarios`. Reúne funções reutilizáveis desta área; os comentários junto às funções explicam validações, decisões e efeitos específicos de cada operação.
 */
import { comContextoDeUsuario, type ContextoUsuario } from "@/lib/prisma-app";
import { prisma } from "@/lib/prisma";
import { armazenarImagemComentario, removerImagemComentario } from "@/lib/storage";
import { Perfil } from "@prisma/client";
import { validarUrlHttp } from "@/lib/validacao-url";

export type AlvoComentario =
  | { projetoId: string; tarefaId?: never; subtarefaId?: never }
  | { tarefaId: string; projetoId?: never; subtarefaId?: never }
  | { subtarefaId: string; projetoId?: never; tarefaId?: never };

export type UsuarioMencionavel = { id: string; nome: string; perfil: Perfil };

async function obterEscopoDoAlvo(ctx: ContextoUsuario, alvo: AlvoComentario) {
  // A consulta respeita o contexto RLS e retorna apenas o projeto/cliente ao qual o comentário se vincula.
  return comContextoDeUsuario(ctx, async (tx) => {
    if ("projetoId" in alvo) {
      const projeto = await tx.projeto.findFirst({
        where: { id: alvo.projetoId, ativo: true },
        select: { id: true, clienteId: true, cliente: { select: { ativo: true } }, tarefas: { where: { ativo: true }, select: { id: true } } },
      });
      return projeto ? { projetoId: projeto.id, clienteId: projeto.clienteId, clienteAtivo: projeto.cliente.ativo, tarefaIds: projeto.tarefas.map((t) => t.id) } : null;
    }
    if ("tarefaId" in alvo) {
      const tarefa = await tx.tarefa.findFirst({
        where: { id: alvo.tarefaId, ativo: true, projeto: { ativo: true } },
        select: { id: true, projeto: { select: { id: true, clienteId: true, cliente: { select: { ativo: true } } } } },
      });
      return tarefa ? { projetoId: tarefa.projeto.id, clienteId: tarefa.projeto.clienteId, clienteAtivo: tarefa.projeto.cliente.ativo, tarefaIds: [tarefa.id] } : null;
    }
    const subtarefa = await tx.subtarefa.findFirst({
      where: { id: alvo.subtarefaId, ativo: true, tarefa: { ativo: true, projeto: { ativo: true } } },
      select: { tarefa: { select: { id: true, projeto: { select: { id: true, clienteId: true, cliente: { select: { ativo: true } } } } } } },
    });
    return subtarefa ? { projetoId: subtarefa.tarefa.projeto.id, clienteId: subtarefa.tarefa.projeto.clienteId, clienteAtivo: subtarefa.tarefa.projeto.cliente.ativo, tarefaIds: [subtarefa.tarefa.id] } : null;
  });
}

/** Retorna apenas usuários ativos que também têm acesso ao registro comentado. */
export async function listarUsuariosMencionaveis(ctx: ContextoUsuario, alvo: AlvoComentario): Promise<UsuarioMencionavel[]> {
  // Primeiro resolve o alvo e seus vínculos ativos para montar a mesma fronteira de acesso do registro.
  const escopo = await obterEscopoDoAlvo(ctx, alvo);
  if (!escopo) return [];
  // A consulta usa a role de serviço para listar nomes, mas restringe cada perfil ao vínculo do alvo.
  const usuarios = await prisma.usuario.findMany({
    where: {
      ativo: true,
      OR: [
        { perfil: Perfil.ADMIN },
        ...(escopo.clienteAtivo ? [
          { perfil: Perfil.ADMIN_INTERNO, atribuicoes: { some: { entidadeTipo: "PROJETO" as const, entidadeId: escopo.projetoId } } },
          ...(escopo.tarefaIds.length ? [{ perfil: Perfil.ADMIN_EXTERNO, atribuicoes: { some: { entidadeTipo: "TAREFA" as const, entidadeId: { in: escopo.tarefaIds } } } }] : []),
          { perfil: Perfil.CLIENTE, clienteId: escopo.clienteId },
        ] : []),
      ],
    },
    select: { id: true, nome: true, perfil: true },
    orderBy: { nome: "asc" },
  });
  // O autor não aparece como destinatário possível de uma menção a si mesmo.
  return usuarios.filter((usuario) => usuario.id !== ctx.usuarioId);
}

export async function listarComentarios(ctx: ContextoUsuario, alvo: AlvoComentario) {
  // A RLS decide quais comentários do alvo o usuário atual pode consultar.
  const comentarios = await comContextoDeUsuario(ctx, (tx) =>
    tx.comentario.findMany({
      where: alvo,
      include: { autor: { select: { nome: true, perfil: true } } },
      orderBy: { criadoEm: "asc" },
    }),
  );
  // Busca nomes apenas para os ids citados e remove repetições antes da consulta.
  const usuarioIds = [...new Set(comentarios.flatMap((comentario) => comentario.mencoesUsuarioIds))];
  const usuarios = usuarioIds.length
    ? await prisma.usuario.findMany({ where: { id: { in: usuarioIds } }, select: { id: true, nome: true } })
    : [];
  const nomesPorId = new Map(usuarios.map((usuario) => [usuario.id, usuario.nome]));
  // Converte os ids salvos em nomes atuais e omite usuários que já não existem.
  return comentarios.map((comentario) => ({
    ...comentario,
    nomesMencionados: comentario.mencoesUsuarioIds.map((id) => nomesPorId.get(id)).filter((nome): nome is string => Boolean(nome)),
  }));
}

export async function criarComentario(ctx: ContextoUsuario, alvo: AlvoComentario, texto: string, link?: string | null, imagem?: File | null, mencoesUsuarioIds: string[] = []) {
  // Remove espaços externos e exige conteúdo textual, mesmo quando há link ou imagem.
  const conteudo = texto.trim();
  if (!conteudo) throw new Error("Escreva um comentário antes de publicar.");
  const url = link?.trim() || null;
  // Links são validados também no servidor antes de serem persistidos.
  const urlValidada = url ? validarUrlHttp(url) : null;
  // Uma mesma pessoa mencionada várias vezes gera apenas uma notificação.
  const mencoesUnicas = [...new Set(mencoesUsuarioIds)];
  if (mencoesUnicas.length) {
    // O cliente não pode forjar ids de usuários sem acesso ao projeto, tarefa ou subtarefa.
    const usuariosMencionaveis = await listarUsuariosMencionaveis(ctx, alvo);
    const porId = new Map(usuariosMencionaveis.map((usuario) => [usuario.id, usuario]));
    if (mencoesUnicas.some((id) => !porId.has(id))) throw new Error("Uma das pessoas mencionadas não tem acesso a este registro.");
    if (mencoesUnicas.some((id) => !conteudo.includes(`@${porId.get(id)!.nome}`))) throw new Error("Mantenha o nome da pessoa mencionada no comentário.");
  }
  let imagemChave: string | null = null;
  // O armazenamento externo ocorre antes da gravação e devolve uma chave, não uma URL pública.
  if (imagem && imagem.size > 0) imagemChave = (await armazenarImagemComentario(imagem)).chave;
  try {
    // O comentário e suas menções são gravados dentro da transação protegida por RLS.
    return await comContextoDeUsuario(ctx, (tx) => tx.comentario.create({
      data: { ...alvo, texto: conteudo, link: urlValidada, imagemChave, autorId: ctx.usuarioId, mencoesUsuarioIds: mencoesUnicas },
    }));
  } catch (erro) {
    // Se a gravação falhar, remove a imagem órfã para manter banco e storage sincronizados.
    if (imagemChave) await removerImagemComentario(imagemChave).catch(() => undefined);
    throw erro;
  }
}
