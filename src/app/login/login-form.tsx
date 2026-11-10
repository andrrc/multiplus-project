"use client";

import { useActionState, useRef, useState } from "react";
import { loginAction } from "./actions";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [erro, formAction, pendente] = useActionState(loginAction, undefined);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const senhaRef = useRef<HTMLInputElement>(null);

  return (
    <form action={formAction} onSubmit={() => {
      try {
        for (const chave of Object.keys(sessionStorage)) {
          if (chave.startsWith("mplus-toast-resumo:") || chave.startsWith("mplus-central-visit:")) sessionStorage.removeItem(chave);
        }
      } catch { /* O login continua funcional sem acesso ao armazenamento. */ }
    }}>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      {erro && <div className="alert" role="alert">{erro}</div>}
      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" required autoComplete="username" placeholder="nome@empresa.com.br" />
      </div>
      <div className="field">
        <div className="row-label"><label htmlFor="senha">Senha</label><a href="/esqueci-senha">Esqueci minha senha</a></div>
        <div className="input-wrap has-toggle">
          <input ref={senhaRef} id="senha" name="senha" type={mostrarSenha ? "text" : "password"} required autoComplete="current-password" onKeyDown={(e) => setCapsLock(e.getModifierState("CapsLock"))} onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))} onBlur={() => setCapsLock(false)} />
          <button type="button" className="toggle" aria-controls="senha" aria-pressed={mostrarSenha} onClick={() => { setMostrarSenha(!mostrarSenha); senhaRef.current?.focus(); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{mostrarSenha ? <><path d="M3 3l18 18"/><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.8-1.3"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></> : <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>}</svg>
            <span>{mostrarSenha ? "Ocultar" : "Mostrar"}</span>
          </button>
        </div>
        <p className={`caps${capsLock ? " show" : ""}`}>A tecla Caps Lock está ativada.</p>
      </div>
      <button className="btn" type="submit" disabled={pendente}>{pendente ? "Entrando..." : "Entrar"}</button>
    </form>
  );
}
