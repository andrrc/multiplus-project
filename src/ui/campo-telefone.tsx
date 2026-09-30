"use client";

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
  const [interno, setInterno] = useState(() => mascararTelefone(defaultValue ?? value ?? ""));
  const valor = value === undefined ? interno : mascararTelefone(value);

  return (
    <input
      {...props}
      type="tel"
      inputMode="tel"
      placeholder={placeholder}
      value={valor}
      onChange={(evento) => {
        const formatado = mascararTelefone(evento.target.value);
        if (value === undefined) setInterno(formatado);
        onValueChange?.(formatado);
      }}
    />
  );
}
