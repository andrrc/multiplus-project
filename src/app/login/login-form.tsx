"use client";

import { useActionState, useState } from "react";
import { inputClass } from "@/ui/campo";
import { loginAction } from "./actions";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  // useActionState integra o resultado da validação do servidor ao estado do formulário.
  const [erro, formAction, pendente] = useActionState(loginAction, undefined);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  return (
    <form action={formAction} onSubmit={() => {
      // Uma nova autenticação inicia um ciclo novo do resumo de notificações no painel.
      try {
        for (const chave of Object.keys(sessionStorage)) {
          if (chave.startsWith("mplus-toast-resumo:") || chave.startsWith("mplus-central-visit:")) {
            sessionStorage.removeItem(chave);
          }
        }
      } catch {
        // O login continua funcional mesmo se o navegador bloquear sessionStorage.
      }
    }} className="flex flex-col gap-5">
      {/* Leva o usuário ao recurso que tentou abrir antes de autenticar. */}
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="font-[family-name:var(--font-interface)] text-[13px] font-medium text-tinta">
          E-mail
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" placeholder="nome@empresa.com.br" className={inputClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3"><label htmlFor="senha" className="font-[family-name:var(--font-interface)] text-[13px] font-medium text-tinta">
          Senha
        </label><a href="/esqueci-senha" className="text-[13px] text-azul-esc hover:underline">Esqueci minha senha</a></div>
        <div className="relative">
        <input
          id="senha"
          name="senha"
          type={mostrarSenha ? "text" : "password"}
          required
          autoComplete="current-password"
          className={`${inputClass} pr-24`}
        />
        <button type="button" aria-controls="senha" aria-pressed={mostrarSenha} onClick={() => setMostrarSenha(!mostrarSenha)} className="absolute right-1 top-0 min-h-11 px-3 text-[13px] text-cinza hover:text-tinta">{mostrarSenha ? "Ocultar" : "Mostrar"}</button>
        </div>
      </div>

      {/* O servidor retorna uma mensagem genérica para não revelar se o e-mail existe. */}
      {erro && (
        <p className="rounded-[3px] border-l-[3px] border-critico bg-branco px-3.5 py-2.5 text-[14px] text-critico">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pendente}
        className="mt-2 min-h-11 rounded-[3px] bg-tinta px-3.5 py-2.5 font-[family-name:var(--font-interface)] text-[14.5px] font-semibold text-branco hover:bg-tinta2 disabled:opacity-60"
      >
        {/* O estado pendente impede envios repetidos durante a autenticação. */}
        {pendente ? "Entrando…" : "Entrar"}
      </button>

    </form>
  );
}
