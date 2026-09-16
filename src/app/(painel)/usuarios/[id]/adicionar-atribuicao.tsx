"use client";

import { useActionState, useState } from "react";
import { inputClass } from "@/ui/campo";
import type { OpcaoAtribuicao } from "@/lib/usuarios";
import { adicionarAtribuicaoAction, type EstadoAtribuicao } from "./actions";

export function AdicionarAtribuicao({
  usuarioId,
  opcoes,
  vazioTexto,
}: {
  usuarioId: string;
  opcoes: OpcaoAtribuicao[];
  vazioTexto: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [estado, formAction, pendente] = useActionState<EstadoAtribuicao, FormData>(
    adicionarAtribuicaoAction.bind(null, usuarioId),
    {},
  );

  if (opcoes.length === 0) {
    return <p className="text-[14px] text-cinza">{vazioTexto}</p>;
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-[14px] font-medium text-azul-esc hover:underline"
      >
        + Adicionar atribuição
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-[3px] border border-linha bg-branco p-4">
      <select name="atribuicao" required defaultValue="" className={inputClass}>
        <option value="" disabled>
          Selecione
        </option>
        {opcoes.map((opcao) => (
          <option key={opcao.entidadeId} value={`${opcao.entidadeTipo}:${opcao.entidadeId}`}>
            {opcao.projeto
              ? `${opcao.cliente} › ${opcao.projeto} › ${opcao.nome}`
              : `${opcao.cliente} › ${opcao.nome}`}
          </option>
        ))}
      </select>

      {estado.erro && <p className="text-[14px] text-critico">{estado.erro}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pendente}
          className="rounded-[3px] bg-verde px-4 py-2 text-[14px] font-medium text-tinta hover:bg-verde-esc hover:text-branco disabled:opacity-60"
        >
          {pendente ? "Salvando…" : "Atribuir"}
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
