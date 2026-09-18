"use client";

import { useState, useTransition } from "react";
import { atualizarSubtarefaFormAction } from "@/app/(painel)/projetos/actions";

type OpcaoResponsavel = { id: string; nome: string; descricao?: string };

/**
 * A troca é uma edição pequena e isolada da subtarefa; salvar ao selecionar evita o antigo
 * par "select + Atualizar", que fazia o campo parecer voltar para a Talita após o refresh.
 * A chave do componente no pai o recria com o valor confirmado pelo servidor após a
 * revalidação.
 */
export function ResponsavelSubtarefa({
  subtarefaId,
  titulo,
  etiquetas,
  responsavelAtual,
  equipe,
  pessoas,
}: {
  subtarefaId: string;
  titulo: string;
  etiquetas: string[];
  responsavelAtual: string;
  equipe: OpcaoResponsavel[];
  pessoas: OpcaoResponsavel[];
}) {
  const [selecionado, setSelecionado] = useState(responsavelAtual);
  const [pendente, startTransition] = useTransition();
  const [mensagem, setMensagem] = useState<string | null>(null);

  function trocarResponsavel(proximo: string) {
    const anterior = selecionado;
    setSelecionado(proximo);
    setMensagem(null);

    startTransition(async () => {
      try {
        const dados = new FormData();
        dados.set("titulo", titulo);
        dados.set("etiquetas", etiquetas.join(", "));
        dados.set("responsavelId", proximo);
        await atualizarSubtarefaFormAction(subtarefaId, dados);
        setMensagem("Responsável atualizado.");
      } catch {
        setSelecionado(anterior);
        setMensagem("Não foi possível atualizar o responsável.");
      }
    });
  }

  return (
    <div className="min-w-[210px]">
      <label
        htmlFor={`responsavel-${subtarefaId}`}
        className="mb-1 block font-[family-name:var(--font-interface)] text-[12px] font-medium text-cinza"
      >
        Responsável
      </label>
      <select
        id={`responsavel-${subtarefaId}`}
        value={selecionado}
        onChange={(evento) => trocarResponsavel(evento.target.value)}
        disabled={pendente}
        className="min-h-9 w-full rounded-[3px] border border-linha bg-branco px-2 text-[13px] text-tinta focus:border-azul focus:outline-none disabled:bg-papel"
      >
        <optgroup label="Equipe Múltiplus">
          {equipe.map((usuario) => (
            <option key={usuario.id} value={`usuario:${usuario.id}`}>
              {usuario.nome}{usuario.descricao ? ` · ${usuario.descricao}` : ""}
            </option>
          ))}
        </optgroup>
        {pessoas.length > 0 && (
          <optgroup label="Pessoas envolvidas">
            {pessoas.map((pessoa) => (
              <option key={pessoa.id} value={pessoa.id}>
                {pessoa.nome}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      <p
        aria-live="polite"
        className={`mt-1 text-[12px] ${mensagem?.startsWith("Não") ? "text-critico" : "text-cinza"}`}
      >
        {pendente ? "Salvando responsável…" : mensagem ?? "A alteração é salva automaticamente."}
      </p>
    </div>
  );
}
