import { interpretarResponsavel } from "@/lib/filtro-responsavel";
import Link from "next/link";
import { StatusSubtarefa } from "@prisma/client";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { indicadorDePrazosSubtarefas, listarClientesParaProjeto, listarProjetos, listarSubtarefasPrazos, listarTarefasParaFiltro, listarResponsaveisParaFiltro, listarSolicitacoesConclusaoPendentes } from "@/lib/projetos-tarefas";
import { estaAtrasada } from "@/lib/regras-projetos-tarefas";
import { Etiqueta } from "@/ui/campo";
import { FiltrosListagens } from "../filtros-listagens";
import { buscarLimitesSemaforo } from "@/lib/semaforo";
import { IndicadorSemaforoProjeto } from "@/ui/indicador-dias-restantes";
import { decidirSolicitacaoConclusaoFormAction } from "@/app/(painel)/projetos/actions";

const status: Record<StatusSubtarefa, string> = { EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluída", CANCELADO: "Cancelada" };

export default async function SubtarefasPage({ searchParams }: { searchParams: Promise<{ responsavel?: string | string[]; projeto?: string; cliente?: string; tarefa?: string; todos?: string }> }) {
  const ctx = await exigirAcessoARota("/subtarefas");
  const filtros = await searchParams;
  const responsavelInvalido = interpretarResponsavel(filtros.responsavel).tipo === "invalido";
  const responsavelInicial = typeof filtros.responsavel === "string" ? filtros.responsavel : filtros.responsavel ? "invalido" : "";
  const pendentes = filtros.todos !== "1";
  const [subtarefas, projetos, clientes, tarefasFiltro, limites, responsaveis, solicitacoes] = await Promise.all([
    listarSubtarefasPrazos(ctx, { projetoId: filtros.projeto, clienteId: filtros.cliente, tarefaId: filtros.tarefa, responsavel: filtros.responsavel, pendentes }),
    listarProjetos(ctx),
    listarClientesParaProjeto(ctx),
    listarTarefasParaFiltro(ctx),
    buscarLimitesSemaforo(ctx),
    listarResponsaveisParaFiltro(ctx, "subtarefas", { clienteId: filtros.cliente, projetoId: filtros.projeto, tarefaId: filtros.tarefa, pendentes }),
    listarSolicitacoesConclusaoPendentes(ctx),
  ]);
  const indicador = indicadorDePrazosSubtarefas(subtarefas);
  const hoje = new Date();
  const hrefSubtarefa = (tarefaId: string, subtarefaId: string) => `/tarefas/${tarefaId}?subtarefa=${subtarefaId}`;

  return <div className="w-full max-w-[1120px]">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="font-[family-name:var(--font-interface)] text-[11px] font-semibold uppercase tracking-[0.12em] text-azul-esc">Visão gerencial</p><h1 className="mt-1 text-[28px]">Subtarefas</h1><p className="mt-1.5 text-[15px] text-cinza">Acompanhe os prazos das subtarefas dos projetos.</p></div>
      <div className="border-l-[3px] border-ambar bg-branco px-5 py-3"><p className="text-[11px] uppercase tracking-[0.08em] text-cinza">Em dia</p><p className="font-[family-name:var(--font-interface)] text-[25px] font-semibold text-tinta">{indicador.percentual === null ? "—" : `${indicador.percentual}%`} <span className="text-[13px] font-normal text-cinza">({indicador.emDia}/{indicador.total})</span></p></div>
    </div>
    <section className="mt-7 rounded-[3px] border border-linha bg-branco p-4 sm:p-5" aria-labelledby="conclusoes-pendentes">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 id="conclusoes-pendentes" className="font-[family-name:var(--font-interface)] text-[18px] font-semibold">Conclusões aguardando confirmação</h2><p className="mt-1 text-[13px] text-cinza">Confirme para registrar a conclusão ou rejeite para devolver o item ao status anterior.</p></div>
        <span className="rounded-[2px] bg-ambar/10 px-2.5 py-1 font-[family-name:var(--font-interface)] text-[13px] font-semibold text-ambar">{solicitacoes.length} {solicitacoes.length === 1 ? "pedido" : "pedidos"}</span>
      </div>
      {solicitacoes.length === 0 ? <p className="mt-4 border-t border-linha pt-4 text-[14px] text-cinza">Nenhuma conclusão aguarda confirmação.</p> : <ul className="mt-4 divide-y divide-linha border-t border-linha">{solicitacoes.map((pedido) => {
        const ehTarefa = !!pedido.tarefa;
        const titulo = pedido.tarefa?.nome ?? pedido.subtarefa?.titulo ?? "Item";
        const tarefaId = pedido.tarefa?.id ?? pedido.subtarefa?.tarefa.id;
        const tarefaNome = pedido.tarefa?.nome ?? pedido.subtarefa?.tarefa.nome;
        const projeto = pedido.tarefa?.projeto ?? pedido.subtarefa?.tarefa.projeto;
        const cliente = projeto?.cliente;
        const itemAtivo = pedido.tarefa
          ? pedido.tarefa.ativo && pedido.tarefa.status !== "CANCELADO" && pedido.tarefa.projeto.ativo && pedido.tarefa.projeto.cliente.ativo
          : !!pedido.subtarefa?.ativo && pedido.subtarefa.status !== StatusSubtarefa.CANCELADO && !!pedido.subtarefa.tarefa.ativo && !!pedido.subtarefa.tarefa.projeto.ativo && !!pedido.subtarefa.tarefa.projeto.cliente.ativo;
        const href = tarefaId ? `/tarefas/${tarefaId}${ehTarefa ? "" : `?subtarefa=${pedido.subtarefaId}#subtarefa-${pedido.subtarefaId}`}` : "/subtarefas";
        return <li id={`solicitacao-${pedido.id}`} key={pedido.id} className="grid gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><Etiqueta tom="atencao">{ehTarefa ? "Tarefa" : "Subtarefa"}</Etiqueta><Link href={href} className="break-words font-[family-name:var(--font-interface)] text-[15px] font-semibold text-azul-esc hover:underline">{titulo}</Link></div>
            <p className="mt-2 break-words text-[13px] text-cinza">Solicitado por {pedido.solicitadoPor?.nome ?? pedido.solicitadoPorNome} · {cliente?.razaoSocial ?? "Cliente"} · {projeto?.nome ?? "Projeto"}{!ehTarefa && tarefaNome ? ` · ${tarefaNome}` : ""}</p>
            <p className="mt-1 text-[12px] text-cinza">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(pedido.solicitadoEm)}</p>
          </div>
          <form action={decidirSolicitacaoConclusaoFormAction.bind(null, pedido.id)} className="grid gap-2">
            {!itemAtivo && <p className="text-[13px] text-ambar">Item cancelado/inativo ou projeto/cliente inativo. Reative para confirmar; este pedido ainda pode ser rejeitado.</p>}
            <label className="grid gap-1 text-[12px] font-medium text-cinza">Comentário (opcional, usado se rejeitar)<textarea name="comentario" maxLength={2000} rows={2} className="min-h-11 w-full rounded-[3px] border border-linha bg-branco px-3 py-2 text-[13px] text-tinta" /></label>
            <div className="flex flex-wrap gap-2"><button name="decisao" value="APROVAR" disabled={!itemAtivo} className="min-h-11 rounded-[3px] bg-verde px-4 font-[family-name:var(--font-interface)] text-[13px] font-semibold text-tinta hover:bg-verde-esc hover:text-branco disabled:cursor-not-allowed disabled:opacity-50">Confirmar conclusão</button><button name="decisao" value="REJEITAR" className="min-h-11 rounded-[3px] border border-critico px-4 font-[family-name:var(--font-interface)] text-[13px] font-medium text-critico hover:bg-critico-cl">Rejeitar</button></div>
          </form>
        </li>;
      })}</ul>}
    </section>
    <FiltrosListagens
      key={`${responsavelInicial}|${filtros.cliente ?? ""}|${filtros.projeto ?? ""}|${filtros.tarefa ?? ""}|${filtros.todos ?? ""}`}
      rota="/subtarefas"
      clientes={clientes}
      projetos={projetos.map(({ id, nome, cliente }) => ({ id, nome, cliente: { id: cliente.id } }))}
      tarefas={tarefasFiltro}
      responsaveis={responsaveis}
      responsavelInicial={responsavelInicial}
      clienteInicial={filtros.cliente}
      projetoInicial={filtros.projeto}
      tarefaInicial={filtros.tarefa}
      mostrarConcluidasInicial={!pendentes}
      incluirFiltroConcluidas
    />
    {responsavelInvalido && <p role="alert" className="mt-4 text-[14px] text-critico">Filtro de responsável inválido. Selecione um responsável ou “Todos os responsáveis”.</p>}
    {subtarefas.length === 0 ? <div className="mt-8 rounded-[3px] border border-dashed border-linha bg-branco px-8 py-14 text-center"><p className="text-[17px] text-tinta">Nenhuma subtarefa nesta seleção.</p><p className="mt-2 text-[14px] text-cinza">A fila está limpa ou os filtros não encontraram subtarefas.</p></div> : <>
      <div className="mt-7 hidden overflow-x-auto md:block">
        <table className="w-full border-collapse font-[family-name:var(--font-interface)] text-[14px]">
          <thead><tr className="bg-tinta text-left text-branco"><th className="rounded-l-[3px] px-5 py-3 text-[11px] uppercase tracking-[0.06em]">Subtarefa</th><th className="px-5 py-3 text-[11px] uppercase tracking-[0.06em]">Tarefa</th><th className="px-5 py-3 text-[11px] uppercase tracking-[0.06em]">Projeto</th><th className="px-5 py-3 text-[11px] uppercase tracking-[0.06em]">Cliente</th><th className="px-5 py-3 text-[11px] uppercase tracking-[0.06em]">Responsável</th><th className="px-5 py-3 text-[11px] uppercase tracking-[0.06em]">Prazo</th><th className="rounded-r-[3px] px-5 py-3 text-[11px] uppercase tracking-[0.06em]">Status</th></tr></thead>
          <tbody>{subtarefas.map(s => {
            const atrasada = estaAtrasada(s.prazo, s.status === StatusSubtarefa.CONCLUIDO || s.status === StatusSubtarefa.CANCELADO, hoje);
            const hrefDetalhe = hrefSubtarefa(s.tarefa.id, s.id);
            return <tr key={s.id} className="border-t border-linha bg-branco hover:bg-papel">
              <td className="p-0 font-medium"><Link href={hrefDetalhe} className="block px-5 py-4 hover:text-azul-esc">{s.titulo}</Link></td>
              <td className="p-0"><Link href={`/tarefas/${s.tarefa.id}`} className="block px-5 py-4 text-tinta hover:text-azul-esc hover:underline">{s.tarefa.nome}</Link></td>
              <td className="p-0"><Link href={`/projetos/${s.tarefa.projeto.id}`} className="block px-5 py-4 text-azul-esc hover:underline">{s.tarefa.projeto.nome}</Link></td>
              <td className="p-0"><Link href={`/clientes/${s.tarefa.projeto.cliente.id}`} className="block px-5 py-4 text-azul-esc hover:underline">{s.tarefa.projeto.cliente.razaoSocial}</Link></td>
              <td className="p-0"><Link href={hrefDetalhe} className="block px-5 py-4 text-cinza">{s.atribuidoA?.nome ?? s.atribuidoAUsuario?.nome ?? "—"}</Link></td>
              <td className="p-0"><Link href={hrefDetalhe} className={`block px-5 py-4 tabular-nums ${atrasada ? "font-semibold text-critico" : "text-tinta"}`}><IndicadorSemaforoProjeto prazo={s.prazo} status={s.status} ativo={s.ativo} limites={limites} /></Link></td>
              <td className="p-0"><Link href={hrefDetalhe} className="block px-5 py-4"><Etiqueta tom={atrasada ? "atencao" : s.status === StatusSubtarefa.CONCLUIDO ? "positivo" : s.status === StatusSubtarefa.CANCELADO ? "apagado" : undefined}>{status[s.status]}</Etiqueta></Link></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <ul className="mt-7 flex flex-col gap-3 md:hidden">{subtarefas.map(s => {
        return <li key={s.id}>
          <article className="relative rounded-[3px] border border-linha border-l-[3px] border-l-azul bg-branco px-4 py-4 hover:border-azul">
            <Link href={hrefSubtarefa(s.tarefa.id, s.id)} aria-label={`Abrir subtarefa ${s.titulo}`} className="absolute inset-0 z-0"><span className="sr-only">Abrir subtarefa {s.titulo}</span></Link>
            <div className="pointer-events-none relative z-10">
              <div className="flex justify-between gap-3"><p className="font-[family-name:var(--font-interface)] text-[15px] font-semibold text-tinta">{s.titulo}</p><IndicadorSemaforoProjeto prazo={s.prazo} status={s.status} ativo={s.ativo} limites={limites} /></div>
              <p className="mt-1 text-[12px] text-cinza">{s.atribuidoA?.nome ?? s.atribuidoAUsuario?.nome ?? "Sem responsável"}</p>
              <p className="mt-3 text-[13px]"><span className="text-cinza">Tarefa: </span><Link href={`/tarefas/${s.tarefa.id}`} className="pointer-events-auto relative z-20 text-azul-esc hover:underline">{s.tarefa.nome}</Link></p>
              <p className="mt-1 text-[13px]"><span className="text-cinza">Projeto: </span><Link href={`/projetos/${s.tarefa.projeto.id}`} className="pointer-events-auto relative z-20 text-azul-esc hover:underline">{s.tarefa.projeto.nome}</Link></p>
              <p className="mt-1 text-[13px]"><span className="text-cinza">Cliente: </span><Link href={`/clientes/${s.tarefa.projeto.cliente.id}`} className="pointer-events-auto relative z-20 text-azul-esc hover:underline">{s.tarefa.projeto.cliente.razaoSocial}</Link></p>
            </div>
          </article>
        </li>;
      })}</ul>
    </>}
  </div>;
}
