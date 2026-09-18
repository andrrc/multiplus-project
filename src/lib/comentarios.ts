import { comContextoDeUsuario, type ContextoUsuario } from "@/lib/prisma-app";
import { armazenarImagemComentario, removerImagemComentario } from "@/lib/storage";

export type AlvoComentario =
  | { projetoId: string; tarefaId?: never; subtarefaId?: never }
  | { tarefaId: string; projetoId?: never; subtarefaId?: never }
  | { subtarefaId: string; projetoId?: never; tarefaId?: never };

export async function listarComentarios(ctx: ContextoUsuario, alvo: AlvoComentario) {
  return comContextoDeUsuario(ctx, (tx) =>
    tx.comentario.findMany({
      where: alvo,
      include: { autor: { select: { nome: true, perfil: true } } },
      orderBy: { criadoEm: "asc" },
    }),
  );
}

export async function criarComentario(ctx: ContextoUsuario, alvo: AlvoComentario, texto: string, link?: string | null, imagem?: File | null) {
  const conteudo = texto.trim();
  if (!conteudo) throw new Error("Escreva um comentário antes de publicar.");
  const url = link?.trim() || null;
  if (url) {
    try { new URL(url); } catch { throw new Error("Informe um link válido."); }
  }
  let imagemChave: string | null = null;
  if (imagem && imagem.size > 0) imagemChave = (await armazenarImagemComentario(imagem)).chave;
  try {
    return await comContextoDeUsuario(ctx, (tx) => tx.comentario.create({
      data: { ...alvo, texto: conteudo, link: url, imagemChave, autorId: ctx.usuarioId },
    }));
  } catch (erro) {
    if (imagemChave) await removerImagemComentario(imagemChave).catch(() => undefined);
    throw erro;
  }
}
