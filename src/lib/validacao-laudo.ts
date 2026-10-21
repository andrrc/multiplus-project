/** RF-051 — laudo técnico exclusivo da administradora. */
import { validarUrlHttp } from "@/lib/validacao-url";

export const TIPOS_LAUDO = { AMBIENTAL: "Ambiental", RURAL: "Rural", AGROAMBIENTAL: "Agroambiental" } as const;
export type TipoLaudoInput = keyof typeof TIPOS_LAUDO;
export type DadosLaudoInput = { possui: boolean; nome?: string; tipo?: TipoLaudoInput; responsavelId?: string; versao?: number };
export type DadosAnotacaoInput = { texto: string; links: string[] };
export type OpcaoResponsavelLaudo = { id: string; nome: string; ativo: boolean; perfil: string };

export function validarDadosLaudo(dados?: DadosLaudoInput): void {
  if (dados === undefined) return;
  if (typeof dados.possui !== "boolean") throw new Error("Informe se o cliente possui laudo técnico.");
  if (dados.versao !== undefined && (!Number.isSafeInteger(dados.versao) || dados.versao < 1)) throw new Error("Versão do laudo inválida.");
  if (!dados.possui) return;
  if (typeof dados.nome !== "string" || !dados.nome.trim()) throw new Error("Informe o nome do laudo.");
  if (!dados.tipo || !Object.hasOwn(TIPOS_LAUDO, dados.tipo)) throw new Error("Selecione um tipo de laudo válido.");
  if (typeof dados.responsavelId !== "string" || !dados.responsavelId.trim()) throw new Error("Selecione o responsável pelo laudo.");
}

export function validarAnotacaoLaudo(dados: DadosAnotacaoInput) {
  if (typeof dados.texto !== "string" || !Array.isArray(dados.links) || dados.links.some((link) => typeof link !== "string")) throw new Error("Anotação inválida.");
  const texto = dados.texto.trim();
  const links = dados.links.filter((link) => link.trim()).map((link) => validarUrlHttp(link));
  if (!texto && links.length === 0) throw new Error("Escreva uma anotação ou inclua um link.");
  return { texto, links };
}

export function normalizarPaginaLaudo(pagina: number) {
  return Number.isSafeInteger(pagina) && pagina > 0 ? pagina : 1;
}
