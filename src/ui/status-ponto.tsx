import type { ReactNode } from "react";

/**
 * Status como texto com um ponto colorido à esquerda, sem caixa nem borda (padrão dos
 * protótipos). Fica num arquivo próprio, sem importar nada do servidor, para poder ser usado
 * tanto por páginas quanto por componentes de cliente (como o menu de status).
 */

/** Cores dos pontos de status, pelos tokens `ponto-*`. */
const COR_PONTO: Record<string, string> = {
  A_INICIAR: "bg-ponto-inicio",
  EM_ANDAMENTO: "bg-ponto-andamento",
  AGUARDANDO_DOCUMENTO_CLIENTE: "bg-ponto-espera",
  VISITA_REUNIAO_AGENDADA: "bg-ponto-visita",
  PROTOCOLADO: "bg-ponto-orgao",
  SOB_ANALISE_ORGAO_AMBIENTAL: "bg-ponto-orgao",
  COM_EXIGENCIA_A_CUMPRIR: "bg-ponto-exigencia",
  CONCLUIDO: "bg-verde",
  CANCELADO: "bg-cinza",
  // Situação de acesso de um usuário.
  ATIVO: "bg-verde",
  PENDENTE: "bg-ponto-espera",
  DESATIVADO: "bg-cinza",
};

export function StatusPonto({ status, children }: { status: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-[7px] text-[13px] leading-snug text-ink">
      <span aria-hidden="true" className={`size-2 shrink-0 -translate-y-px rounded-full ${COR_PONTO[status] ?? "bg-ponto-inicio"}`} />
      <span>{children}</span>
    </span>
  );
}
