"use client";
/**
 * Barra de filtros da lista de Clientes (protótipo 06-clientes): busca que vale enquanto se digita (nome, ID, CNPJ, CPF
 * ou cidade), segmento, cidade, laudo técnico (Administração), botões de situação com contagem (Todos, Com projeto
 * ativo, Sem projeto ativo), linha de resultado com "Limpar filtros" e o botão "Mostrar desativados". Cada escolha
 * atualiza a URL e a página (servidor) refaz a consulta.
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CampoBuscaLista } from "@/ui/campo-busca-lista";

const filtroClass = "h-11 w-full min-w-0 rounded-controle border border-linha-forte bg-branco px-3 font-[family-name:var(--font-interface)] text-sm text-ink focus:border-azul focus:outline-none focus:ring-[3px] focus:ring-azul/15 disabled:opacity-60 md:h-[38px]";

export type SituacaoClientes = "" | "com" | "sem";
type Filtros = { busca: string; cidade: string; segmento: string; desativados: boolean; laudo: string; situacao: SituacaoClientes };

const BOTOES: Array<[SituacaoClientes, string]> = [["", "Todos"], ["com", "Com projeto ativo"], ["sem", "Sem projeto ativo"]];

export function FiltrosClientes({
  laudoInicial = "",
  buscaInicial = "",
  cidadeInicial = "",
  segmentoInicial = "",
  situacaoInicial = "",
  mostrarDesativadosInicial = false,
  cidades,
  segmentos,
  contagens,
  podeMostrarDesativados,
  total,
}: {
  laudoInicial?: string;
  buscaInicial?: string;
  cidadeInicial?: string;
  segmentoInicial?: string;
  situacaoInicial?: SituacaoClientes;
  mostrarDesativadosInicial?: boolean;
  cidades: string[];
  segmentos: string[];
  /** Clientes por situação, já com a busca, o segmento e a cidade aplicados. */
  contagens: { todos: number; com: number; sem: number };
  podeMostrarDesativados: boolean;
  /** Quantos clientes a lista mostra agora, para a linha de resultado. */
  total?: number;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [filtros, setFiltros] = useState<Filtros>({
    busca: buscaInicial,
    cidade: cidadeInicial,
    segmento: segmentoInicial,
    desativados: mostrarDesativadosInicial,
    laudo: laudoInicial,
    situacao: situacaoInicial,
  });

  // "Limpar filtros" tira a busca da URL: o estado local acompanha, para os demais filtros não a reaplicarem.
  const [buscaDaUrl, setBuscaDaUrl] = useState(buscaInicial);
  if (buscaInicial !== buscaDaUrl) {
    setBuscaDaUrl(buscaInicial);
    if (buscaInicial === "") setFiltros((atual) => ({ ...atual, busca: "" }));
  }

  function aplicar(novos: Filtros) {
    setFiltros(novos);
    const parametros = new URLSearchParams();
    if (novos.busca.trim()) parametros.set("busca", novos.busca.trim());
    if (novos.segmento) parametros.set("segmento", novos.segmento);
    if (novos.cidade) parametros.set("cidade", novos.cidade);
    if (novos.situacao) parametros.set("situacao", novos.situacao);
    if (podeMostrarDesativados && novos.laudo) parametros.set("laudo", novos.laudo);
    if (podeMostrarDesativados && novos.desativados) parametros.set("desativados", "1");
    const query = parametros.toString();
    startTransition(() => router.replace(query ? `/clientes?${query}` : "/clientes", { scroll: false }));
  }

  const temFiltro = filtros.busca.trim() !== "" || filtros.cidade !== "" || filtros.segmento !== "" || filtros.laudo !== "" || filtros.situacao !== "";

  return (
    <div className="mt-6" aria-label="Filtros de clientes">
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <CampoBuscaLista
          valorInicial={buscaInicial}
          placeholder="Buscar por ID, nome, CNPJ, CPF ou cidade"
          rotulo="Buscar clientes"
          aoAlterar={(busca) => setFiltros((atual) => ({ ...atual, busca }))}
          aoBuscar={(busca) => aplicar({ ...filtros, busca })}
        />
        <select
          name="segmento"
          value={filtros.segmento}
          onChange={(event) => aplicar({ ...filtros, segmento: event.target.value })}
          disabled={pendente}
          className={`${filtroClass} md:w-auto md:max-w-[220px]`}
          aria-label="Filtrar por segmento"
        >
          <option value="">Todos os segmentos</option>
          {segmentos.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select
          name="cidade"
          value={filtros.cidade}
          onChange={(event) => aplicar({ ...filtros, cidade: event.target.value })}
          disabled={pendente}
          className={`${filtroClass} md:w-auto md:max-w-[220px]`}
          aria-label="Filtrar por cidade"
        >
          <option value="">Todas as cidades</option>
          {cidades.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        {podeMostrarDesativados && (
          <select
            value={filtros.laudo}
            disabled={pendente}
            className={`${filtroClass} md:w-auto`}
            onChange={(event) => aplicar({ ...filtros, laudo: event.target.value })}
            aria-label="Filtrar por laudo técnico"
          >
            <option value="">Laudo técnico: todos</option>
            <option value="com">Com laudo ativo</option>
            <option value="sem">Sem laudo ativo</option>
          </select>
        )}
      </div>

      <div className="mb-3">
        <div role="group" aria-label="Situação dos clientes" className="inline-flex overflow-hidden rounded-controle border border-linha-forte bg-branco max-md:flex max-md:w-full max-md:overflow-x-auto">
          {BOTOES.map(([valor, rotulo]) => (
            <button
              key={rotulo}
              type="button"
              aria-pressed={filtros.situacao === valor}
              disabled={pendente}
              onClick={() => aplicar({ ...filtros, situacao: valor })}
              className="h-11 whitespace-nowrap border-l border-linha px-3 font-[family-name:var(--font-interface)] text-[13px] font-medium text-cinza first:border-l-0 hover:bg-papel hover:text-ink aria-pressed:bg-selecionado aria-pressed:font-semibold aria-pressed:text-ink max-md:flex-1 md:h-9"
            >
              {rotulo}
              <span className="ml-1 font-medium tabular-nums text-faint">{valor === "" ? contagens.todos : contagens[valor]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-2.5 mt-1 flex flex-wrap items-center justify-between gap-3 text-[13px] text-cinza">
        <span aria-live="polite">
          {total !== undefined && <span className="tabular-nums">{total} {total === 1 ? "cliente" : "clientes"}</span>}
          {temFiltro && <Link href={filtros.desativados ? "/clientes?desativados=1" : "/clientes"} className="ml-3 text-azul-esc hover:underline">Limpar filtros</Link>}
        </span>
        {podeMostrarDesativados && (
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-ink md:min-h-0">
            <input
              type="checkbox"
              name="desativados"
              checked={filtros.desativados}
              onChange={(event) => aplicar({ ...filtros, desativados: event.target.checked })}
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
