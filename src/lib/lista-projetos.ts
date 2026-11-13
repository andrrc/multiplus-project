/**
 * Regra da lista de Projetos, compartilhada pela tela e pela exportação em PDF: cada projeto recebe a situação do
 * prazo, as contagens dos botões usam a lista antes desse filtro e os projetos fechados (concluídos, cancelados ou
 * desativados) vão para o fim, mantendo a ordem da consulta.
 */
import { calcularDiasRestantes } from "@/lib/datas";
import { contarSituacoes, interpretarSituacao, situacaoDoPrazo, type ContagemSituacoes, type FiltroSituacao, type SituacaoPrazo } from "@/lib/situacao-prazo";

type ProjetoDaLista = { dataPrevistaConclusao: Date | null; status: string; ativo: boolean };

export function prepararListaProjetos<P extends ProjetoDaLista>(
  projetos: P[],
  limites: { diasAmareloAte: number },
  situacaoParametro?: string | string[],
): { situacaoFiltro: FiltroSituacao; contagens: ContagemSituacoes; visiveis: Array<{ projeto: P; situacao: SituacaoPrazo }> } {
  const situacaoFiltro = interpretarSituacao(situacaoParametro);
  const itens = projetos.map((projeto) => ({
    projeto,
    situacao: situacaoDoPrazo(
      { diasRestantes: projeto.dataPrevistaConclusao ? calcularDiasRestantes(projeto.dataPrevistaConclusao) : null, fechado: projeto.status === "CONCLUIDO" || projeto.status === "CANCELADO" || !projeto.ativo },
      limites.diasAmareloAte,
    ),
  }));
  const contagens = contarSituacoes(itens.map((item) => item.situacao));
  const visiveis = (situacaoFiltro === "todos" ? itens : itens.filter((item) => item.situacao === situacaoFiltro))
    .sort((a, b) => Number(a.situacao === "fechado") - Number(b.situacao === "fechado"));
  return { situacaoFiltro, contagens, visiveis };
}
