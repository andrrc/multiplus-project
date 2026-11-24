import type { Prisma } from "@prisma/client";
import { comContextoDeUsuario, type ContextoUsuario } from "@/lib/prisma-app";

const camposComprovante = {
  comprovanteExigido: true,
  comprovanteQuantidade: true,
  comprovanteInstrucoes: true,
} as const;

const camposOrigem = {
  clienteId: true,
  nome: true,
  descricao: true,
  tarefas: {
    where: { ativo: true },
    orderBy: { numeroLocal: "asc" },
    select: {
      nome: true,
      descricao: true,
      diasAntecedencia: true,
      colaboradorPodeCriarSubtarefas: true,
      ...camposComprovante,
      subtarefas: {
        where: { ativo: true },
        orderBy: { numeroLocal: "asc" },
        select: { titulo: true, descricao: true, etiquetas: true, ...camposComprovante },
      },
    },
  },
} satisfies Prisma.ProjetoSelect;

type Origem = Prisma.ProjetoGetPayload<{ select: typeof camposOrigem }>;

export function nomeDoProjetoDuplicado(nomeOriginal: string) {
  return `Cópia de ${nomeOriginal}`;
}

export function prepararCopiaDoProjeto(origem: Origem, usuarioId: string) {
  return {
    projeto: {
      clienteId: origem.clienteId,
      nome: nomeDoProjetoDuplicado(origem.nome),
      descricao: origem.descricao,
    },
    tarefas: origem.tarefas.map((tarefa) => ({
      dados: {
        nome: tarefa.nome,
        descricao: tarefa.descricao,
        diasAntecedencia: tarefa.diasAntecedencia,
        colaboradorPodeCriarSubtarefas: tarefa.colaboradorPodeCriarSubtarefas,
        comprovanteExigido: tarefa.comprovanteExigido,
        comprovanteQuantidade: tarefa.comprovanteQuantidade,
        comprovanteInstrucoes: tarefa.comprovanteInstrucoes,
        criadoPorId: usuarioId,
      },
      subtarefas: tarefa.subtarefas.map((subtarefa) => ({
        titulo: subtarefa.titulo,
        descricao: subtarefa.descricao,
        etiquetas: subtarefa.etiquetas,
        comprovanteExigido: subtarefa.comprovanteExigido,
        comprovanteQuantidade: subtarefa.comprovanteQuantidade,
        comprovanteInstrucoes: subtarefa.comprovanteInstrucoes,
        criadoPorId: usuarioId,
      })),
    })),
  };
}

export class ProjetoIndisponivelParaDuplicacao extends Error {
  constructor() {
    super("Projeto ativo não encontrado neste cliente.");
  }
}

export async function duplicarProjeto(ctx: ContextoUsuario, projetoId: string, clienteId: string) {
  if (ctx.perfil !== "ADMIN") throw new Error("Ação restrita ao Administrador.");
  if (typeof projetoId !== "string" || !projetoId.trim() || typeof clienteId !== "string" || !clienteId.trim()) {
    throw new ProjetoIndisponivelParaDuplicacao();
  }

  return comContextoDeUsuario(ctx, async (tx) => {
    const origem = await tx.projeto.findFirst({
      where: { id: projetoId, clienteId, ativo: true, cliente: { ativo: true } },
      select: camposOrigem,
    });
    if (!origem) throw new ProjetoIndisponivelParaDuplicacao();

    const copia = prepararCopiaDoProjeto(origem, ctx.usuarioId);
    const projeto = await tx.projeto.create({
      data: copia.projeto,
      select: { id: true, clienteId: true },
    });

    // Os valores padrão definem os status iniciais. O banco atribui a numeração e o nome do autor.
    for (const tarefa of copia.tarefas) {
      const { id: tarefaId } = await tx.tarefa.create({
        data: { ...tarefa.dados, projetoId: projeto.id },
        select: { id: true },
      });
      if (tarefa.subtarefas.length > 0) {
        await tx.subtarefa.createMany({
          data: tarefa.subtarefas.map((subtarefa) => ({ ...subtarefa, tarefaId })),
        });
      }
    }

    return projeto;
  });
}
