"use client";
/**
 * Barra de filtros das listas de Tarefas e Subtarefas (protótipo 03-listas-projetos-tarefas):
 * seletores de cliente, projeto, tarefa e responsável, botões de situação do prazo com
 * contagem e a linha de resultado com "Limpar filtros". Cada escolha atualiza a URL, e a
 * página (servidor) refaz a consulta; nada é filtrado só no navegador.
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { urlFiltrosListagens, type OpcaoResponsavel, type ValoresFiltrosListagens } from "@/lib/filtro-responsavel";
import type { ContagemSituacoes, FiltroSituacao } from "@/lib/situacao-prazo";

type ClienteFiltro = { id: string; razaoSocial: string };
type ProjetoFiltro = { id: string; nome: string; cliente: { id: string } };
type TarefaFiltro = { id: string; nome: string; projetoId: string; projeto: { nome: string; clienteId: string } };

const campoClasse =
  "h-11 w-full min-w-0 rounded-controle border border-linha-forte bg-branco px-3 font-[family-name:var(--font-interface)] text-sm text-ink focus:border-azul focus:outline-none focus:ring-[3px] focus:ring-azul/15 disabled:opacity-60 md:h-[38px] md:w-auto";

export function FiltrosListagens({
  rota,
  clientes,
  projetos,
  tarefas,
  responsaveis,
  responsavelInicial = "",
  clienteInicial = "",
  projetoInicial = "",
  tarefaInicial = "",
  mostrarConcluidasInicial = false,
  incluirFiltroConcluidas = false,
  situacaoInicial = "todos",
  rotulosSituacao,
  contagens,
  total,
  singular = "item",
  plural = "itens",
}: {
  rota: "/tarefas" | "/subtarefas";
  clientes: ClienteFiltro[];
  projetos: ProjetoFiltro[];
  tarefas: TarefaFiltro[];
  responsaveis: OpcaoResponsavel[];
  responsavelInicial?: string;
  clienteInicial?: string;
  projetoInicial?: string;
  tarefaInicial?: string;
  mostrarConcluidasInicial?: boolean;
  incluirFiltroConcluidas?: boolean;
  situacaoInicial?: FiltroSituacao;
  /** Botões de situação na ordem de exibição; sem eles a faixa de situação não aparece. */
  rotulosSituacao?: Array<[FiltroSituacao, string]>;
  contagens?: ContagemSituacoes;
  /** Quantos itens a lista mostra agora, para a linha de resultado. */
  total?: number;
  singular?: string;
  plural?: string;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [responsavel, setResponsavel] = useState(responsavelInicial);
  const [cliente, setCliente] = useState(clienteInicial);
  const [projeto, setProjeto] = useState(projetoInicial);
  const [tarefa, setTarefa] = useState(tarefaInicial);
  const [mostrarConcluidas, setMostrarConcluidas] = useState(mostrarConcluidasInicial);
  const [situacao, setSituacao] = useState<FiltroSituacao>(situacaoInicial);

  const projetosVisiveis = projetos.filter((item) => !cliente || item.cliente.id === cliente);
  const tarefasVisiveis = tarefas.filter((item) =>
    (!cliente || item.projeto.clienteId === cliente) &&
    (!projeto || item.projetoId === projeto),
  );
  const temFiltro = !!(cliente || projeto || tarefa || responsavel) || situacao !== "todos";

  function aplicarFiltros(valores: ValoresFiltrosListagens) {
    startTransition(() => router.push(urlFiltrosListagens(rota, valores, incluirFiltroConcluidas), { scroll: false }));
  }

  function alterarCliente(valor: string) {
    const novosFiltros = { cliente: valor, projeto: "", tarefa: "", mostrarConcluidas, responsavel, situacao };
    setCliente(valor);
    setProjeto("");
    setTarefa("");
    aplicarFiltros(novosFiltros);
  }

  function alterarProjeto(valor: string) {
    const novosFiltros = { cliente, projeto: valor, tarefa: "", mostrarConcluidas, responsavel, situacao };
    setProjeto(valor);
    setTarefa("");
    aplicarFiltros(novosFiltros);
  }

  function alterarTarefa(valor: string) {
    const novosFiltros = { cliente, projeto, tarefa: valor, mostrarConcluidas, responsavel, situacao };
    setTarefa(valor);
    aplicarFiltros(novosFiltros);
  }

  function alterarConcluidas(valor: boolean) {
    setMostrarConcluidas(valor);
    aplicarFiltros({ cliente, projeto, tarefa, responsavel, mostrarConcluidas: valor, situacao });
  }

  function alterarResponsavel(valor: string) {
    setResponsavel(valor);
    aplicarFiltros({ cliente, projeto, tarefa, responsavel: valor, mostrarConcluidas, situacao });
  }

  function alterarSituacao(valor: FiltroSituacao) {
    setSituacao(valor);
    aplicarFiltros({ cliente, projeto, tarefa, responsavel, mostrarConcluidas, situacao: valor });
  }

  return (
    <div className="mt-6" aria-label="Filtros da listagem">
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <label className="w-full min-w-0 md:w-auto">
          <span className="sr-only">Cliente</span>
          <select name="cliente" value={cliente} disabled={pendente} onChange={(event) => alterarCliente(event.target.value)} className={`${campoClasse} md:max-w-[220px]`}>
            <option value="">Todos os clientes</option>
            {clientes.map((item) => <option key={item.id} value={item.id}>{item.razaoSocial}</option>)}
          </select>
        </label>
        <label className="w-full min-w-0 md:w-auto">
          <span className="sr-only">Projeto</span>
          <select name="projeto" value={projeto} disabled={pendente} onChange={(event) => alterarProjeto(event.target.value)} className={`${campoClasse} md:max-w-[240px]`}>
            <option value="">Todos os projetos</option>
            {projetosVisiveis.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
        </label>
        <label className="w-full min-w-0 md:w-auto">
          <span className="sr-only">Tarefa</span>
          <select name="tarefa" value={tarefa} disabled={pendente} onChange={(event) => alterarTarefa(event.target.value)} className={`${campoClasse} md:max-w-[260px]`}>
            <option value="">Todas as tarefas</option>
            {tarefasVisiveis.map((item) => <option key={item.id} value={item.id}>{item.projeto.nome} · {item.nome}</option>)}
          </select>
        </label>
        <label className="w-full min-w-0 md:w-auto">
          <span className="sr-only">Responsável</span>
          <select name="responsavel" value={responsavel} disabled={pendente} onChange={(event) => alterarResponsavel(event.target.value)} className={`${campoClasse} md:max-w-[240px]`}>
            <option value="">Todos os responsáveis</option>
            <option value="sem">Sem responsável</option>
            {responsavel && responsavel !== "sem" && !responsaveis.some(item => item.valor === responsavel) && <option value={responsavel}>Sem resultados nesta seleção</option>}
            {responsaveis.map(item => <option key={item.valor} value={item.valor}>{item.nome}</option>)}
          </select>
        </label>
      </div>

      {rotulosSituacao && contagens && (
        <div className="mb-3">
          <div role="group" aria-label="Situação do prazo" className="inline-flex overflow-hidden rounded-controle border border-linha-forte bg-branco max-md:flex max-md:w-full max-md:overflow-x-auto">
            {rotulosSituacao.map(([valor, rotulo]) => (
              <button
                key={valor}
                type="button"
                aria-pressed={situacao === valor}
                disabled={pendente}
                onClick={() => alterarSituacao(valor)}
                className="h-11 whitespace-nowrap border-l border-linha px-3 font-[family-name:var(--font-interface)] text-[13px] font-medium text-cinza first:border-l-0 hover:bg-papel hover:text-ink aria-pressed:bg-selecionado aria-pressed:font-semibold aria-pressed:text-ink max-md:flex-1 md:h-9"
              >
                {rotulo}
                <span className="ml-1 font-medium tabular-nums text-faint">{contagens[valor]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-2.5 mt-1 flex flex-wrap items-center justify-between gap-3 text-[13px] text-cinza">
        <span aria-live="polite">
          {total !== undefined && <span className="tabular-nums">{total} {total === 1 ? singular : plural}</span>}
          {temFiltro && <Link href={rota} className="ml-3 text-azul-esc hover:underline">Limpar filtros</Link>}
        </span>
        {incluirFiltroConcluidas && (
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-ink md:min-h-0">
            <input type="checkbox" checked={mostrarConcluidas} disabled={pendente} onChange={(event) => alterarConcluidas(event.target.checked)} className="h-4 w-4 accent-tinta" />
            Mostrar concluídas e canceladas
          </label>
        )}
      </div>
    </div>
  );
}
