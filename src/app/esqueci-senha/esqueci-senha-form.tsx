"use client";

import { useActionState } from "react";
import { esqueciSenhaAction } from "./actions";

export function EsqueciSenhaForm() {
  // A action retorna estado de sucesso ou erro sem fazer a página depender de navegação.
  const [estado, formAction, pendente] = useActionState(esqueciSenhaAction, {});

  if (estado.mensagem) {
    // Após o envio, mostra apenas confirmação genérica e remove o formulário.
    return (
      <form>
        <p className="notice" role="status">{estado.mensagem}</p>
        <a href="/login" className="back-link">Voltar para o login</a>
      </form>
    );
  }

  return (
    <form action={formAction}>
      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" required autoComplete="email" placeholder="nome@empresa.com.br" />
      </div>

      {estado.erro && <div className="alert" role="alert">{estado.erro}</div>}

      <button className="btn" type="submit" disabled={pendente}>
        {pendente ? "Enviando…" : "Enviar link de redefinição"}
      </button>

      <a href="/login" className="back-link">Voltar para o login</a>
    </form>
  );
}
