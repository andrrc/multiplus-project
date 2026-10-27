"use client";
/**
 * Componente de interface `campo telefone`. Recebe dados e callbacks de seu chamador, mantém apenas o estado necessário à interação e delega validações e persistência ao servidor.
 */

import { useState, type InputHTMLAttributes } from "react";
import { mascararTelefone } from "@/lib/formatacao";

type CampoTelefoneProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange"
> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (valor: string) => void;
};

/** Input compartilhado para manter todos os celulares no padrão nacional visível. */
export function CampoTelefone({
  value,
  defaultValue,
  onValueChange,
  placeholder = "(11) 99999-9999",
  ...props
}: CampoTelefoneProps) {
  // O modo não controlado parte do valor inicial; em modo controlado, a prop externa prevalece.
  const [interno, setInterno] = useState(() => mascararTelefone(defaultValue ?? value ?? ""));
  // Aplica a máscara também quando o valor chega por atualização do componente pai.
  const valor = value === undefined ? interno : mascararTelefone(value);

  return (
    <input
      {...props}
      type="tel"
      inputMode="tel"
      placeholder={placeholder}
      value={valor}
      onChange={(evento) => {
        // Notifica sempre com o formato nacional exibido no campo.
        const formatado = mascararTelefone(evento.target.value);
        // Só altera o estado local quando o componente não está sob controle do pai.
        if (value === undefined) setInterno(formatado);
        onValueChange?.(formatado);
      }}
    />
  );
}
