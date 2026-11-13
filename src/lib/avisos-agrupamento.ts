import { dataDeHojeEmSaoPaulo } from "@/lib/datas";

/**
 * Agrupa os avisos por período, como a caixa de avisos dos protótipos: Hoje, Ontem, Esta
 * semana (de 2 a 6 dias atrás) e Anteriores. O dia é o dia civil em Brasília, o mesmo
 * critério das regras de prazo, então um aviso das 23h de ontem não vira "Hoje" por causa do UTC.
 */
export type PeriodoAviso = "Hoje" | "Ontem" | "Esta semana" | "Anteriores";

const DIA_MS = 24 * 60 * 60 * 1000;

export function periodoDoAviso(criadaEm: Date, agora: Date = new Date()): PeriodoAviso {
  const dias = Math.round((dataDeHojeEmSaoPaulo(agora) - dataDeHojeEmSaoPaulo(criadaEm)) / DIA_MS);
  // Aviso com data futura (relógios diferentes) não deve cair em "Anteriores".
  if (dias <= 0) return "Hoje";
  if (dias === 1) return "Ontem";
  if (dias <= 6) return "Esta semana";
  return "Anteriores";
}

const ORDEM: PeriodoAviso[] = ["Hoje", "Ontem", "Esta semana", "Anteriores"];

/** Separa os avisos nos períodos, mantendo a ordem recebida dentro de cada um e omitindo os vazios. */
export function agruparAvisos<T extends { criadaEm: Date }>(itens: T[], agora: Date = new Date()): Array<{ periodo: PeriodoAviso; itens: T[] }> {
  const grupos = new Map<PeriodoAviso, T[]>();
  for (const item of itens) {
    const periodo = periodoDoAviso(item.criadaEm, agora);
    grupos.set(periodo, [...(grupos.get(periodo) ?? []), item]);
  }
  return ORDEM.filter((periodo) => grupos.has(periodo)).map((periodo) => ({ periodo, itens: grupos.get(periodo)! }));
}
