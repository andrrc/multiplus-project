import type { Prisma } from "@prisma/client";

/**
 * Etapa 2 dos comprovantes: o prazo para de contar enquanto um envio com comprovante aguarda conferência.
 * Análise aprovada: docs/analises/comprovantes-etapa2-prazo.md.
 *
 * "Em conferência" é derivado do pedido de conclusão, sem coluna nova: existe um pedido PENDENTE com pelo menos um arquivo.
 * Pedido sem arquivo (item que não exige comprovante) continua contando prazo, e pedido devolvido (REJEITADA) ou retirado
 * (CANCELADA) deixa de ser pendente, então o prazo volta a contar na hora, com a mesma data. A pausa vale só para o item que
 * recebeu o pedido: o pedido de uma subtarefa não pausa a tarefa-mãe. Toda conta de atraso, semáforo, agenda, painel, PDF,
 * "cliente com atraso" e aviso de prazo passa por aqui para as telas não divergirem.
 */

const FUSO_HORARIO = "America/Sao_Paulo";

/** Pedido de conclusão como as consultas o entregam: com a contagem de arquivos ou a própria lista deles. */
export type PedidoParaPrazo = {
  status: string;
  solicitadoEm: Date;
  _count?: { arquivos: number };
  arquivos?: readonly unknown[];
};

/**
 * Instante do envio quando o item está em conferência (pedido pendente com arquivos); `null` quando o prazo segue contando.
 * `solicitadoEm` vem do relógio do banco (default da coluna), nunca do aparelho do colaborador.
 */
export function emConferenciaDesde(pedidos: readonly PedidoParaPrazo[] | null | undefined): Date | null {
  const pedido = pedidos?.find((candidato) => candidato.status === "PENDENTE" && (candidato._count?.arquivos ?? candidato.arquivos?.length ?? 0) > 0);
  return pedido ? pedido.solicitadoEm : null;
}

/** "Enviado em 12/11": o dia do envio no horário de Brasília (o instante real, não uma data civil gravada em UTC). */
export function rotuloEnviadoEm(enviadoEm: Date): string {
  const dia = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: FUSO_HORARIO }).format(enviadoEm);
  return `Enviado em ${dia}`;
}

/**
 * Seleção do pedido que decide a pausa, para as consultas que listam itens. Basta o pendente (há no máximo um por item,
 * índice único parcial); o pedido devolvido ou retirado não pausa nada.
 */
export const PEDIDO_PENDENTE_PARA_PRAZO = {
  where: { status: "PENDENTE" },
  select: { status: true, solicitadoEm: true, _count: { select: { arquivos: true } } },
  take: 1,
} satisfies Prisma.Tarefa$solicitacoesConclusaoArgs;

/** Filtro de consulta: o item NÃO está em conferência (o prazo dele conta). Para `idsDeClientesComAtraso` e para o job de avisos. */
export const SEM_CONFERENCIA_EM_ANDAMENTO = {
  solicitacoesConclusao: { none: { status: "PENDENTE", arquivos: { some: {} } } },
} satisfies Prisma.TarefaWhereInput & Prisma.SubtarefaWhereInput;
