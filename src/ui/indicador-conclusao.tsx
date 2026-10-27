import type { IndicadorConclusao } from "@/lib/regras-projetos-tarefas";

/** Exibe o percentual agregado ou a contagem detalhada; sem itens, mostra um marcador neutro. */
export function IndicadorConclusao({ indicador, detalhado = false }: { indicador: IndicadorConclusao; detalhado?: boolean }) {
  // `null` significa que não há registros elegíveis para calcular um percentual.
  if (indicador.percentual === null) return <span className="text-cinza">—</span>;
  // A tela pode optar pela contagem em detalhe ou pelo valor percentual compacto.
  return <span className="font-[family-name:var(--font-interface)] tabular-nums">
    {detalhado ? `${indicador.concluidas} de ${indicador.total} concluídas` : `${indicador.percentual}%`}
  </span>;
}
