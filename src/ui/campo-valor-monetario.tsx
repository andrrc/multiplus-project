"use client";

import { useState } from "react";

function emCentavos(valor: string): string {
  // Aceita vírgula ou ponto como separador de entrada e separa parte inteira e decimal.
  const [inteiro = "", fracao = ""] = valor.trim().replace(",", ".").split(".");
  // Remove caracteres não numéricos, completa centavos e limita o campo a 14 dígitos.
  const somenteDigitos = `${inteiro.replace(/\D/g, "")}${fracao.replace(/\D/g, "").padEnd(2, "0").slice(0, 2)}`;
  return somenteDigitos.replace(/^0+(?=\d)/, "").slice(0, 14);
}

function exibir(centavos: string): string {
  if (!centavos) return "";
  // Garante pelo menos três algarismos para separar uma casa de reais e duas de centavos.
  const preenchido = centavos.padStart(3, "0");
  const inteiros = preenchido.slice(0, -2).replace(/^0+(?=\d)/, "");
  const decimais = preenchido.slice(-2);
  return `${inteiros.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${decimais}`;
}

function paraServidor(centavos: string): string {
  if (!centavos) return "";
  // O formulário envia decimal com ponto, independente da apresentação brasileira na tela.
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
  // Estado interno guarda somente dígitos de centavos; formatação é derivada no render.
  const [centavos, setCentavos] = useState(() => emCentavos(defaultValue));

  return (
    <div className="flex min-h-11 overflow-hidden rounded-[3px] border border-linha bg-branco transition-colors focus-within:border-azul focus-within:ring-2 focus-within:ring-azul/15">
      <span className="flex items-center border-r border-linha bg-papel px-3 font-[family-name:var(--font-interface)] text-[14px] font-semibold text-tinta">
        R$
      </span>
      <input type="hidden" name={name} value={paraServidor(centavos)} />
      {/* A entrada visível formata o texto, mas o estado permanece composto só por dígitos. */}
      <input
        aria-label="Valor contratado em reais"
        type="text"
        required={required}
        inputMode="numeric"
        autoComplete="off"
        value={exibir(centavos)}
        onKeyDown={(evento) => {
          // Backspace remove um dígito do valor numérico em vez de apagar separadores visuais.
          if (evento.key !== "Backspace") return;
          evento.preventDefault();
          // Selecionar o texto inteiro e apagar limpa o campo; caso contrário, remove o último dígito.
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
