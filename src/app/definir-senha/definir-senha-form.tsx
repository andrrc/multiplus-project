"use client";

import { useActionState, useRef, useState } from "react";
import { avaliarSenha } from "@/lib/politica-senha";
import { definirSenhaAction, type EstadoDefinirSenha } from "./actions";

const ESTADO_INICIAL: EstadoDefinirSenha = {};

/**
 * Tela A4 — os requisitos ficam visíveis desde o início e vão sendo marcados enquanto se
 * digita, em vez de só aparecerem como erro depois de enviar. A lista vem da mesma função
 * que o servidor usa para recusar (src/lib/politica-senha.ts).
 */
function Requisitos({ senha }: { senha: string }) {
  return (
    <ul className="reqs">
      {avaliarSenha(senha).map((requisito) => (
        <li key={requisito.id} className={requisito.ok ? "ok" : undefined}>
          <span aria-hidden className="mark">
            {requisito.ok ? "✓" : "•"}
          </span>
          {requisito.descricao}
          <span className="sr-only">{requisito.ok ? " — atendido" : " — ainda não atendido"}</span>
        </li>
      ))}
    </ul>
  );
}

/** Ícone do botão Mostrar/Ocultar, o mesmo do login. */
function IconeOlho({ aberto }: { aberto: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {aberto ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.8-1.3" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </>
      ) : (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

export function DefinirSenhaForm({ token }: { token: string }) {
  // A tela mantém senha e preferência de exibição no cliente; política e gravação ficam no servidor.
  const [estado, formAction, pendente] = useActionState(definirSenhaAction, ESTADO_INICIAL);
  const [senha, setSenha] = useState("");
  const [exibirSenha, setExibirSenha] = useState(false);
  const senhaRef = useRef<HTMLInputElement>(null);

  return (
    <form action={formAction}>
      {/* O token retorna à action para uma nova validação antes de alterar a conta. */}
      <input type="hidden" name="token" value={token} />

      <div className="field">
        <label htmlFor="senha">Nova senha</label>
        <div className="input-wrap has-toggle">
          <input
            ref={senhaRef}
            id="senha"
            name="senha"
            type={exibirSenha ? "text" : "password"}
            required
            autoComplete="new-password"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
          />
          <button
            type="button"
            className="toggle"
            aria-controls="senha"
            aria-pressed={exibirSenha}
            onClick={() => {
              setExibirSenha((atual) => !atual);
              senhaRef.current?.focus();
            }}
          >
            <IconeOlho aberto={exibirSenha} />
            <span>{exibirSenha ? "Ocultar" : "Mostrar"}</span>
          </button>
        </div>
      </div>

      {/* A mesma política do servidor dá retorno imediato durante a digitação. */}
      <Requisitos senha={senha} />

      <div className="field">
        <label htmlFor="confirmarSenha">Confirmar senha</label>
        <input
          id="confirmarSenha"
          name="confirmarSenha"
          type={exibirSenha ? "text" : "password"}
          required
          autoComplete="new-password"
        />
      </div>

      {estado.erro && <div className="alert" role="alert">{estado.erro}</div>}

      <button className="btn" type="submit" disabled={pendente}>
        {/* O estado pendente evita envios duplicados enquanto a action processa o token. */}
        {pendente ? "Entrando…" : "Definir senha e entrar"}
      </button>
    </form>
  );
}
