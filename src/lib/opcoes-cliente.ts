import type { TipoCliente } from "@prisma/client";

/** RF-002 — listas fechadas de segmento/origem, comum a client (select) e server (validação). */

export const ORIGENS_CONTATO = ["Google", "Instagram", "LinkedIn", "Evento", "Indicação"] as const;

export const SEGMENTOS_PESSOA_FISICA = ["Proprietário rural", "Parceiro", "Outro"] as const;

/** RF-002b — só Pessoa Jurídica. */
export const PORTES_EMPRESA = ["MEI", "ME", "EPP", "Médio Porte", "Grande Porte"] as const;

export const SEGMENTOS_PESSOA_JURIDICA = [
  "Indústria",
  "Posto de combustível",
  "Transportadora",
  "Centro de distribuição",
  "Área rural",
  "Outros",
] as const;

export function segmentosPorTipo(tipo: TipoCliente): readonly string[] {
  return tipo === "PESSOA_FISICA" ? SEGMENTOS_PESSOA_FISICA : SEGMENTOS_PESSOA_JURIDICA;
}

/** RF-002 — PF usa "Outro", PJ usa "Outros" como opção que abre o campo de texto livre. */
export const OPCAO_OUTRO_POR_TIPO: Record<TipoCliente, string> = {
  PESSOA_FISICA: "Outro",
  PESSOA_JURIDICA: "Outros",
};

export function ehOpcaoOutro(tipo: TipoCliente, segmento: string): boolean {
  return segmento === OPCAO_OUTRO_POR_TIPO[tipo];
}

/**
 * RF-002 — quando "Outro"/"Outros" é selecionado, o texto digitado no campo customizado
 * passa a ser o segmento real do cliente (mesma coluna `segmento`, sem coluna nova).
 */
export function resolverSegmento(
  tipo: TipoCliente,
  segmento: string,
  segmentoCustomizado?: string,
): string {
  return ehOpcaoOutro(tipo, segmento) ? (segmentoCustomizado ?? "").trim() : segmento;
}

/**
 * Ao editar um cliente, se o segmento salvo não bate com nenhuma opção fechada da lista do
 * tipo, ele veio de um campo customizado — o form deve pré-selecionar "Outro"/"Outros" e
 * preencher o texto livre com esse valor, sem perder o dado.
 */
export function ehSegmentoCustomizado(tipo: TipoCliente, segmentoSalvo: string): boolean {
  return segmentoSalvo.length > 0 && !(segmentosPorTipo(tipo) as readonly string[]).includes(segmentoSalvo);
}
