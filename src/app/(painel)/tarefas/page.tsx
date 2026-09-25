import Link from "next/link";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { listarClientesParaProjeto, listarProjetos, listarPrazos, listarTarefasParaFiltro } from "@/lib/projetos-tarefas";
import { Etiqueta, inputClass } from "@/ui/campo";

const status: Record<string, string> = {
  A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", AGUARDANDO_DOCUMENTO_CLIENTE: "Aguardando documento do cliente", VISITA_REUNIAO_AGENDADA: "Visita/reunião agendada", PROTOCOLADO: "Protocolado", SOB_ANALISE_ORGAO_AMBIENTAL: "Sob análise do órgão", COM_EXIGENCIA_A_CUMPRIR: "Com exigência a cumprir", CONCLUIDO: "Concluída", CANCELADO: "Cancelada",
};
const data = (valor: Date | null) => valor ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(valor) : "Sem prazo";

export default async function TarefasPage({ searchParams }: { searchParams: Promise<{ cliente?: string; projeto?: string; tarefa?: string }> }) {
  const ctx = await exigirAcessoARota("/tarefas");
  const filtros = await searchParams;
  const [tarefas, projetos, clientes, tarefasFiltro] = await Promise.all([
    listarPrazos(ctx, { clienteId: filtros.cliente, projetoId: filtros.projeto, tarefaId: filtros.tarefa, pendentes: false }),
    listarProjetos(ctx),
    listarClientesParaProjeto(ctx),
    listarTarefasParaFiltro(ctx, { clienteId: filtros.cliente, projetoId: filtros.projeto }),
  ]);

  return <div className="w-full max-w-[1120px]">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="font-[family-name:var(--font-interface)] text-[11px] font-semibold uppercase tracking-[0.12em] text-azul-esc">Operação</p><h1 className="mt-1 text-[28px]">Tarefas</h1><p className="mt-1.5 text-[15px] text-cinza">Acompanhe todas as tarefas ativas dos projetos.</p></div>
      <Link href="/projetos" className="flex min-h-11 items-center rounded-[3px] bg-verde px-5 py-2.5 font-[family-name:var(--font-interface)] text-[14px] font-semibold text-tinta hover:bg-verde-esc hover:text-branco">Ver projetos</Link>
    </div>
    <form className="mt-7 flex flex-wrap items-end gap-3">
      <label className="flex min-w-[210px] flex-col gap-1.5"><span className="font-[family-name:var(--font-interface)] text-[13px] font-medium">Cliente</span><select name="cliente" defaultValue={filtros.cliente ?? ""} className={inputClass}><option value="">Todos os clientes</option>{clientes.map(cliente => <option key={cliente.id} value={cliente.id}>{cliente.razaoSocial}</option>)}</select></label>
      <label className="flex min-w-[210px] flex-col gap-1.5"><span className="font-[family-name:var(--font-interface)] text-[13px] font-medium">Projeto</span><select name="projeto" defaultValue={filtros.projeto ?? ""} className={inputClass}><option value="">Todos os projetos</option>{projetos.map(projeto => <option key={projeto.id} value={projeto.id}>{projeto.nome}</option>)}</select></label>
      <label className="flex min-w-[240px] flex-col gap-1.5"><span className="font-[family-name:var(--font-interface)] text-[13px] font-medium">Tarefa</span><select name="tarefa" defaultValue={filtros.tarefa ?? ""} className={inputClass}><option value="">Todas as tarefas</option>{tarefasFiltro.map(tarefa => <option key={tarefa.id} value={tarefa.id}>{tarefa.projeto.nome} · {tarefa.nome}</option>)}</select></label>
      <button className="min-h-11 rounded-[3px] border border-linha px-4 font-[family-name:var(--font-interface)] text-[14px] hover:border-azul">Filtrar tarefas</button>
    </form>
    {tarefas.length === 0 ? <div className="mt-8 rounded-[3px] border border-dashed border-linha bg-branco px-8 py-14 text-center"><p className="text-[17px] text-tinta">Nenhuma tarefa ativa.</p><p className="mt-2 text-[14px] text-cinza">Crie uma tarefa dentro do projeto correspondente.</p></div> : <div className="mt-7">
      <table className="hidden w-full border-collapse font-[family-name:var(--font-interface)] text-left text-[14px] md:table">
        <thead><tr className="bg-tinta text-left text-branco"><th className="rounded-l-[3px] px-5 py-3 text-[11px] uppercase tracking-[0.06em]">Tarefa</th><th className="px-5 py-3 text-[11px] uppercase tracking-[0.06em]">Projeto</th><th className="px-5 py-3 text-[11px] uppercase tracking-[0.06em]">Cliente</th><th className="px-5 py-3 text-[11px] uppercase tracking-[0.06em]">Prazo</th><th className="rounded-r-[3px] px-5 py-3 text-[11px] uppercase tracking-[0.06em]">Status</th></tr></thead>
        <tbody>{tarefas.map(tarefa => <tr key={tarefa.id} className="border-t border-linha hover:bg-verde-cl">
          <td className="p-0"><Link href={`/tarefas/${tarefa.id}`} className="block px-5 py-4 font-medium hover:text-azul-esc hover:underline">{tarefa.nome}{tarefa.responsavel && <span className="ml-2 text-[12px] font-normal text-cinza">· {tarefa.responsavel.nome}</span>}</Link></td>
          <td className="p-0"><Link href={`/projetos/${tarefa.projeto.id}`} className="block px-5 py-4 text-azul-esc hover:underline">{tarefa.projeto.nome}</Link></td>
          <td className="p-0"><Link href={`/clientes/${tarefa.projeto.cliente.id}`} className="block px-5 py-4 text-azul-esc hover:underline">{tarefa.projeto.cliente.razaoSocial}</Link></td>
          <td className="p-0"><Link href={`/tarefas/${tarefa.id}`} className="block px-5 py-4 tabular-nums">{data(tarefa.prazo)}</Link></td>
          <td className="p-0"><Link href={`/tarefas/${tarefa.id}`} className="block px-5 py-4"><Etiqueta tom={tarefa.status === "CONCLUIDO" ? "positivo" : undefined}>{status[tarefa.status]}</Etiqueta></Link></td>
        </tr>)}</tbody>
      </table>
      <ul className="flex flex-col gap-3 md:hidden">{tarefas.map(tarefa => <li key={tarefa.id}>
        <article className="relative rounded-[3px] border border-linha bg-branco px-4 py-4 hover:border-azul">
          <Link href={`/tarefas/${tarefa.id}`} aria-label={`Abrir tarefa ${tarefa.nome}`} className="absolute inset-0 z-0"><span className="sr-only">Abrir tarefa {tarefa.nome}</span></Link>
          <div className="pointer-events-none relative z-10">
            <div className="flex items-start justify-between gap-3"><p className="font-[family-name:var(--font-interface)] text-[15px] font-semibold text-tinta">{tarefa.nome}</p><Etiqueta tom={tarefa.status === "CONCLUIDO" ? "positivo" : undefined}>{status[tarefa.status]}</Etiqueta></div>
            <p className="mt-1 text-[12px] text-cinza">{data(tarefa.prazo)}{tarefa.responsavel ? ` · ${tarefa.responsavel.nome}` : ""}</p>
            <p className="mt-3 text-[13px]"><span className="text-cinza">Projeto: </span><Link href={`/projetos/${tarefa.projeto.id}`} className="pointer-events-auto relative z-20 text-azul-esc hover:underline">{tarefa.projeto.nome}</Link></p>
            <p className="mt-1 text-[13px]"><span className="text-cinza">Cliente: </span><Link href={`/clientes/${tarefa.projeto.cliente.id}`} className="pointer-events-auto relative z-20 text-azul-esc hover:underline">{tarefa.projeto.cliente.razaoSocial}</Link></p>
          </div>
        </article>
      </li>)}</ul>
    </div>}
  </div>;
}
