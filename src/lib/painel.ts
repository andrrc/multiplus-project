import { calcularDiasRestantes } from "@/lib/datas";

/**
 * Itens do painel (tarefas e subtarefas em aberto) e a separação em atrasados e vencimentos dos
 * próximos dias. Fica fora da página para ser testada sem banco.
 */
export type ItemPainel = {
  id: string;
  tipo: "Tarefa" | "Subtarefa";
  titulo: string;
  href: string;
  /** Cliente e projeto, para dar contexto ao item. */
  contexto: string;
  responsavel: string | null;
  prazo: Date | null;
  /** Rótulo do status, já em português. */
  statusRotulo: string;
  visita: boolean;
};

export type ItemPainelComDias = ItemPainel & { dias: number };

/** Atrasados (mais antigos primeiro) e itens que vencem até `ateDias` dias (por data, do mais próximo ao mais distante). */
export function separarItensPainel(itens: ItemPainel[], ateDias: number, agora: Date = new Date()) {
  const comDias: ItemPainelComDias[] = itens
    .filter((item): item is ItemPainel & { prazo: Date } => item.prazo !== null)
    .map((item) => ({ ...item, dias: calcularDiasRestantes(item.prazo, agora) }));
  const atrasados = comDias.filter((item) => item.dias < 0).sort((a, b) => a.dias - b.dias);
  const proximos = comDias.filter((item) => item.dias >= 0 && item.dias <= ateDias).sort((a, b) => a.dias - b.dias);
  return { atrasados, proximos, semPrazo: itens.length - comDias.length };
}

/** Itens em dia entre os abertos: os que não estão atrasados, contando os sem prazo. */
export function percentualEmDia(total: number, atrasados: number) {
  if (total === 0) return null;
  return Math.round(((total - atrasados) / total) * 100);
}

/** Agrupa itens já ordenados pelo dia do prazo, mantendo a ordem. */
export function agruparPorDia<T extends { prazo: Date }>(itens: T[]): Array<{ dia: Date; itens: T[] }> {
  const grupos: Array<{ dia: Date; itens: T[] }> = [];
  for (const item of itens) {
    const chave = item.prazo.toISOString().slice(0, 10);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.dia.toISOString().slice(0, 10) === chave) ultimo.itens.push(item);
    else grupos.push({ dia: item.prazo, itens: [item] });
  }
  return grupos;
}
