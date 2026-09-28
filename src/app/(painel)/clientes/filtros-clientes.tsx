"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inputClass } from "@/ui/campo";

type Filtros = { busca: string; cidade: string; desativados: boolean };

export function FiltrosClientes({
  buscaInicial = "",
  cidadeInicial = "",
  mostrarDesativadosInicial = false,
  cidades,
  podeMostrarDesativados,
}: {
  buscaInicial?: string;
  cidadeInicial?: string;
  mostrarDesativadosInicial?: boolean;
  cidades: string[];
  podeMostrarDesativados: boolean;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [busca, setBusca] = useState(buscaInicial);
  const [cidade, setCidade] = useState(cidadeInicial);
  const [mostrarDesativados, setMostrarDesativados] = useState(mostrarDesativadosInicial);

  const aplicarFiltros = useCallback((filtros: Filtros) => {
    const parametros = new URLSearchParams();
    if (filtros.busca.trim()) parametros.set("busca", filtros.busca.trim());
    if (filtros.cidade) parametros.set("cidade", filtros.cidade);
    if (podeMostrarDesativados && filtros.desativados) parametros.set("desativados", "1");
    const query = parametros.toString();
    startTransition(() => router.replace(query ? `/clientes?${query}` : "/clientes", { scroll: false }));
  }, [podeMostrarDesativados, router]);

  useEffect(() => {
    if (busca === buscaInicial) return;
    const temporizador = window.setTimeout(() => {
      aplicarFiltros({ busca, cidade, desativados: mostrarDesativados });
    }, 350);
    return () => window.clearTimeout(temporizador);
  }, [aplicarFiltros, busca, buscaInicial, cidade, mostrarDesativados]);

  function alterarCidade(valor: string) {
    setCidade(valor);
    aplicarFiltros({ busca, cidade: valor, desativados: mostrarDesativados });
  }

  function alterarDesativados(valor: boolean) {
    setMostrarDesativados(valor);
    aplicarFiltros({ busca, cidade, desativados: valor });
  }

  return (
    <div className="mt-7 flex flex-wrap gap-3" aria-label="Filtros de clientes">
      <input
        type="search"
        name="busca"
        value={busca}
        onChange={(event) => setBusca(event.target.value)}
        placeholder="Buscar por razão social, CNPJ, CPF ou cidade"
        className={`${inputClass} placeholder:text-cinza sm:max-w-md`}
        aria-label="Buscar clientes"
      />
      <select
        name="cidade"
        value={cidade}
        onChange={(event) => alterarCidade(event.target.value)}
        disabled={pendente}
        className={`${inputClass} sm:w-auto`}
        aria-label="Filtrar por cidade"
      >
        <option value="">Todas as cidades</option>
        {cidades.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
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
