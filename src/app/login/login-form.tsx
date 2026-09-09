"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

const inputClass =
  "rounded-[3px] border border-linha bg-branco px-3.5 py-2.5 font-[family-name:var(--font-interface)] text-[14.5px] text-tinta focus:border-azul focus:outline-none";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [erro, formAction, pendente] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="font-[family-name:var(--font-interface)] text-[13px] font-medium text-tinta">
          E-mail
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="senha" className="font-[family-name:var(--font-interface)] text-[13px] font-medium text-tinta">
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </div>

      {erro && (
        <p className="rounded-[3px] border-l-[3px] border-critico bg-branco px-3.5 py-2.5 text-[14px] text-critico">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pendente}
        className="mt-2 rounded-[3px] bg-tinta px-3.5 py-2.5 font-[family-name:var(--font-interface)] text-[14.5px] font-semibold text-branco hover:bg-tinta2 disabled:opacity-60"
      >
        {pendente ? "Entrando…" : "Entrar"}
      </button>

      <a href="/esqueci-senha" className="text-center text-[14px] text-cinza hover:text-azul-esc hover:underline">
        Esqueci minha senha
      </a>
    </form>
  );
}
