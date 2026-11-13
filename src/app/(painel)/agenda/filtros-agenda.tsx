"use client";
/**
 * Filtros da agenda (protótipo 09-agenda): cliente, projeto e tipo (todos ou só visitas e reuniões).
 * Cada escolha atualiza a URL, preservando o mês e a visualização, e a página (servidor) refaz a consulta.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const campoClasse = "h-11 w-full min-w-0 rounded-controle border border-linha-forte bg-branco px-3 font-[family-name:var(--font-interface)] text-sm text-ink focus:border-azul focus:outline-none focus:ring-[3px] focus:ring-azul/15 disabled:opacity-60 md:h-[38px] md:w-auto md:max-w-[260px]";

export function FiltrosAgenda({
  mes,
  visao,
  clienteInicial,
  projetoInicial,
  apenasVisitasInicial,
  clientes,
  projetos,
}: {
  mes?: string;
  visao: "mes" | "lista";
  clienteInicial: string;
  projetoInicial: string;
  apenasVisitasInicial: boolean;
  clientes: Array<{ id: string; razaoSocial: string }>;
  projetos: Array<{ id: string; nome: string }>;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [cliente, setCliente] = useState(clienteInicial);
  const [projeto, setProjeto] = useState(projetoInicial);
  const [apenasVisitas, setApenasVisitas] = useState(apenasVisitasInicial);

  function aplicar(proximo: { cliente: string; projeto: string; apenasVisitas: boolean }) {
    setCliente(proximo.cliente);
    setProjeto(proximo.projeto);
    setApenasVisitas(proximo.apenasVisitas);
    const parametros = new URLSearchParams();
    if (mes) parametros.set("mes", mes);
    if (proximo.cliente) parametros.set("cliente", proximo.cliente);
    if (proximo.projeto) parametros.set("projeto", proximo.projeto);
    if (proximo.apenasVisitas) parametros.set("visitas", "1");
    if (visao === "lista") parametros.set("visao", "lista");
    const query = parametros.toString();
    startTransition(() => router.push(query ? `/agenda?${query}` : "/agenda", { scroll: false }));
  }

  const opcoesTipo = [
    { visitas: false, rotulo: "Todos os tipos" },
    { visitas: true, rotulo: "Só visitas e reuniões" },
  ];

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2.5" aria-label="Filtros da agenda">
      <select aria-label="Cliente" value={cliente} disabled={pendente} onChange={(evento) => aplicar({ cliente: evento.target.value, projeto, apenasVisitas })} className={campoClasse}>
        <option value="">Todos os clientes</option>
        {clientes.map((c) => <option key={c.id} value={c.id}>{c.razaoSocial}</option>)}
      </select>
      <select aria-label="Projeto" value={projeto} disabled={pendente} onChange={(evento) => aplicar({ cliente, projeto: evento.target.value, apenasVisitas })} className={campoClasse}>
        <option value="">Todos os projetos</option>
        {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
      </select>
      <div role="group" aria-label="Tipo" className="inline-flex overflow-hidden rounded-controle border border-linha-forte bg-branco max-md:w-full">
        {opcoesTipo.map((opcao) => (
          <button
            key={opcao.rotulo}
            type="button"
            aria-pressed={apenasVisitas === opcao.visitas}
            disabled={pendente}
            onClick={() => aplicar({ cliente, projeto, apenasVisitas: opcao.visitas })}
            className="h-11 whitespace-nowrap border-l border-linha px-3 font-[family-name:var(--font-interface)] text-[13px] font-medium text-cinza first:border-l-0 hover:bg-papel hover:text-ink aria-pressed:bg-selecionado aria-pressed:font-semibold aria-pressed:text-ink max-md:flex-1 md:h-9"
          >
            {opcao.rotulo}
          </button>
        ))}
      </div>
    </div>
  );
}
