/** RF-051 / RF-039 — laudo privado, histórico editável e desativação por herança. */
import type { Prisma } from "@prisma/client";
import { comContextoDeUsuario, type ContextoUsuario } from "@/lib/prisma-app";
import { validarDadosLaudo, validarAnotacaoLaudo, normalizarPaginaLaudo, type DadosLaudoInput, type DadosAnotacaoInput } from "@/lib/validacao-laudo";

function exigirAdmin(ctx: ContextoUsuario) {
  if (ctx.perfil !== "ADMIN") throw new Error("RF-051: laudo técnico restrito ao Administrador.");
}
const conflito = () => new Error("Este registro foi alterado em outra sessão. Seu conteúdo foi preservado; recarregue a página antes de tentar novamente.");

export async function listarResponsaveisLaudo(ctx: ContextoUsuario) {
  exigirAdmin(ctx);
  return comContextoDeUsuario(ctx, (tx) => tx.usuario.findMany({ where: { ativo: true, perfil: { in: ["ADMIN", "ADMIN_INTERNO"] } }, select: { id: true, nome: true, ativo: true, perfil: true }, orderBy: { nome: "asc" } }));
}

/** Participa da transação do cliente: ausência do campo não altera registros existentes. */
export async function salvarLaudoNaTransacao(tx: Prisma.TransactionClient, ctx: ContextoUsuario, clienteId: string, dados?: DadosLaudoInput) {
  if (dados === undefined) return;
  exigirAdmin(ctx);
  validarDadosLaudo(dados);
  const atual = await tx.laudoTecnico.findUnique({ where: { clienteId } });
  if (atual && atual.versao !== dados.versao) throw conflito();
  if (!atual && dados.versao !== undefined) throw conflito();
  if (!dados.possui && !atual) return;
  if (dados.possui && (!atual || atual.responsavelId !== dados.responsavelId)) {
    const responsavel = await tx.usuario.findFirst({ where: { id: dados.responsavelId, ativo: true, perfil: { in: ["ADMIN", "ADMIN_INTERNO"] } } });
    if (!responsavel) throw new Error("Responsável deve ser integrante ativo da equipe interna.");
  }
  if (!atual) {
    await tx.laudoTecnico.create({ data: { clienteId, nome: dados.nome!.trim(), tipo: dados.tipo!, responsavelId: dados.responsavelId! } });
    return;
  }
  // Reativação primeiro, preservando conteúdo; edição seguinte usa a versão recém-obtida.
  let versao = atual.versao;
  if (dados.possui && !atual.ativo) {
    const reativado = await tx.laudoTecnico.updateMany({ where: { id: atual.id, versao }, data: { ativo: true, versao: { increment: 1 }, desativadoEm: null, desativadoPor: null } });
    if (reativado.count !== 1) throw conflito();
    versao++;
  }
  if (!dados.possui && !atual.ativo) return;
  const resultado = await tx.laudoTecnico.updateMany({ where: { id: atual.id, versao }, data: dados.possui
    ? { nome: dados.nome!.trim(), tipo: dados.tipo!, responsavelId: dados.responsavelId!, versao: { increment: 1 } }
    : { ativo: false, versao: { increment: 1 }, desativadoEm: new Date(), desativadoPor: ctx.usuarioId } });
  if (resultado.count !== 1) throw conflito();
}

export async function buscarLaudoTecnico(ctx: ContextoUsuario, clienteId: string) {
  exigirAdmin(ctx);
  return comContextoDeUsuario(ctx, (tx) => tx.laudoTecnico.findUnique({ where: { clienteId }, include: { responsavel: { select: { id: true, nome: true, ativo: true, perfil: true } } } }));
}

export async function listarAnotacoesLaudo(ctx: ContextoUsuario, clienteId: string, laudoId: string, busca = "", desativados = false, pagina = 1) {
  exigirAdmin(ctx);
  return comContextoDeUsuario(ctx, async (tx) => {
    const where: Prisma.AnotacaoLaudoTecnicoWhereInput = { laudoId, laudo: { clienteId }, ...(desativados ? {} : { ativo: true }), ...(busca.trim() ? { OR: [{ texto: { contains: busca.trim(), mode: "insensitive" } }, { links: { some: { url: { contains: busca.trim(), mode: "insensitive" } } } }] } : {}) };
    const total = await tx.anotacaoLaudoTecnico.count({ where });
    const paginas = Math.max(1, Math.ceil(total / 20));
    const atual = Math.min(normalizarPaginaLaudo(pagina), paginas);
    const itens = await tx.anotacaoLaudoTecnico.findMany({ where, orderBy: [{ criadoEm: "desc" }, { id: "desc" }], skip: (atual - 1) * 20, take: 20, include: { autor: { select: { nome: true } }, links: { orderBy: { ordem: "asc" } } } });
    return { itens, total, pagina: atual, paginas };
  });
}

async function exigirLaudoAtivo(tx: Prisma.TransactionClient, clienteId: string, laudoId: string) {
  const laudo = await tx.laudoTecnico.findFirst({ where: { id: laudoId, clienteId }, include: { cliente: { select: { ativo: true } } } });
  if (!laudo) throw new Error("Laudo não encontrado para este cliente.");
  if (!laudo.ativo || !laudo.cliente.ativo) throw new Error("Cliente ou laudo desativado: somente leitura.");
}

export async function salvarAnotacaoLaudo(ctx: ContextoUsuario, clienteId: string, laudoId: string, dados: DadosAnotacaoInput, id?: string, versao?: number) {
  exigirAdmin(ctx);
  const { texto, links } = validarAnotacaoLaudo(dados);
  return comContextoDeUsuario(ctx, async (tx) => {
    await exigirLaudoAtivo(tx, clienteId, laudoId);
    if (!id) return tx.anotacaoLaudoTecnico.create({ data: { laudoId, texto, autorId: ctx.usuarioId, links: { create: links.map((url, ordem) => ({ url, ordem })) } } });
    const atual = await tx.anotacaoLaudoTecnico.findFirst({ where: { id, laudoId } });
    if (!atual) throw new Error("Anotação não encontrada para este laudo.");
    if (!atual.ativo) throw new Error("Anotação desativada: reative antes de editar.");
    if (atual.versao !== versao) throw conflito();
    const resultado = await tx.anotacaoLaudoTecnico.updateMany({ where: { id, laudoId, versao }, data: { texto, versao: { increment: 1 } } });
    if (resultado.count !== 1) throw conflito();
    await tx.linkAnotacaoLaudoTecnico.deleteMany({ where: { anotacaoId: id } });
    if (links.length) await tx.linkAnotacaoLaudoTecnico.createMany({ data: links.map((url, ordem) => ({ anotacaoId: id, url, ordem })) });
    return tx.anotacaoLaudoTecnico.findUniqueOrThrow({ where: { id } });
  });
}

export async function definirAnotacaoLaudoAtiva(ctx: ContextoUsuario, clienteId: string, laudoId: string, id: string, versao: number, ativo: boolean) {
  exigirAdmin(ctx);
  if (typeof ativo !== "boolean" || !Number.isSafeInteger(versao)) throw new Error("Estado ou versão inválido.");
  return comContextoDeUsuario(ctx, async (tx) => {
    await exigirLaudoAtivo(tx, clienteId, laudoId);
    const resultado = await tx.anotacaoLaudoTecnico.updateMany({ where: { id, laudoId, versao }, data: { ativo, versao: { increment: 1 }, desativadoEm: ativo ? null : new Date(), desativadoPor: ativo ? null : ctx.usuarioId } });
    if (resultado.count !== 1) throw conflito();
  });
}
