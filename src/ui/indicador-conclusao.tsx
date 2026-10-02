import type { IndicadorConclusao } from "@/lib/regras-projetos-tarefas";

export function IndicadorConclusao({ indicador, detalhado = false }: { indicador: IndicadorConclusao; detalhado?: boolean }) {
  if (indicador.percentual === null) return <span className="text-cinza">—</span>;
  return <span className="font-[family-name:var(--font-interface)] tabular-nums">
    {detalhado ? `${indicador.concluidas} de ${indicador.total} concluídas` : `${indicador.percentual}%`}
  </span>;
}
