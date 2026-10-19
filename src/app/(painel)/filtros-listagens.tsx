"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { urlFiltrosListagens, type OpcaoResponsavel, type ValoresFiltrosListagens } from "@/lib/filtro-responsavel";
import { inputClass } from "@/ui/campo";

type ClienteFiltro = { id: string; razaoSocial: string };
type ProjetoFiltro = { id: string; nome: string; cliente: { id: string } };
type TarefaFiltro = { id: string; nome: string; projetoId: string; projeto: { nome: string; clienteId: string } };

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
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [responsavel, setResponsavel] = useState(responsavelInicial);
  const [cliente, setCliente] = useState(clienteInicial);
  const [projeto, setProjeto] = useState(projetoInicial);
  const [tarefa, setTarefa] = useState(tarefaInicial);
  const [mostrarConcluidas, setMostrarConcluidas] = useState(mostrarConcluidasInicial);

  const projetosVisiveis = projetos.filter((item) => !cliente || item.cliente.id === cliente);
  const tarefasVisiveis = tarefas.filter((item) =>
    (!cliente || item.projeto.clienteId === cliente) &&
    (!projeto || item.projetoId === projeto),
  );

  function aplicarFiltros(valores: ValoresFiltrosListagens) {
    startTransition(() => router.push(urlFiltrosListagens(rota, valores, incluirFiltroConcluidas), { scroll: false }));
  }

  function alterarCliente(valor: string) {
    const novosFiltros = { cliente: valor, projeto: "", tarefa: "", mostrarConcluidas, responsavel };
    setCliente(valor);
    setProjeto("");
    setTarefa("");
    aplicarFiltros(novosFiltros);
  }

  function alterarProjeto(valor: string) {
    const novosFiltros = { cliente, projeto: valor, tarefa: "", mostrarConcluidas, responsavel };
    setProjeto(valor);
    setTarefa("");
    aplicarFiltros(novosFiltros);
  }

  function alterarTarefa(valor: string) {
    const novosFiltros = { cliente, projeto, tarefa: valor, mostrarConcluidas, responsavel };
    setTarefa(valor);
    aplicarFiltros(novosFiltros);
  }

  function alterarConcluidas(valor: boolean) {
    setMostrarConcluidas(valor);
    aplicarFiltros({ cliente, projeto, tarefa, responsavel, mostrarConcluidas: valor });
  }

  function alterarResponsavel(valor: string) {
    setResponsavel(valor);
    aplicarFiltros({ cliente, projeto, tarefa, responsavel: valor, mostrarConcluidas });
  }

  return (
    <div className="mt-7 flex flex-wrap items-end gap-3" aria-label="Filtros da listagem">
      <label className="flex w-full min-w-0 flex-col gap-1.5 md:w-[210px]">
        <span className="font-[family-name:var(--font-interface)] text-[13px] font-medium">Cliente</span>
        <select name="cliente" value={cliente} disabled={pendente} onChange={(event) => alterarCliente(event.target.value)} className={inputClass}>
          <option value="">Todos os clientes</option>
          {clientes.map((item) => <option key={item.id} value={item.id}>{item.razaoSocial}</option>)}
        </select>
      </label>
      <label className="flex w-full min-w-0 flex-col gap-1.5 md:w-[210px]">
        <span className="font-[family-name:var(--font-interface)] text-[13px] font-medium">Projeto</span>
        <select name="projeto" value={projeto} disabled={pendente} onChange={(event) => alterarProjeto(event.target.value)} className={inputClass}>
          <option value="">Todos os projetos</option>
          {projetosVisiveis.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
        </select>
      </label>
      <label className="flex w-full min-w-0 flex-col gap-1.5 md:w-[240px]">
        <span className="font-[family-name:var(--font-interface)] text-[13px] font-medium">Tarefa</span>
        <select name="tarefa" value={tarefa} disabled={pendente} onChange={(event) => alterarTarefa(event.target.value)} className={inputClass}>
          <option value="">Todas as tarefas</option>
          {tarefasVisiveis.map((item) => <option key={item.id} value={item.id}>{item.projeto.nome} · {item.nome}</option>)}
        </select>
      </label>
      <label className="flex w-full min-w-0 flex-col gap-1.5 md:w-[260px]">
        <span className="font-[family-name:var(--font-interface)] text-[13px] font-medium">Responsável</span>
        <select name="responsavel" value={responsavel} disabled={pendente} onChange={(event) => alterarResponsavel(event.target.value)} className={inputClass}>
          <option value="">Todos os responsáveis</option>
          <option value="sem">Sem responsável</option>
          {responsavel && responsavel !== "sem" && !responsaveis.some(item => item.valor === responsavel) && <option value={responsavel}>Sem resultados nesta seleção</option>}
          {responsaveis.map(item => <option key={item.valor} value={item.valor}>{item.nome}</option>)}
        </select>
      </label>
      {incluirFiltroConcluidas && <label className="flex min-h-11 items-center gap-2 pb-2 text-[14px]">
        <input type="checkbox" checked={mostrarConcluidas} disabled={pendente} onChange={(event) => alterarConcluidas(event.target.checked)} className="h-4 w-4 accent-verde" />
        Mostrar concluídas e canceladas
      </label>}
    </div>
  );
}
