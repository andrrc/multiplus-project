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
    <section className="border-t border-linha pt-8 first:border-t-0 first:pt-0">
      <div className="flex items-start gap-3.5">
        <span className="flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full bg-verde font-[family-name:var(--font-interface)] text-[13px] font-semibold text-tinta">
          {numero}
        </span>
        <div>
          <h2 className="text-[19px]">{titulo}</h2>
          {descricao && <p className="mt-1 text-[15px] text-cinza">{descricao}</p>}
        </div>
      </div>
      <div className="mt-5 pl-0 sm:pl-[42px]">{children}</div>
    </section>
  );
}
