"use client";

import { useActionState } from "react";
import { definirSenhaAction, type EstadoDefinirSenha } from "./actions";

const ESTADO_INICIAL: EstadoDefinirSenha = {};

const inputClass =
  "rounded-[3px] border border-linha bg-branco px-3.5 py-2.5 font-[family-name:var(--font-interface)] text-[14.5px] text-tinta focus:border-azul focus:outline-none";

export function DefinirSenhaForm({ token }: { token: string }) {
  const [estado, formAction, pendente] = useActionState(definirSenhaAction, ESTADO_INICIAL);

  if (estado.sucesso) {
    return (
      <div className="flex flex-col gap-3">
        <p className="rounded-[3px] border-l-[3px] border-verde bg-verde-cl px-4 py-3 text-[14.5px] text-verde-esc">
          Senha definida com sucesso.
        </p>
        <a
          href="/login"
          className="rounded-[3px] bg-tinta px-3.5 py-2.5 text-center font-[family-name:var(--font-interface)] text-[14.5px] font-semibold text-branco hover:bg-tinta2"
        >
          Ir para o login
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="senha" className="font-[family-name:var(--font-interface)] text-[13px] font-medium text-tinta">
          Nova senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="confirmarSenha"
          className="font-[family-name:var(--font-interface)] text-[13px] font-medium text-tinta"
        >
          Confirmar senha
        </label>
        <input
          id="confirmarSenha"
          name="confirmarSenha"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
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
        {pendente ? "Salvando…" : "Definir senha"}
      </button>
    </form>
  );
}
