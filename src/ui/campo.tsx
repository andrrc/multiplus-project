import type { ReactNode } from "react";

export const inputClass =
  "min-h-11 w-full rounded-controle border border-linha-forte bg-branco px-3 py-2 font-[family-name:var(--font-interface)] text-sm text-ink focus:border-azul focus:outline-none focus:ring-[3px] focus:ring-azul/15 disabled:bg-papel disabled:text-cinza md:min-h-10";

/**
 * `atencao` existe para o que o RF-040 chama de sinalização visual: um usuário pendente de
 * ativação ou sem nenhuma atribuição não é um erro, mas é algo que a Talita precisa
 * resolver. `apagado` marca o registro desativado (RF-039), que continua legível mas sai
 * do primeiro plano.
 */
type TomEtiqueta = "neutro" | "positivo" | "atencao" | "apagado" | "padrao";

const TONS: Record<TomEtiqueta, string> = {
  neutro: "bg-papel text-ink",
  positivo: "bg-verde-cl text-verde-esc",
  atencao: "bg-ambar-cl text-ambar",
  apagado: "bg-papel text-cinza",
  padrao: "bg-papel text-ink",
};

export function Etiqueta({
  children,
  destaque,
  tom,
}: {
  children: ReactNode;
  destaque?: boolean;
  tom?: TomEtiqueta;
}) {
  const tomFinal: TomEtiqueta = tom ?? (destaque ? "positivo" : "neutro");

  return (
    <span
      className={`inline-block rounded-selo px-2 py-[3px] font-[family-name:var(--font-interface)] text-xs font-semibold ${TONS[tomFinal]}`}
    >
      {children}
    </span>
  );
}

export function Campo({
  label,
  obrigatorio,
  children,
}: {
  label: string;
  obrigatorio?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-[family-name:var(--font-interface)] text-[13px] font-medium text-ink">
        {label}
        {obrigatorio && <span className="text-cinza"> *</span>}
      </span>
      {children}
    </label>
  );
}

/** Etapa de um formulário longo: cartão com o número, o título, uma dica à direita e os campos. */
export function SecaoNumerada({
  numero,
  titulo,
  descricao,
  children,
}: {
  numero: number | string;
  titulo: string;
  descricao?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-cartao border border-linha bg-branco">
      <header className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1 border-b border-linha px-5 py-4">
        <span className="font-[family-name:var(--font-interface)] text-xs font-semibold tabular-nums text-faint">{numero}</span>
        <h2 className="text-base font-semibold">{titulo}</h2>
        {descricao && <p className="w-full text-[13px] text-cinza sm:ml-auto sm:w-auto">{descricao}</p>}
      </header>
      <div className="px-5 py-[18px]">{children}</div>
    </section>
  );
}
