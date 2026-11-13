"use client";
/**
 * Componente de interface `formularios`. Recebe dados e callbacks de seu chamador, mantém apenas o estado necessário à interação e delega validações e persistência ao servidor.
 */

import { useActionState, useState } from "react";
import { Campo, inputClass } from "@/ui/campo";
import { avaliarSenha } from "@/lib/politica-senha";
import { alterarSenhaAction, atualizarNomeAction, type EstadoPerfil } from "./actions";

function Retorno({ estado }: { estado: EstadoPerfil }) {
  if (!estado.erro && !estado.mensagem) return null;
  return (
    <p
      className={`rounded-cartao border px-4 py-3 text-[14.5px] ${
        estado.erro
          ? "border-critico bg-branco text-critico"
          : "border-verde bg-verde-cl text-verde-esc"
      }`}
    >
      {estado.erro ?? estado.mensagem}
    </p>
  );
}

export function FormularioDados({
  nome,
  email,
  perfil,
  emailEditavel,
}: {
  nome: string;
  email: string;
  perfil: string;
  emailEditavel: boolean;
}) {
  const [estado, formAction, pendente] = useActionState<EstadoPerfil, FormData>(
    atualizarNomeAction,
    {},
  );

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <Campo label="Nome" obrigatorio>
        <input name="nome" required defaultValue={nome} className={inputClass} />
      </Campo>

      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-[13px] font-medium text-tinta">E-mail</span>
        <p className="min-h-11 break-all rounded-controle border border-linha bg-papel px-3.5 py-2.5 text-[14.5px] text-cinza">{email}</p>
      </div>
      <Campo label="Perfil">
        <input value={perfil} readOnly disabled className={inputClass} />
      </Campo>

      {!emailEditavel && (
        <p className="text-[13.5px] text-cinza sm:col-span-2">
          Só o Administrador altera e-mail de usuário.
        </p>
      )}

      <div className="sm:col-span-2"><Retorno estado={estado} /></div>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pendente}
          className="min-h-11 rounded-controle bg-tinta px-5 py-2.5 font-[family-name:var(--font-interface)] text-[14px] font-semibold text-branco hover:bg-tinta2 disabled:opacity-60"
        >
          {pendente ? "Salvando…" : "Salvar nome"}
        </button>
      </div>
    </form>
  );
}

export function FormularioSenha() {
  const [estado, formAction, pendente] = useActionState<EstadoPerfil, FormData>(
    alterarSenhaAction,
    {},
  );
  const [aberto, setAberto] = useState(false);
  const [senhaNova, setSenhaNova] = useState("");

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="min-h-11 rounded-controle border border-linha px-5 py-2.5 font-[family-name:var(--font-interface)] text-[14px] font-medium text-tinta hover:border-azul"
      >
        Alterar senha
      </button>
    );
  }

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
      <Campo label="Senha atual" obrigatorio>
        <input
          name="senhaAtual"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </Campo>

      <Campo label="Nova senha" obrigatorio>
        <input
          name="senhaNova"
          type="password"
          required
          autoComplete="new-password"
          value={senhaNova}
          onChange={(evento) => setSenhaNova(evento.target.value)}
          className={inputClass}
        />
      </Campo>

      <ul className="flex flex-col gap-1.5">
        {avaliarSenha(senhaNova).map((requisito) => (
          <li
            key={requisito.id}
            className={`flex items-center gap-2 text-[13.5px] ${
              requisito.ok ? "text-verde-esc" : "text-cinza"
            }`}
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5 shrink-0">
              {requisito.ok ? <path d="m3 8 3 3 7-7" /> : <circle cx="8" cy="8" r="3" />}
            </svg>
            {requisito.descricao}
          </li>
        ))}
      </ul>

      <Campo label="Confirmar nova senha" obrigatorio>
        <input
          name="confirmarSenha"
          type="password"
          required
          autoComplete="new-password"
          className={inputClass}
        />
      </Campo>

      <Retorno estado={estado} />

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pendente}
          className="min-h-11 rounded-controle bg-tinta px-5 py-2.5 font-[family-name:var(--font-interface)] text-[14px] font-semibold text-branco hover:bg-tinta2 disabled:opacity-60"
        >
          {pendente ? "Alterando…" : "Alterar senha"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="px-4 py-2 text-[14px] text-cinza hover:text-tinta"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
