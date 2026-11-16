/**
 * Ordenação das listas pelos cabeçalhos das colunas. O parâmetro `ordem` da URL é a chave da coluna, e `-chave` pede
 * a ordem decrescente. Chave desconhecida é ignorada (a lista segue na ordem da consulta). Valores ausentes, como
 * tarefa sem prazo, ficam sempre no fim, em qualquer direção.
 */
export type Direcao = "asc" | "desc";
export type OrdemLista = { chave: string; direcao: Direcao } | null;

export function interpretarOrdem(valor: string | string[] | undefined, chavesValidas: readonly string[]): OrdemLista {
  if (typeof valor !== "string") return null;
  const decrescente = valor.startsWith("-");
  const chave = decrescente ? valor.slice(1) : valor;
  return chavesValidas.includes(chave) ? { chave, direcao: decrescente ? "desc" : "asc" } : null;
}

/** Valor do parâmetro `ordem` do clique seguinte: primeiro crescente, depois decrescente, e assim por diante. */
export function proximaOrdem(atual: OrdemLista, chave: string): string {
  return atual?.chave === chave && atual.direcao === "asc" ? `-${chave}` : chave;
}

type Valor = string | number | Date | null | undefined;

function compararValores(a: Valor, b: Valor): number {
  if (typeof a === "string" || typeof b === "string") return String(a).localeCompare(String(b), "pt-BR", { sensitivity: "base", numeric: true });
  return Number(a instanceof Date ? a.getTime() : a) - Number(b instanceof Date ? b.getTime() : b);
}

/** Ordena uma cópia da lista; sem ordem pedida, devolve a lista como veio. A ordenação é estável. */
export function ordenarLista<T>(itens: readonly T[], ordem: OrdemLista, extratores: Record<string, (item: T) => Valor>): T[] {
  if (!ordem || !extratores[ordem.chave]) return [...itens];
  const extrair = extratores[ordem.chave];
  const sinal = ordem.direcao === "asc" ? 1 : -1;
  return [...itens].sort((a, b) => {
    const va = extrair(a);
    const vb = extrair(b);
    const ausenteA = va === null || va === undefined || va === "";
    const ausenteB = vb === null || vb === undefined || vb === "";
    if (ausenteA || ausenteB) return Number(ausenteA) - Number(ausenteB);
    return sinal * compararValores(va, vb);
  });
}

/** Monta a URL do cabeçalho de uma coluna, preservando os demais parâmetros da página. */
export function hrefDeOrdenacao(
  rota: string,
  parametros: Record<string, string | string[] | undefined>,
  ordemAtual: OrdemLista,
  chave: string,
): string {
  const novos = new URLSearchParams();
  for (const [campo, valor] of Object.entries(parametros)) {
    if (campo === "ordem") continue;
    if (Array.isArray(valor)) for (const item of valor) novos.append(campo, item);
    else if (valor) novos.set(campo, valor);
  }
  novos.set("ordem", proximaOrdem(ordemAtual, chave));
  return `${rota}?${novos}`;
}
