"use client";

import { useActionState } from "react";
import { esqueciSenhaAction } from "./actions";

export function EsqueciSenhaForm() {
  const [estado, formAction, pendente] = useActionState(esqueciSenhaAction, {});

  if (estado.mensagem) {
    return <p className="text-sm text-gray-700">{estado.mensagem}</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
      </div>

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}

      <button
        type="submit"
        disabled={pendente}
        className="mt-2 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Enviando…" : "Enviar link de redefinição"}
      </button>

      <a href="/login" className="text-center text-sm text-gray-500 hover:underline">
        Voltar para o login
      </a>
    </form>
  );
}
