"use client";
/**
 * Componente de interface `filtros clientes`. Recebe dados e callbacks de seu chamador, mantém apenas o estado necessário à interação e delega validações e persistência ao servidor.
 */

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
const filtroClass = "min-h-11 w-full rounded-controle border border-linha bg-branco px-3 py-2 font-[family-name:var(--font-interface)] text-[13px] text-tinta focus:border-azul disabled:bg-papel disabled:text-cinza";

type Filtros = { busca: string; cidade: string; desativados: boolean; laudo?: string };

export function FiltrosClientes({
  laudoInicial = "",
  buscaInicial = "",
  cidadeInicial = "",
  mostrarDesativadosInicial = false,
  cidades,
  podeMostrarDesativados,
}: {
  laudoInicial?: string;
  buscaInicial?: string;
  cidadeInicial?: string;
  mostrarDesativadosInicial?: boolean;
  cidades: string[];
  podeMostrarDesativados: boolean;
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

  return (
    <div className="mt-5 flex flex-wrap items-center gap-2.5 rounded-cartao border border-linha bg-branco p-3 sm:p-4" aria-label="Filtros de clientes">
      <input
        type="search"
        name="busca"
        value={busca}
        onChange={(event) => setBusca(event.target.value)}
        placeholder="Buscar por razão social, CNPJ, CPF ou cidade"
        className={`${filtroClass} placeholder:text-cinza sm:max-w-sm`}
        aria-label="Buscar clientes"
      />
      <select
        name="cidade"
        value={cidade}
        onChange={(event) => alterarCidade(event.target.value)}
        disabled={pendente}
        className={`${filtroClass} sm:w-auto`}
        aria-label="Filtrar por cidade"
      >
        <option value="">Todas as cidades</option>
        {cidades.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      {podeMostrarDesativados && (
        <select
          value={laudo}
          disabled={pendente}
          className={`${filtroClass} sm:w-auto`}
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
      {podeMostrarDesativados && (
        <label className="flex min-h-11 items-center gap-2 text-[14px] text-tinta">
          <input
            type="checkbox"
            name="desativados"
            checked={mostrarDesativados}
            onChange={(event) => alterarDesativados(event.target.checked)}
            disabled={pendente}
            className="h-4 w-4 accent-verde"
          />
          Mostrar desativados
        </label>
      )}
      {pendente && <span className="sr-only" role="status">Atualizando clientes…</span>}
    </div>
  );
}
