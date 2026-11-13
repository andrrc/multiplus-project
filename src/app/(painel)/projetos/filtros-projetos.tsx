"use client";
/**
 * Barra de filtros da lista de Projetos (protótipo 03-listas-projetos-tarefas): busca que
 * se aplica enquanto se digita, botões de situação do prazo com contagem, "Mostrar
 * desativados" e a linha de resultado com "Limpar filtros". Cada escolha atualiza a URL e a
 * página (servidor) refaz a consulta.
 */

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ContagemSituacoes, FiltroSituacao } from "@/lib/situacao-prazo";

const ESPERA_DA_BUSCA_MS = 350;

function urlProjetos(busca: string, desativados: boolean, situacao: FiltroSituacao) {
  const parametros = new URLSearchParams();
  if (busca.trim()) parametros.set("busca", busca.trim());
  if (situacao !== "todos") parametros.set("situacao", situacao);
  if (desativados) parametros.set("desativados", "1");
  const query = parametros.toString();
  return query ? `/projetos?${query}` : "/projetos";
}

export function FiltrosProjetos({
  buscaInicial,
  desativadosInicial,
  situacaoInicial,
  rotulosSituacao,
  contagens,
  total,
}: {
  buscaInicial: string;
  desativadosInicial: boolean;
  situacaoInicial: FiltroSituacao;
  rotulosSituacao: Array<[FiltroSituacao, string]>;
  contagens: ContagemSituacoes;
  total: number;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [busca, setBusca] = useState(buscaInicial);
  const [desativados, setDesativados] = useState(desativadosInicial);
  const [situacao, setSituacao] = useState<FiltroSituacao>(situacaoInicial);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancela uma busca agendada se a barra sair da tela.
  useEffect(() => () => { if (temporizador.current) clearTimeout(temporizador.current); }, []);

  function aplicar(proxima: { busca: string; desativados: boolean; situacao: FiltroSituacao }) {
    startTransition(() => router.push(urlProjetos(proxima.busca, proxima.desativados, proxima.situacao), { scroll: false }));
  }

  function alterarBusca(valor: string) {
    setBusca(valor);
    // Espera uma pausa na digitação para não consultar o servidor a cada letra.
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => aplicar({ busca: valor, desativados, situacao }), ESPERA_DA_BUSCA_MS);
  }

  const temFiltro = busca.trim() !== "" || situacao !== "todos";

  return (
    <div className="mt-6" aria-label="Filtros da listagem">
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <label className="relative w-full min-w-0 flex-1 basis-[260px] md:max-w-[340px]">
          <span className="sr-only">Buscar projeto, cliente ou proposta</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" className="pointer-events-none absolute left-[11px] top-1/2 -translate-y-1/2 text-faint" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input
            type="search"
            name="busca"
            value={busca}
            onChange={(evento) => alterarBusca(evento.target.value)}
            placeholder="Buscar por projeto, cliente ou proposta"
            className="h-11 w-full rounded-controle border border-linha-forte bg-branco pl-9 pr-3 font-[family-name:var(--font-interface)] text-sm text-ink focus:border-azul focus:outline-none focus:ring-[3px] focus:ring-azul/15 md:h-[38px]"
          />
        </label>
      </div>

      <div className="mb-3">
        <div role="group" aria-label="Situação do prazo" className="inline-flex overflow-hidden rounded-controle border border-linha-forte bg-branco max-md:flex max-md:w-full max-md:overflow-x-auto">
          {rotulosSituacao.map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              aria-pressed={situacao === valor}
              disabled={pendente}
              onClick={() => {
                setSituacao(valor);
                aplicar({ busca, desativados, situacao: valor });
              }}
              className="h-11 whitespace-nowrap border-l border-linha px-3 font-[family-name:var(--font-interface)] text-[13px] font-medium text-cinza first:border-l-0 hover:bg-papel hover:text-ink aria-pressed:bg-selecionado aria-pressed:font-semibold aria-pressed:text-ink max-md:flex-1 md:h-9"
            >
              {rotulo}
              <span className="ml-1 font-medium tabular-nums text-faint">{contagens[valor]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-2.5 mt-1 flex flex-wrap items-center justify-between gap-3 text-[13px] text-cinza">
        <span aria-live="polite">
          <span className="tabular-nums">{total} {total === 1 ? "projeto" : "projetos"}</span>
          {temFiltro && <Link href={desativados ? "/projetos?desativados=1" : "/projetos"} className="ml-3 text-azul-esc hover:underline">Limpar filtros</Link>}
        </span>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-ink md:min-h-0">
          <input
            type="checkbox"
            name="desativados"
            checked={desativados}
            disabled={pendente}
            onChange={(evento) => {
              setDesativados(evento.target.checked);
              aplicar({ busca, desativados: evento.target.checked, situacao });
            }}
            className="h-4 w-4 accent-tinta"
          />
          Mostrar desativados
        </label>
      </div>
    </div>
  );
}
