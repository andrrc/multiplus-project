"use client";

import { useActionState } from "react";
import { definirSenhaAction, type EstadoDefinirSenha } from "./actions";

const ESTADO_INICIAL: EstadoDefinirSenha = {};

export function DefinirSenhaForm({ token }: { token: string }) {
  const [estado, formAction, pendente] = useActionState(definirSenhaAction, ESTADO_INICIAL);

  if (estado.sucesso) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-gray-700">Senha definida com sucesso.</p>
        <a
          href="/login"
          className="rounded-md bg-gray-900 px-3 py-2 text-center text-sm font-medium text-white"
        >
          Ir para o login
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      <div className="flex flex-col gap-1">
        <label htmlFor="senha" className="text-sm font-medium text-gray-700">
          Nova senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="confirmarSenha" className="text-sm font-medium text-gray-700">
          Confirmar senha
        </label>
        <input
          id="confirmarSenha"
          name="confirmarSenha"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
      </div>

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}

      <button
        type="submit"
        disabled={pendente}
        className="mt-2 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Salvando…" : "Definir senha"}
      </button>
    </form>
  );
}
