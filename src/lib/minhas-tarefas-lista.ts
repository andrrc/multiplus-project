/**
 * Regras da lista "Minhas tarefas" do colaborador interno (protótipo colaborador-interno/02-minhas-tarefas): tarefas e
 * subtarefas juntas, o filtro de tipo e a ação direta na linha. É lógica de tela, sem acesso a banco.
 */
export type TipoLista = "todos" | "tarefas" | "subtarefas";

export const ROTULOS_TIPO_LISTA: Array<[TipoLista, string]> = [
  ["todos", "Tarefas e subtarefas"],
  ["tarefas", "Só tarefas"],
  ["subtarefas", "Só subtarefas"],
];

/** Lê o parâmetro `tipo` da URL; valor repetido, vazio ou desconhecido equivale a "todos". */
export function interpretarTipoLista(valor?: string | string[]): TipoLista {
  return valor === "tarefas" || valor === "subtarefas" ? valor : "todos";
}

export function tipoNaLista(tipo: "tarefa" | "subtarefa", filtro: TipoLista): boolean {
  return filtro === "todos" || (filtro === "tarefas" ? tipo === "tarefa" : tipo === "subtarefa");
}

/**
 * O que a linha oferece ao colaborador, só para itens dele que estão abertos e sem pedido de conclusão pendente:
 * "concluir" envia o pedido para a administração confirmar (ele não conclui direto); se o item exige comprovante, o
 * caminho é a página do item, onde os arquivos são enviados ("comprovante"). Itens de outras pessoas não têm ação.
 */
export type AcaoDaLinha = "concluir" | "comprovante" | null;

export function acaoDaLinha(item: { tipo: "tarefa" | "subtarefa"; meu: boolean; status: string; ativo: boolean; comprovanteExigido: boolean; pedidoPendente: boolean }): AcaoDaLinha {
  if (!item.meu || !item.ativo || item.pedidoPendente) return null;
  const aberto = item.tipo === "tarefa" ? item.status !== "CONCLUIDO" && item.status !== "CANCELADO" : item.status === "EM_ANDAMENTO";
  if (!aberto) return null;
  return item.comprovanteExigido ? "comprovante" : "concluir";
}
