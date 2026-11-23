"use client";
/**
 * Filtros de "Meus projetos" (protótipo interno/03): busca, cliente, ordenação e abas de situação com contagem
 * (Ativos, Com atraso, Concluídos, Todos). Cada escolha atualiza a URL e a página (servidor) refaz a lista.
 */
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CampoBuscaLista } from "@/ui/campo-busca-lista";
import type { OrdemMeusProjetos, SituacaoMeusProjetos } from "@/lib/lista-meus-projetos";

const campoClasse = "h-11 w-full min-w-0 rounded-controle border border-linha-forte bg-branco px-3 font-[family-name:var(--font-interface)] text-sm text-ink focus:border-azul focus:outline-none focus:ring-[3px] focus:ring-azul/15 disabled:opacity-60 md:h-[38px] md:w-auto";

const ABAS: Array<[SituacaoMeusProjetos, string]> = [["ativos", "Ativos"], ["pendencias", "Com pendências minhas"], ["atraso", "Com atraso"], ["concluidos", "Concluídos"], ["todos", "Todos"]];

type Estado = { busca: string; cliente: string; situacao: SituacaoMeusProjetos; ordem: OrdemMeusProjetos };

function url(estado: Estado) {
  const parametros = new URLSearchParams();
  if (estado.busca.trim()) parametros.set("busca", estado.busca.trim());
  if (estado.cliente) parametros.set("cliente", estado.cliente);
  // "Ativos" e "prazo" são o padrão da página e não precisam ir na URL.
  if (estado.situacao !== "ativos") parametros.set("situacao", estado.situacao);
  if (estado.ordem !== "prazo") parametros.set("ordem", estado.ordem);
  const query = parametros.toString();
  return query ? `/meus-projetos?${query}` : "/meus-projetos";
}

export function FiltrosMeusProjetos({
  buscaInicial,
  clienteInicial,
  situacaoInicial,
  ordemInicial,
  clientes,
  contagens,
  total,
}: {
  buscaInicial: string;
  clienteInicial: string;
  situacaoInicial: SituacaoMeusProjetos;
  ordemInicial: OrdemMeusProjetos;
  clientes: Array<{ id: string; nome: string }>;
  contagens: Record<SituacaoMeusProjetos, number>;
  total: number;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [estado, setEstado] = useState<Estado>({ busca: buscaInicial, cliente: clienteInicial, situacao: situacaoInicial, ordem: ordemInicial });

  // "Limpar filtros" tira a busca da URL: o estado local acompanha, para os demais filtros não a reaplicarem.
  const [buscaDaUrl, setBuscaDaUrl] = useState(buscaInicial);
  if (buscaInicial !== buscaDaUrl) {
    setBuscaDaUrl(buscaInicial);
    if (buscaInicial === "") setEstado((atual) => ({ ...atual, busca: "" }));
  }

  function aplicar(proximo: Estado) {
    setEstado(proximo);
    startTransition(() => router.push(url(proximo), { scroll: false }));
  }

  const temFiltro = estado.busca.trim() !== "" || estado.cliente !== "" || estado.situacao !== "ativos" || estado.ordem !== "prazo";

  return (
    <div className="mt-5" aria-label="Filtros dos projetos">
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <CampoBuscaLista
          valorInicial={buscaInicial}
          placeholder="Buscar projeto, cliente ou ID"
          rotulo="Buscar projetos"
          aoAlterar={(busca) => setEstado((atual) => ({ ...atual, busca }))}
          aoBuscar={(busca) => aplicar({ ...estado, busca })}
        />
        <select aria-label="Cliente" value={estado.cliente} disabled={pendente} onChange={(evento) => aplicar({ ...estado, cliente: evento.target.value })} className={`${campoClasse} md:max-w-[240px]`}>
          <option value="">Todos os clientes</option>
          {clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}
        </select>
        <select aria-label="Ordenar" value={estado.ordem} disabled={pendente} onChange={(evento) => aplicar({ ...estado, ordem: evento.target.value as OrdemMeusProjetos })} className={campoClasse}>
          <option value="prazo">Ordenar por prazo</option>
          <option value="abertas">Ordenar por tarefas abertas</option>
          <option value="minhas">Ordenar por minhas pendências</option>
          <option value="nome">Ordenar por nome</option>
        </select>
      </div>

      <div className="mb-3">
        <div role="group" aria-label="Situação dos projetos" className="inline-flex overflow-hidden rounded-controle border border-linha-forte bg-branco max-md:flex max-md:w-full max-md:overflow-x-auto">
          {ABAS.map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              aria-pressed={estado.situacao === valor}
              disabled={pendente}
              onClick={() => aplicar({ ...estado, situacao: valor })}
              className="h-11 whitespace-nowrap border-l border-linha px-3 font-[family-name:var(--font-interface)] text-[13px] font-medium text-cinza first:border-l-0 hover:bg-papel hover:text-ink aria-pressed:bg-selecionado aria-pressed:font-semibold aria-pressed:text-ink max-md:flex-1 md:h-9"
            >
              {rotulo}
              <span className="ml-1 font-medium tabular-nums text-faint">{contagens[valor]}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="mb-2.5 text-[13px] text-cinza" aria-live="polite">
        <span className="tabular-nums">{total} {total === 1 ? "projeto" : "projetos"}</span>
        {temFiltro && <Link href="/meus-projetos" className="ml-3 text-azul-esc hover:underline">Limpar filtros</Link>}
      </p>
    </div>
  );
}
