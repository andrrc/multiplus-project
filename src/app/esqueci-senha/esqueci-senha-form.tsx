"use client";

import { useActionState } from "react";
import { esqueciSenhaAction } from "./actions";

export function EsqueciSenhaForm() {
  const [estado, formAction, pendente] = useActionState(esqueciSenhaAction, {});

  if (estado.mensagem) {
    return (
      <p className="rounded-[3px] border-l-[3px] border-verde bg-verde-cl px-4 py-3 text-[14.5px] text-verde-esc">
        {estado.mensagem}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="font-[family-name:var(--font-interface)] text-[13px] font-medium text-tinta">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-[3px] border border-linha bg-branco px-3.5 py-2.5 font-[family-name:var(--font-interface)] text-[14.5px] text-tinta focus:border-azul focus:outline-none"
        />
      </div>

      {estado.erro && (
        <p className="rounded-[3px] border-l-[3px] border-critico bg-branco px-3.5 py-2.5 text-[14px] text-critico">
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pendente}
        className="mt-2 rounded-[3px] bg-tinta px-3.5 py-2.5 font-[family-name:var(--font-interface)] text-[14.5px] font-semibold text-branco hover:bg-tinta2 disabled:opacity-60"
      >
        {pendente ? "Enviando…" : "Enviar link de redefinição"}
      </button>

      <a href="/login" className="text-center text-[14px] text-cinza hover:text-azul-esc hover:underline">
        Voltar para o login
      </a>
    </form>
  );
}
