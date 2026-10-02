import type { Prisma } from "@prisma/client";
import { comContextoDeUsuario, type ContextoUsuario } from "@/lib/prisma-app";
import { calcularPercentualConclusao } from "@/lib/regras-projetos-tarefas";

function exigirCliente(ctx: ContextoUsuario) {
  if (ctx.perfil !== "CLIENTE") throw new Error("Visão exclusiva do cliente.");
}

async function contarSubtarefas(tx: Prisma.TransactionClient, tarefaId: string) {
  const rows = await tx.$queryRaw<Array<{ total: number; concluidas: number }>>`SELECT * FROM contar_subtarefas_portal(${tarefaId})`;
  return rows[0] ?? { total: 0, concluidas: 0 };
}

async function nomeResponsavel(tx: Prisma.TransactionClient, tarefaId: string) {
  const rows = await tx.$queryRaw<Array<{ nome: string | null }>>`SELECT responsavel_nome_portal(${tarefaId}) AS nome`;
  return rows[0]?.nome ?? null;
}

export async function listarProjetosPortal(ctx: ContextoUsuario) {
  exigirCliente(ctx);
  return comContextoDeUsuario(ctx, async (tx) => {
    const usuario = await tx.usuario.findUnique({ where: { id: ctx.usuarioId }, select: { clienteId: true } });
    if (!usuario?.clienteId) return [];
    const projetos = await tx.projeto.findMany({
      where: { clienteId: usuario.clienteId, ativo: true, cliente: { ativo: true } },
      select: {
        id: true, nome: true, status: true, dataInicio: true, dataPrevistaConclusao: true,
        tarefas: { where: { ativo: true }, select: { id: true, status: true, ativo: true } },
      },
      orderBy: [{ atualizadoEm: "desc" }, { id: "asc" }],
    });
    const comAtividade = await Promise.all(projetos.map(async (projeto) => {
      const atualizacoes = await tx.$queryRaw<Array<{ em: Date | null }>>`SELECT ultima_atualizacao_portal(${projeto.id}) AS em`;
      const conclusao = calcularPercentualConclusao(projeto.tarefas);
      return { ...projeto, ultimaAtualizacao: atualizacoes[0]?.em ?? null, conclusao };
    }));
    return comAtividade.sort((a, b) => (b.ultimaAtualizacao?.getTime() ?? 0) - (a.ultimaAtualizacao?.getTime() ?? 0));
  });
}

export async function buscarProjetoPortal(ctx: ContextoUsuario, projetoId: string) {
  exigirCliente(ctx);
  return comContextoDeUsuario(ctx, async (tx) => {
    const usuario = await tx.usuario.findUnique({ where: { id: ctx.usuarioId }, select: { clienteId: true } });
    if (!usuario?.clienteId) return null;
    const projeto = await tx.projeto.findFirst({
      where: { id: projetoId, clienteId: usuario.clienteId, ativo: true, cliente: { ativo: true } },
      select: {
        id: true, nome: true, status: true, dataInicio: true, dataPrevistaConclusao: true,
        documentos: { where: { ativo: true }, select: { id: true, nome: true, link: true }, orderBy: { criadoEm: "desc" } },
        cliente: { select: { documentos: { where: { ativo: true, projetoId: null }, select: { id: true, nome: true, link: true }, orderBy: { criadoEm: "desc" } } } },
        tarefas: {
          where: { ativo: true },
          select: { id: true, nome: true, prazo: true, status: true, ativo: true },
          orderBy: [{ prazo: "asc" }, { nome: "asc" }],
        },
      },
    });
    if (!projeto) return null;
    const [ultimaAtualizacao, tarefas] = await Promise.all([
      tx.$queryRaw<Array<{ em: Date | null }>>`SELECT ultima_atualizacao_portal(${projeto.id}) AS em`,
      Promise.all(projeto.tarefas.map(async (tarefa) => {
        const [contagem, responsavel] = await Promise.all([contarSubtarefas(tx, tarefa.id), nomeResponsavel(tx, tarefa.id)]);
        const progresso = contagem.total === 0
          ? calcularPercentualConclusao([{ ativo: tarefa.ativo, status: tarefa.status }])
          : { total: contagem.total, concluidas: contagem.concluidas, percentual: Math.round((contagem.concluidas / contagem.total) * 100) };
        return { ...tarefa, responsavel, progresso };
      })),
    ]);
    const conclusao = calcularPercentualConclusao(projeto.tarefas);
    return {
      ...projeto,
      tarefas,
      conclusao,
      ultimaAtualizacao: ultimaAtualizacao[0]?.em ?? null,
      documentos: [...projeto.documentos, ...projeto.cliente.documentos],
    };
  });
}
