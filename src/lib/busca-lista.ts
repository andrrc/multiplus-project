/**
 * Busca de texto das listas (Tarefas, Subtarefas, Clientes, Usuários, Meus projetos…): ignora maiúsculas e acentos e
 * exige que todas as palavras digitadas apareçam em algum dos campos da linha. É feita no servidor, sobre as linhas
 * que a consulta já entregou ao perfil; não amplia nenhum acesso.
 */

const TAMANHO_MAXIMO = 120;

/** Minúsculas e sem acentos, para comparar "Licenca" com "Licença". */
export function normalizarTexto(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Termo da URL: um só valor, sem espaços nas pontas e com limite de tamanho; repetido ou ausente vira vazio. */
export function interpretarBuscaLista(valor: string | string[] | undefined): string {
  if (typeof valor !== "string") return "";
  return valor.trim().replace(/\s+/g, " ").slice(0, TAMANHO_MAXIMO);
}

/** `true` quando o termo está vazio ou todas as suas palavras aparecem em algum dos campos. */
export function correspondeABusca(termo: string, campos: ReadonlyArray<string | number | null | undefined>): boolean {
  const palavras = normalizarTexto(termo).split(" ").filter(Boolean);
  if (palavras.length === 0) return true;
  const texto = normalizarTexto(campos.filter((campo) => campo !== null && campo !== undefined).join(" "));
  return palavras.every((palavra) => texto.includes(palavra));
}
