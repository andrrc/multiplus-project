/**
 * Regras de busca e ordenação das listas de Tarefas e Subtarefas, usadas pela tela e pela exportação em PDF para que
 * as duas mostrem a mesma lista: o que a busca procura, as colunas ordenáveis e os itens fechados (concluídos,
 * cancelados ou desativados) sempre depois dos abertos.
 */
import { codigoSubtarefa, codigoTarefa } from "@/lib/identificadores-hierarquicos";
import { correspondeABusca } from "@/lib/busca-lista";
import { ordenarLista, type OrdemLista } from "@/lib/ordenacao-lista";
import { calcularDiasRestantes } from "@/lib/datas";
import { situacaoDoPrazo, type FiltroSituacao, type SituacaoPrazo } from "@/lib/situacao-prazo";

export const CHAVES_ORDEM_TAREFAS = ["tarefa", "prazo"] as const;
export const CHAVES_ORDEM_SUBTAREFAS = ["subtarefa", "prazo"] as const;

type ProjetoDaLinha = { nome: string; numeroLocal: number; cliente: { razaoSocial: string; numeroIdentificacao: number } };
type TarefaDaLista = { nome: string; prazo: Date | null; numeroLocal: number; status: string; ativo: boolean; projeto: ProjetoDaLinha };
type SubtarefaDaLista = { titulo: string; prazo: Date | null; numeroLocal: number; status: string; ativo: boolean; tarefa: { nome: string; numeroLocal: number; projeto: ProjetoDaLinha } };

const fechado = (item: { status: string; ativo: boolean }) => item.status === "CONCLUIDO" || item.status === "CANCELADO" || item.ativo === false;

/** Ordem pedida pelo cabeçalho e, depois dela, itens abertos antes dos fechados (a ordenação é estável). */
function abertosPrimeiro<T extends { status: string; ativo: boolean }>(itens: T[]): T[] {
  return itens.sort((a, b) => Number(fechado(a)) - Number(fechado(b)));
}

/** Situação do prazo de uma tarefa ou subtarefa, com o mesmo limite do semáforo; a tela e o PDF usam esta conta. */
export function situacaoDoItem(item: { prazo: Date | null; status: string; ativo: boolean; emConferenciaDesde?: Date | null }, diasAmareloAte: number): SituacaoPrazo {
  return situacaoDoPrazo({ diasRestantes: item.prazo ? calcularDiasRestantes(item.prazo) : null, fechado: fechado(item), emConferencia: !!item.emConferenciaDesde }, diasAmareloAte);
}

/** Aplica o botão de situação do prazo da lista: "todos" mantém tudo, inclusive os itens fechados. */
export function filtrarPorSituacao<T extends { prazo: Date | null; status: string; ativo: boolean; emConferenciaDesde?: Date | null }>(itens: readonly T[], filtro: FiltroSituacao, diasAmareloAte: number): T[] {
  return filtro === "todos" ? [...itens] : itens.filter((item) => situacaoDoItem(item, diasAmareloAte) === filtro);
}

export function buscarEOrdenarTarefas<T extends TarefaDaLista>(tarefas: readonly T[], busca: string, ordem: OrdemLista): T[] {
  const filtradas = tarefas.filter((t) =>
    correspondeABusca(busca, [t.nome, t.projeto.nome, t.projeto.cliente.razaoSocial, codigoTarefa(t.projeto.cliente.numeroIdentificacao, t.projeto.numeroLocal, t.numeroLocal)]));
  return abertosPrimeiro(ordenarLista(filtradas, ordem, { tarefa: (t) => t.nome, prazo: (t) => t.prazo }));
}

export function buscarEOrdenarSubtarefas<T extends SubtarefaDaLista>(subtarefas: readonly T[], busca: string, ordem: OrdemLista): T[] {
  const filtradas = subtarefas.filter((s) =>
    correspondeABusca(busca, [s.titulo, s.tarefa.nome, s.tarefa.projeto.nome, s.tarefa.projeto.cliente.razaoSocial, codigoSubtarefa(s.tarefa.projeto.cliente.numeroIdentificacao, s.tarefa.projeto.numeroLocal, s.tarefa.numeroLocal, s.numeroLocal)]));
  return abertosPrimeiro(ordenarLista(filtradas, ordem, { subtarefa: (s) => s.titulo, prazo: (s) => s.prazo }));
}
