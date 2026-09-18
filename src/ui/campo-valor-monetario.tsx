"use client";

import { useState } from "react";

function emCentavos(valor: string): string {
  const [inteiro = "", fracao = ""] = valor.trim().replace(",", ".").split(".");
  const somenteDigitos = `${inteiro.replace(/\D/g, "")}${fracao.replace(/\D/g, "").padEnd(2, "0").slice(0, 2)}`;
  return somenteDigitos.replace(/^0+(?=\d)/, "").slice(0, 14);
}

function exibir(centavos: string): string {
  if (!centavos) return "";
  const preenchido = centavos.padStart(3, "0");
  const inteiros = preenchido.slice(0, -2).replace(/^0+(?=\d)/, "");
  const decimais = preenchido.slice(-2);
  return `${inteiros.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${decimais}`;
}

function paraServidor(centavos: string): string {
  if (!centavos) return "";
  const preenchido = centavos.padStart(3, "0");
  return `${preenchido.slice(0, -2)}.${preenchido.slice(-2)}`;
}

/** Campo monetário brasileiro: o formulário recebe um decimal canônico, não o texto formatado. */
export function CampoValorMonetario({
  name = "valorContratado",
  defaultValue = "",
  required = false,
}: {
  name?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const [centavos, setCentavos] = useState(() => emCentavos(defaultValue));

  return (
    <div className="flex min-h-11 overflow-hidden rounded-[3px] border border-linha bg-branco transition-colors focus-within:border-azul focus-within:ring-2 focus-within:ring-azul/15">
      <span className="flex items-center border-r border-linha bg-papel px-3 font-[family-name:var(--font-interface)] text-[14px] font-semibold text-tinta">
        R$
      </span>
      <input type="hidden" name={name} value={paraServidor(centavos)} />
      <input
        aria-label="Valor contratado em reais"
        type="text"
        required={required}
        inputMode="numeric"
        autoComplete="off"
        value={exibir(centavos)}
        onKeyDown={(evento) => {
          if (evento.key !== "Backspace") return;
          evento.preventDefault();
          const apagouTudo = evento.currentTarget.selectionStart === 0
            && evento.currentTarget.selectionEnd === evento.currentTarget.value.length;
          setCentavos((valor) => (apagouTudo ? "" : valor.slice(0, -1)));
        }}
        onChange={(evento) => setCentavos(evento.target.value.replace(/\D/g, "").slice(0, 14).replace(/^0+(?=\d)/, ""))}
        placeholder="0,00"
        className="min-w-0 flex-1 bg-transparent px-3 font-[family-name:var(--font-interface)] text-[15px] tabular-nums text-tinta outline-none placeholder:text-cinza"
      />
    </div>
  );
}
