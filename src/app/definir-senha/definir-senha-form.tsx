"use client";

import { useActionState, useState } from "react";
import { inputClass } from "@/ui/campo";
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
    <ul className="flex flex-col gap-1.5">
      {avaliarSenha(senha).map((requisito) => (
        <li
          key={requisito.id}
          className={`flex items-center gap-2 text-[13.5px] ${
            requisito.ok ? "text-verde-esc" : "text-cinza"
          }`}
        >
          <span aria-hidden className="w-3.5 shrink-0 text-center">
            {requisito.ok ? "✓" : "•"}
          </span>
          {requisito.descricao}
          <span className="sr-only">{requisito.ok ? " — atendido" : " — ainda não atendido"}</span>
        </li>
      ))}
    </ul>
  );
}

export function DefinirSenhaForm({ token }: { token: string }) {
  const [estado, formAction, pendente] = useActionState(definirSenhaAction, ESTADO_INICIAL);
  const [senha, setSenha] = useState("");
  const [exibirSenha, setExibirSenha] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <label
            htmlFor="senha"
            className="font-[family-name:var(--font-interface)] text-[13px] font-medium text-tinta"
          >
            Nova senha
          </label>
          <button
            type="button"
            onClick={() => setExibirSenha((atual) => !atual)}
            className="font-[family-name:var(--font-interface)] text-[12.5px] font-medium text-cinza hover:text-azul-esc"
          >
            {exibirSenha ? "Ocultar" : "Exibir"}
          </button>
        </div>
        <input
          id="senha"
          name="senha"
          type={exibirSenha ? "text" : "password"}
          required
          autoComplete="new-password"
          value={senha}
          onChange={(evento) => setSenha(evento.target.value)}
          className={inputClass}
        />
      </div>

      <Requisitos senha={senha} />

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
          type={exibirSenha ? "text" : "password"}
          required
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
        className="mt-2 min-h-11 rounded-[3px] bg-tinta px-3.5 py-2.5 font-[family-name:var(--font-interface)] text-[14.5px] font-semibold text-branco hover:bg-tinta2 disabled:opacity-60"
      >
        {pendente ? "Entrando…" : "Definir senha e entrar"}
      </button>
    </form>
  );
}
