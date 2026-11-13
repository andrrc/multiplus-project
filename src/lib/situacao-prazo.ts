/**
 * Situação do prazo usada pelos botões de filtro das listas (Atrasados, Vencem em até N dias,
 * No prazo, Sem prazo). A regra de cores do semáforo continua em `indicador-dias-restantes.tsx`;
 * aqui só se decide em qual grupo cada item cai, com o mesmo limite de dias.
 */
export type SituacaoPrazo = "atrasado" | "proximo" | "prazo" | "sem" | "fechado";

/** Valor do parâmetro `situacao` da URL: "todos" ou uma das situações de itens abertos. */
export type FiltroSituacao = "todos" | Exclude<SituacaoPrazo, "fechado">;

const FILTROS_VALIDOS: FiltroSituacao[] = ["todos", "atrasado", "proximo", "prazo", "sem"];

/** Lê o parâmetro da URL; valor repetido, vazio ou desconhecido equivale a "todos". */
export function interpretarSituacao(valor?: string | string[]): FiltroSituacao {
  if (typeof valor !== "string") return "todos";
  return (FILTROS_VALIDOS as string[]).includes(valor) ? (valor as FiltroSituacao) : "todos";
}

/**
 * Classifica um item. `diasRestantes` é negativo quando venceu e `null` quando não há prazo;
 * itens concluídos, cancelados ou desativados ficam em "fechado" e não entram nos grupos.
 */
export function situacaoDoPrazo(
  { diasRestantes, fechado }: { diasRestantes: number | null; fechado: boolean },
  diasAmareloAte: number,
): SituacaoPrazo {
  if (fechado) return "fechado";
  if (diasRestantes === null) return "sem";
  if (diasRestantes < 0) return "atrasado";
  if (diasRestantes <= diasAmareloAte) return "proximo";
  return "prazo";
}

export type ContagemSituacoes = Record<FiltroSituacao, number>;

/** Conta os itens por situação; "todos" soma tudo o que a lista mostra, inclusive os fechados. */
export function contarSituacoes(situacoes: SituacaoPrazo[]): ContagemSituacoes {
  const contagem: ContagemSituacoes = { todos: situacoes.length, atrasado: 0, proximo: 0, prazo: 0, sem: 0 };
  for (const situacao of situacoes) {
    if (situacao !== "fechado") contagem[situacao] += 1;
  }
  return contagem;
}

/** Rótulos dos botões, na ordem dos protótipos. */
export function rotulosSituacao(diasAmareloAte: number): Array<[FiltroSituacao, string]> {
  return [
    ["todos", "Todos"],
    ["atrasado", "Atrasados"],
    ["proximo", `Vencem em até ${diasAmareloAte} ${diasAmareloAte === 1 ? "dia" : "dias"}`],
    ["prazo", "No prazo"],
    ["sem", "Sem prazo"],
  ];
}
