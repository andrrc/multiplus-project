"use client";

import { useActionState, useState } from "react";
import { Campo, inputClass } from "@/ui/campo";
import { avaliarSenha } from "@/lib/politica-senha";
import { alterarSenhaAction, atualizarNomeAction, type EstadoPerfil } from "./actions";

function Retorno({ estado }: { estado: EstadoPerfil }) {
  if (!estado.erro && !estado.mensagem) return null;
  return (
    <p
      className={`rounded-[3px] border-l-[3px] px-4 py-3 text-[14.5px] ${
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
    <form action={formAction} className="flex flex-col gap-4">
      <Campo label="Nome" obrigatorio>
        <input name="nome" required defaultValue={nome} className={inputClass} />
      </Campo>

      <Campo label="E-mail">
        <input value={email} readOnly disabled className={inputClass} />
      </Campo>
      {!emailEditavel && (
        <p className="-mt-2 text-[13.5px] text-cinza">
          Só o Administrador altera e-mail de usuário.
        </p>
      )}

      <Campo label="Perfil">
        <input value={perfil} readOnly disabled className={inputClass} />
      </Campo>

      <Retorno estado={estado} />

      <div>
        <button
          type="submit"
          disabled={pendente}
          className="min-h-11 rounded-[3px] bg-verde px-5 py-2.5 font-[family-name:var(--font-interface)] text-[14px] font-semibold text-tinta hover:bg-verde-esc hover:text-branco disabled:opacity-60"
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
        className="min-h-11 rounded-[3px] border border-linha px-5 py-2.5 font-[family-name:var(--font-interface)] text-[14px] font-medium text-tinta hover:border-azul"
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
            <span aria-hidden className="w-3.5 shrink-0 text-center">
              {requisito.ok ? "✓" : "•"}
            </span>
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
          className="min-h-11 rounded-[3px] bg-verde px-5 py-2.5 font-[family-name:var(--font-interface)] text-[14px] font-semibold text-tinta hover:bg-verde-esc hover:text-branco disabled:opacity-60"
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
