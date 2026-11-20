/**
 * Filtro da lista de projetos do portal do cliente (protótipo cliente/02-projetos): "Em andamento", "Concluídos" e "Todos".
 * "Em andamento" inclui o projeto que ainda vai começar; o cancelado só aparece em "Todos".
 */
export type FiltroProjetosPortal = "andamento" | "concluidos" | "todos";

export const ROTULOS_FILTRO_PROJETOS_PORTAL: Array<[FiltroProjetosPortal, string]> = [
  ["andamento", "Em andamento"],
  ["concluidos", "Concluídos"],
  ["todos", "Todos"],
];

/** Lê o parâmetro da URL; valor repetido, vazio ou desconhecido cai no padrão do protótipo, "Em andamento". */
export function interpretarFiltroProjetosPortal(valor?: string | string[]): FiltroProjetosPortal {
  return valor === "concluidos" || valor === "todos" ? valor : "andamento";
}

const ABERTOS = new Set(["A_INICIAR", "EM_ANDAMENTO"]);

export function projetoNoFiltroPortal(status: string, filtro: FiltroProjetosPortal): boolean {
  if (filtro === "todos") return true;
  return filtro === "concluidos" ? status === "CONCLUIDO" : ABERTOS.has(status);
}

export function contarProjetosPorFiltro(projetos: ReadonlyArray<{ status: string }>): Record<FiltroProjetosPortal, number> {
  return {
    andamento: projetos.filter((p) => projetoNoFiltroPortal(p.status, "andamento")).length,
    concluidos: projetos.filter((p) => projetoNoFiltroPortal(p.status, "concluidos")).length,
    todos: projetos.length,
  };
}
