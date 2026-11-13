"use client";
/**
 * Botões de situação do prazo com contagem e linha de resultado, para listas que só filtram
 * por situação (Minhas tarefas). O valor vai na URL como `situacao` e a página (servidor) refaz a lista.
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ContagemSituacoes, FiltroSituacao } from "@/lib/situacao-prazo";

export function BotoesSituacao({
  rota,
  rotulos,
  contagens,
  situacaoInicial,
  total,
  singular,
  plural,
}: {
  rota: string;
  rotulos: Array<[FiltroSituacao, string]>;
  contagens: ContagemSituacoes;
  situacaoInicial: FiltroSituacao;
  total: number;
  singular: string;
  plural: string;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [situacao, setSituacao] = useState<FiltroSituacao>(situacaoInicial);

  function escolher(valor: FiltroSituacao) {
    setSituacao(valor);
    startTransition(() => router.push(valor === "todos" ? rota : `${rota}?situacao=${valor}`, { scroll: false }));
  }

  return (
    <div className="mt-5">
      <div role="group" aria-label="Situação do prazo" className="inline-flex overflow-hidden rounded-controle border border-linha-forte bg-branco max-md:flex max-md:w-full max-md:overflow-x-auto">
        {rotulos.map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            aria-pressed={situacao === valor}
            disabled={pendente}
            onClick={() => escolher(valor)}
            className="h-11 whitespace-nowrap border-l border-linha px-3 font-[family-name:var(--font-interface)] text-[13px] font-medium text-cinza first:border-l-0 hover:bg-papel hover:text-ink aria-pressed:bg-selecionado aria-pressed:font-semibold aria-pressed:text-ink max-md:flex-1 md:h-9"
          >
            {rotulo}
            <span className="ml-1 font-medium tabular-nums text-faint">{contagens[valor]}</span>
          </button>
        ))}
      </div>
      <p className="mb-2.5 mt-3 text-[13px] text-cinza" aria-live="polite">
        <span className="tabular-nums">{total} {total === 1 ? singular : plural}</span>
        {situacao !== "todos" && <Link href={rota} className="ml-3 text-azul-esc hover:underline">Limpar filtros</Link>}
      </p>
    </div>
  );
}
