import type { TipoCliente } from "@prisma/client";

/** RF-002 — listas fechadas de segmento/origem, comum a client (select) e server (validação). */

export const ORIGENS_CONTATO = ["Google", "Instagram", "LinkedIn", "Evento", "Indicação"] as const;

export const SEGMENTOS_PESSOA_FISICA = ["Proprietário rural", "Parceiro", "Outro"] as const;

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
