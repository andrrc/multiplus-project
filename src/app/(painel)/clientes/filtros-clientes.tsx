"use client";
/**
 * Barra de filtros da lista de Clientes (protótipo 06-clientes): busca que vale enquanto se
 * digita, cidade, laudo técnico (Administradora), linha de resultado com "Limpar filtros" e
 * o botão "Mostrar desativados". Cada escolha atualiza a URL e a página (servidor) refaz a consulta.
 */

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const filtroClass = "h-11 w-full min-w-0 rounded-controle border border-linha-forte bg-branco px-3 font-[family-name:var(--font-interface)] text-sm text-ink focus:border-azul focus:outline-none focus:ring-[3px] focus:ring-azul/15 disabled:opacity-60 md:h-[38px]";

type Filtros = { busca: string; cidade: string; desativados: boolean; laudo?: string };

export function FiltrosClientes({
  laudoInicial = "",
  buscaInicial = "",
  cidadeInicial = "",
  mostrarDesativadosInicial = false,
  cidades,
  podeMostrarDesativados,
  total,
}: {
  laudoInicial?: string;
  buscaInicial?: string;
  cidadeInicial?: string;
  mostrarDesativadosInicial?: boolean;
  cidades: string[];
  podeMostrarDesativados: boolean;
  /** Quantos clientes a lista mostra agora, para a linha de resultado. */
  total?: number;
}) {
  const [laudo, setLaudo] = useState(laudoInicial);
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [busca, setBusca] = useState(buscaInicial);
  const [cidade, setCidade] = useState(cidadeInicial);
  const [mostrarDesativados, setMostrarDesativados] = useState(mostrarDesativadosInicial);

  const aplicarFiltros = useCallback((filtros: Filtros) => {
    const parametros = new URLSearchParams();
    if (filtros.busca.trim()) parametros.set("busca", filtros.busca.trim());
    if (filtros.cidade) parametros.set("cidade", filtros.cidade);
    if (podeMostrarDesativados && filtros.laudo) parametros.set("laudo", filtros.laudo);
    if (podeMostrarDesativados && filtros.desativados) parametros.set("desativados", "1");
    const query = parametros.toString();
    startTransition(() => router.replace(query ? `/clientes?${query}` : "/clientes", { scroll: false }));
  }, [podeMostrarDesativados, router]);

  useEffect(() => {
    if (busca === buscaInicial) return;
    const temporizador = window.setTimeout(() => {
      aplicarFiltros({ busca, cidade, desativados: mostrarDesativados, laudo });
    }, 350);
    return () => window.clearTimeout(temporizador);
  }, [aplicarFiltros, busca, buscaInicial, cidade, mostrarDesativados, laudo]);

  function alterarCidade(valor: string) {
    setCidade(valor);
    aplicarFiltros({ busca, cidade: valor, desativados: mostrarDesativados, laudo });
  }

  function alterarDesativados(valor: boolean) {
    setMostrarDesativados(valor);
    aplicarFiltros({ busca, cidade, desativados: valor, laudo });
  }

  const temFiltro = busca.trim() !== "" || cidade !== "" || laudo !== "";

  return (
    <div className="mt-6" aria-label="Filtros de clientes">
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <label className="relative w-full min-w-0 flex-1 basis-[260px] md:max-w-[340px]">
          <span className="sr-only">Buscar clientes</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" className="pointer-events-none absolute left-[11px] top-1/2 -translate-y-1/2 text-faint" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input
            type="search"
            name="busca"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por razão social, CNPJ, CPF ou cidade"
            className={`${filtroClass} pl-9`}
            aria-label="Buscar clientes"
          />
        </label>
        <select
          name="cidade"
          value={cidade}
          onChange={(event) => alterarCidade(event.target.value)}
          disabled={pendente}
          className={`${filtroClass} md:w-auto md:max-w-[220px]`}
          aria-label="Filtrar por cidade"
        >
          <option value="">Todas as cidades</option>
          {cidades.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        {podeMostrarDesativados && (
          <select
            value={laudo}
            disabled={pendente}
            className={`${filtroClass} md:w-auto`}
            onChange={(event) => {
              setLaudo(event.target.value);
              aplicarFiltros({ busca, cidade, desativados: mostrarDesativados, laudo: event.target.value });
            }}
            aria-label="Filtrar por laudo técnico"
          >
            <option value="">Laudo técnico: todos</option>
            <option value="com">Com laudo ativo</option>
            <option value="sem">Sem laudo ativo</option>
          </select>
        )}
      </div>

      <div className="mb-2.5 mt-1 flex flex-wrap items-center justify-between gap-3 text-[13px] text-cinza">
        <span aria-live="polite">
          {total !== undefined && <span className="tabular-nums">{total} {total === 1 ? "cliente" : "clientes"}</span>}
          {temFiltro && <Link href={mostrarDesativados ? "/clientes?desativados=1" : "/clientes"} className="ml-3 text-azul-esc hover:underline">Limpar filtros</Link>}
        </span>
        {podeMostrarDesativados && (
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-ink md:min-h-0">
            <input
              type="checkbox"
              name="desativados"
              checked={mostrarDesativados}
              onChange={(event) => alterarDesativados(event.target.checked)}
              disabled={pendente}
              className="h-4 w-4 accent-tinta"
            />
            Mostrar desativados
          </label>
        )}
      </div>
      {pendente && <span className="sr-only" role="status">Atualizando clientes…</span>}
    </div>
  );
}
