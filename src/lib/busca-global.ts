/**
 * Busca geral da barra superior (protótipos da administração e do colaborador interno): procura clientes,
 * projetos e tarefas pelo nome. A consulta roda com o contexto do usuário, então a RLS entrega à administração
 * tudo o que está ativo e ao colaborador interno só o que está no escopo dele. Devolve apenas identificador e
 * nomes, sem dado cadastral nem financeiro. O colaborador externo e o cliente não têm busca.
 */
import { comContextoDeUsuario, type ContextoUsuario } from "@/lib/prisma-app";

export const LIMITE_RESULTADOS_BUSCA = 8;
const TAMANHO_MINIMO = 2;
const TAMANHO_MAXIMO = 100;

export type ResultadoBusca = {
  termo: string;
  clientes: Array<{ id: string; razaoSocial: string }>;
  projetos: Array<{ id: string; nome: string; cliente: { razaoSocial: string } }>;
  tarefas: Array<{ id: string; nome: string; projeto: { nome: string } }>;
};

/** Termo normalizado, ou `null` quando é curto demais para buscar (evita listar o sistema inteiro). */
export function normalizarTermoBusca(termo: string | undefined): string | null {
  const limpo = (termo ?? "").trim().replace(/\s+/g, " ").slice(0, TAMANHO_MAXIMO);
  return limpo.length >= TAMANHO_MINIMO ? limpo : null;
}

export async function buscarNoSistema(ctx: ContextoUsuario, termoBruto: string | undefined): Promise<ResultadoBusca> {
  if (ctx.perfil !== "ADMIN" && ctx.perfil !== "ADMIN_INTERNO") {
    throw new Error("Busca disponível somente para a administração e o colaborador interno.");
  }
  const termo = normalizarTermoBusca(termoBruto);
  if (!termo) return { termo: (termoBruto ?? "").trim(), clientes: [], projetos: [], tarefas: [] };
  const contem = { contains: termo, mode: "insensitive" as const };

  return comContextoDeUsuario(ctx, async (tx) => {
    const [clientes, projetos, tarefas] = await Promise.all([
      tx.cliente.findMany({
        where: { ativo: true, razaoSocial: contem },
        select: { id: true, razaoSocial: true },
        orderBy: { razaoSocial: "asc" },
        take: LIMITE_RESULTADOS_BUSCA,
      }),
      tx.projeto.findMany({
        where: { ativo: true, cliente: { ativo: true }, OR: [{ nome: contem }, { numeroProposta: contem }, { cliente: { razaoSocial: contem } }] },
        select: { id: true, nome: true, cliente: { select: { razaoSocial: true } } },
        orderBy: { atualizadoEm: "desc" },
        take: LIMITE_RESULTADOS_BUSCA,
      }),
      tx.tarefa.findMany({
        where: { ativo: true, projeto: { ativo: true, cliente: { ativo: true } }, nome: contem },
        select: { id: true, nome: true, projeto: { select: { nome: true } } },
        orderBy: { atualizadoEm: "desc" },
        take: LIMITE_RESULTADOS_BUSCA,
      }),
    ]);
    return { termo, clientes, projetos, tarefas };
  });
}
