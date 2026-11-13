import type { ReactNode } from "react";

// Centraliza as cores do status do portal para manter cartões e detalhes consistentes.
// Selo claro, sem borda e sem lilás: a cor só aparece quando carrega significado.
const ESTILO_POR_STATUS: Record<string, string> = {
  A_INICIAR: "bg-papel text-cinza",
  EM_ANDAMENTO: "bg-azul-cl text-azul-esc",
  CONCLUIDO: "bg-verde-cl text-verde-esc",
  CANCELADO: "bg-critico-cl text-critico",
};

export function EtiquetaStatusPortal({ status, children }: { status: string; children: ReactNode }) {
  // Status novos ou desconhecidos recebem um estilo neutro até serem mapeados.
  const estilo = ESTILO_POR_STATUS[status] ?? "bg-papel text-ink";

  return (
    <span className={`inline-block rounded-selo px-2 py-[3px] font-[family-name:var(--font-interface)] text-xs font-semibold ${estilo}`}>
      {children}
    </span>
  );
}
