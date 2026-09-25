import Link from "next/link";
import { StatusSubtarefa } from "@prisma/client";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { indicadorDePrazosSubtarefas, listarClientesParaProjeto, listarProjetos, listarSubtarefasPrazos, listarTarefasParaFiltro } from "@/lib/projetos-tarefas";
import { estaAtrasada } from "@/lib/regras-projetos-tarefas";
import { Etiqueta, inputClass } from "@/ui/campo";

const data = (v: Date | null) => v ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(v) : "Sem prazo";
const status: Record<StatusSubtarefa, string> = { EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluída", CANCELADO: "Cancelada" };

export default async function SubtarefasPage({ searchParams }: { searchParams: Promise<{ projeto?: string; cliente?: string; tarefa?: string; todos?: string }> }) {
  const ctx = await exigirAcessoARota("/subtarefas");
  const filtros = await searchParams;
  const pendentes = filtros.todos !== "1";
  const [subtarefas, projetos, clientes, tarefasFiltro] = await Promise.all([
    listarSubtarefasPrazos(ctx, { projetoId: filtros.projeto, clienteId: filtros.cliente, tarefaId: filtros.tarefa, pendentes }),
    listarProjetos(ctx),
    listarClientesParaProjeto(ctx),
    listarTarefasParaFiltro(ctx, { clienteId: filtros.cliente, projetoId: filtros.projeto }),
  ]);
  const indicador = indicadorDePrazosSubtarefas(subtarefas);
  const hoje = new Date();
  const hrefSubtarefa = (tarefaId: string, subtarefaId: string) => `/tarefas/${tarefaId}?subtarefa=${subtarefaId}`;

  return <div className="w-full max-w-[1120px]">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="font-[family-name:var(--font-interface)] text-[11px] font-semibold uppercase tracking-[0.12em] text-azul-esc">Visão gerencial</p><h1 className="mt-1 text-[28px]">Subtarefas</h1><p className="mt-1.5 text-[15px] text-cinza">Acompanhe os prazos das subtarefas dos projetos.</p></div>
      <div className="border-l-[3px] border-ambar bg-branco px-5 py-3"><p className="text-[11px] uppercase tracking-[0.08em] text-cinza">Em dia</p><p className="font-[family-name:var(--font-interface)] text-[25px] font-semibold text-tinta">{indicador.percentual === null ? "—" : `${indicador.percentual}%`} <span className="text-[13px] font-normal text-cinza">({indicador.emDia}/{indicador.total})</span></p></div>
    </div>
    <form className="mt-7 flex flex-wrap items-end gap-3">
      <label className="flex min-w-[230px] flex-col gap-1.5"><span className="font-[family-name:var(--font-interface)] text-[13px] font-medium">Cliente</span><select name="cliente" defaultValue={filtros.cliente ?? ""} className={inputClass}><option value="">Todos os clientes</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.razaoSocial}</option>)}</select></label>
      <label className="flex min-w-[230px] flex-col gap-1.5"><span className="font-[family-name:var(--font-interface)] text-[13px] font-medium">Projeto</span><select name="projeto" defaultValue={filtros.projeto ?? ""} className={inputClass}><option value="">Todos os projetos</option>{projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>
      <label className="flex min-w-[240px] flex-col gap-1.5"><span className="font-[family-name:var(--font-interface)] text-[13px] font-medium">Tarefa</span><select name="tarefa" defaultValue={filtros.tarefa ?? ""} className={inputClass}><option value="">Todas as tarefas</option>{tarefasFiltro.map(tarefa => <option key={tarefa.id} value={tarefa.id}>{tarefa.projeto.nome} · {tarefa.nome}</option>)}</select></label>
      <label className="flex min-h-11 items-center gap-2 pb-2 text-[14px]"><input type="checkbox" name="todos" value="1" defaultChecked={!pendentes} className="h-4 w-4 accent-verde" />Mostrar concluídas e canceladas</label>
      <button className="min-h-11 rounded-[3px] border border-linha px-4 font-[family-name:var(--font-interface)] text-[14px] hover:border-azul">Filtrar subtarefas</button>
    </form>
    {subtarefas.length === 0 ? <div className="mt-8 rounded-[3px] border border-dashed border-linha bg-branco px-8 py-14 text-center"><p className="text-[17px] text-tinta">Nenhuma subtarefa nesta seleção.</p><p className="mt-2 text-[14px] text-cinza">A fila está limpa ou os filtros não encontraram subtarefas.</p></div> : <>
      <div className="mt-7 hidden overflow-x-auto md:block">
        <table className="w-full border-collapse font-[family-name:var(--font-interface)] text-[14px]">
          <thead><tr className="bg-tinta text-left text-branco"><th className="rounded-l-[3px] px-5 py-3 text-[11px] uppercase tracking-[0.06em]">Subtarefa</th><th className="px-5 py-3 text-[11px] uppercase tracking-[0.06em]">Tarefa</th><th className="px-5 py-3 text-[11px] uppercase tracking-[0.06em]">Projeto</th><th className="px-5 py-3 text-[11px] uppercase tracking-[0.06em]">Cliente</th><th className="px-5 py-3 text-[11px] uppercase tracking-[0.06em]">Responsável</th><th className="px-5 py-3 text-[11px] uppercase tracking-[0.06em]">Prazo</th><th className="rounded-r-[3px] px-5 py-3 text-[11px] uppercase tracking-[0.06em]">Status</th></tr></thead>
          <tbody>{subtarefas.map(s => {
            const atrasada = estaAtrasada(s.prazo, s.status === StatusSubtarefa.CONCLUIDO || s.status === StatusSubtarefa.CANCELADO, hoje);
            const hrefDetalhe = hrefSubtarefa(s.tarefa.id, s.id);
            return <tr key={s.id} className={`border-t border-linha ${atrasada ? "border-l-[3px] border-l-vermelho bg-vermelho-cl" : "hover:bg-verde-cl"}`}>
              <td className="p-0 font-medium"><Link href={hrefDetalhe} className="block px-5 py-4 hover:text-azul-esc">{s.titulo}</Link></td>
              <td className="p-0"><Link href={`/tarefas/${s.tarefa.id}`} className="block px-5 py-4 text-tinta hover:text-azul-esc hover:underline">{s.tarefa.nome}</Link></td>
              <td className="p-0"><Link href={`/projetos/${s.tarefa.projeto.id}`} className="block px-5 py-4 text-azul-esc hover:underline">{s.tarefa.projeto.nome}</Link></td>
              <td className="p-0"><Link href={`/clientes/${s.tarefa.projeto.cliente.id}`} className="block px-5 py-4 text-azul-esc hover:underline">{s.tarefa.projeto.cliente.razaoSocial}</Link></td>
              <td className="p-0"><Link href={hrefDetalhe} className="block px-5 py-4 text-cinza">{s.atribuidoA?.nome ?? s.atribuidoAUsuario?.nome ?? "—"}</Link></td>
              <td className="p-0"><Link href={hrefDetalhe} className={`block px-5 py-4 tabular-nums ${atrasada ? "font-semibold text-vermelho" : "text-tinta"}`}>{data(s.prazo)}{atrasada && <span className="ml-2 text-[11px] uppercase">atrasada</span>}</Link></td>
              <td className="p-0"><Link href={hrefDetalhe} className="block px-5 py-4"><Etiqueta tom={atrasada ? "atencao" : s.status === StatusSubtarefa.CONCLUIDO ? "positivo" : s.status === StatusSubtarefa.CANCELADO ? "apagado" : undefined}>{status[s.status]}</Etiqueta></Link></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <ul className="mt-7 flex flex-col gap-3 md:hidden">{subtarefas.map(s => {
        const atrasada = estaAtrasada(s.prazo, s.status === StatusSubtarefa.CONCLUIDO || s.status === StatusSubtarefa.CANCELADO, hoje);
        return <li key={s.id}>
          <article className={`relative rounded-[3px] border border-linha border-l-[3px] bg-branco px-4 py-4 hover:border-azul ${atrasada ? "border-l-vermelho" : "border-l-azul"}`}>
            <Link href={hrefSubtarefa(s.tarefa.id, s.id)} aria-label={`Abrir subtarefa ${s.titulo}`} className="absolute inset-0 z-0"><span className="sr-only">Abrir subtarefa {s.titulo}</span></Link>
            <div className="pointer-events-none relative z-10">
              <div className="flex justify-between gap-3"><p className="font-[family-name:var(--font-interface)] text-[15px] font-semibold text-tinta">{s.titulo}</p><Etiqueta tom={atrasada ? "atencao" : undefined}>{atrasada ? "Atrasada" : data(s.prazo)}</Etiqueta></div>
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
