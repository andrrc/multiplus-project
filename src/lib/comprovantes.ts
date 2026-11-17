/**
 * Comprovantes do colaborador externo (etapa 1): anexar um arquivo (rascunho), remover o rascunho, listar o que já foi
 * anexado e abrir um arquivo. Quem pode anexar e quem pode ver é decidido no banco (função `registrar_arquivo_comprovante`
 * e RLS de `arquivos_comprovante`); este módulo confere o conteúdo do arquivo e cuida do storage. O envio em si, que
 * transforma os rascunhos em pedido de conclusão, é `solicitarConclusao` em `projetos-tarefas.ts`.
 */
import { comContextoDeUsuario, type ContextoUsuario } from "@/lib/prisma-app";
import { armazenarComprovante, lerObjeto, removerObjeto } from "@/lib/storage";
import {
  detectarTipoComprovante,
  EXTENSAO_POR_TIPO,
  nomeSeguroDoArquivo,
  validarTamanhoComprovante,
} from "@/lib/comprovantes-arquivos";

export type TipoItemComprovante = "TAREFA" | "SUBTAREFA";

const UM_DIA_MS = 24 * 60 * 60 * 1000;

export type ArquivoAnexado = { id: string; nomeOriginal: string; tipo: string; tamanhoBytes: number };

export function interpretarTipoItem(valor: unknown): TipoItemComprovante {
  if (valor === "TAREFA" || valor === "SUBTAREFA") return valor;
  throw new Error("Tipo de item inválido.");
}

/**
 * Guarda o arquivo no bucket privado e o registra como rascunho do colaborador. O registro vem depois do storage e,
 * se o banco recusar (sem permissão, item fechado, limite), o objeto é removido: nada fica órfão.
 */
export async function anexarComprovante(ctx: ContextoUsuario, tipo: TipoItemComprovante, itemId: string, arquivo: File): Promise<ArquivoAnexado> {
  validarTamanhoComprovante(arquivo.size);
  const dados = Buffer.from(await arquivo.arrayBuffer());
  const nomeOriginal = nomeSeguroDoArquivo(arquivo.name);
  const mime = detectarTipoComprovante(dados, nomeOriginal);
  if (!mime) throw new Error("Formato não aceito. Envie foto, PDF, planilha ou documento.");

  await limparRascunhosAntigos(ctx);
  const chave = await armazenarComprovante(dados, mime, EXTENSAO_POR_TIPO[mime]);
  try {
    const id = await comContextoDeUsuario(ctx, async (tx) => {
      const linhas = await tx.$queryRaw<{ id: string }[]>`
        SELECT registrar_arquivo_comprovante(${tipo}, ${itemId}, ${chave}, ${nomeOriginal}, ${mime}, CAST(${dados.length} AS INTEGER)) AS id
      `;
      return linhas[0].id;
    });
    return { id, nomeOriginal, tipo: mime, tamanhoBytes: dados.length };
  } catch (erro) {
    await removerObjeto(chave).catch(() => undefined);
    throw erro;
  }
}

/** Rascunhos (anexados e ainda não enviados) do próprio colaborador neste item, do mais antigo para o mais novo. */
export async function listarRascunhosDoItem(ctx: ContextoUsuario, tipo: TipoItemComprovante, itemId: string): Promise<ArquivoAnexado[]> {
  return comContextoDeUsuario(ctx, (tx) => tx.arquivoComprovante.findMany({
    where: { solicitacaoId: null, enviadoPorId: ctx.usuarioId, ...(tipo === "TAREFA" ? { tarefaId: itemId } : { subtarefaId: itemId }) },
    select: { id: true, nomeOriginal: true, tipo: true, tamanhoBytes: true },
    orderBy: { enviadoEm: "asc" },
  }));
}

/** Remove um rascunho do próprio colaborador. Arquivo já enviado nunca é removido (a política de RLS também impede). */
export async function removerRascunho(ctx: ContextoUsuario, arquivoId: string): Promise<void> {
  const removido = await comContextoDeUsuario(ctx, async (tx) => {
    const atual = await tx.arquivoComprovante.findFirst({ where: { id: arquivoId, solicitacaoId: null, enviadoPorId: ctx.usuarioId }, select: { chave: true } });
    if (!atual) return null;
    const { count } = await tx.arquivoComprovante.deleteMany({ where: { id: arquivoId, solicitacaoId: null, enviadoPorId: ctx.usuarioId } });
    return count === 1 ? atual.chave : null;
  });
  if (removido) await removerObjeto(removido).catch(() => undefined);
}

/** Descarta os rascunhos do colaborador parados há mais de um dia (envio abandonado), no banco e no storage. */
async function limparRascunhosAntigos(ctx: ContextoUsuario): Promise<void> {
  const limite = new Date(Date.now() - UM_DIA_MS);
  const chaves = await comContextoDeUsuario(ctx, async (tx) => {
    const antigos = await tx.arquivoComprovante.findMany({ where: { solicitacaoId: null, enviadoPorId: ctx.usuarioId, enviadoEm: { lt: limite } }, select: { id: true, chave: true } });
    if (antigos.length === 0) return [];
    await tx.arquivoComprovante.deleteMany({ where: { id: { in: antigos.map((a) => a.id) }, solicitacaoId: null, enviadoPorId: ctx.usuarioId } });
    return antigos.map((a) => a.chave);
  });
  await Promise.all(chaves.map((chave) => removerObjeto(chave).catch(() => undefined)));
}

/**
 * Abre um arquivo para a rota de leitura. A consulta passa pela RLS: quem não pode ver o arquivo recebe `null`, igual a
 * um arquivo que não existe (a rota responde 404 nos dois casos).
 */
export async function abrirArquivoComprovante(ctx: ContextoUsuario, arquivoId: string): Promise<{ dados: Buffer; tipo: string; nomeOriginal: string } | null> {
  const arquivo = await comContextoDeUsuario(ctx, (tx) => tx.arquivoComprovante.findUnique({ where: { id: arquivoId }, select: { chave: true, tipo: true, nomeOriginal: true } }));
  if (!arquivo) return null;
  return { dados: await lerObjeto(arquivo.chave), tipo: arquivo.tipo, nomeOriginal: arquivo.nomeOriginal };
}
