import type { ReactNode } from "react";

export const inputClass =
  "rounded-[3px] border border-linha bg-branco px-3.5 py-2.5 font-[family-name:var(--font-interface)] text-[14.5px] text-tinta focus:border-azul focus:outline-none disabled:bg-papel disabled:text-cinza";

export function Etiqueta({ children, destaque }: { children: ReactNode; destaque?: boolean }) {
  return (
    <span
      className={`inline-block rounded-[2px] border px-2.5 py-1 font-[family-name:var(--font-interface)] text-[13px] font-medium ${
        destaque ? "border-verde-borda bg-verde-cl text-verde-esc" : "border-linha bg-branco text-tinta"
      }`}
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
      <span className="font-[family-name:var(--font-interface)] text-[13px] font-medium text-tinta">
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
  numero: number;
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
      <div className="mt-5 pl-[42px]">{children}</div>
    </section>
  );
}
