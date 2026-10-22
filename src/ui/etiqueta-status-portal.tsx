import type { ReactNode } from "react";

const ESTILO_POR_STATUS: Record<string, string> = {
  A_INICIAR: "border-lilas/30 bg-lilas-cl text-lilas",
  EM_ANDAMENTO: "border-azul/30 bg-azul-cl text-azul-esc",
  CONCLUIDO: "border-verde-borda bg-verde-cl text-verde-esc",
  CANCELADO: "border-critico/30 bg-critico-cl text-critico",
};

export function EtiquetaStatusPortal({ status, children }: { status: string; children: ReactNode }) {
  const estilo = ESTILO_POR_STATUS[status] ?? "border-linha bg-branco text-tinta";

  return (
    <span className={`inline-block rounded-[2px] border px-2.5 py-1 font-[family-name:var(--font-interface)] text-[13px] font-medium ${estilo}`}>
      {children}
    </span>
  );
}
