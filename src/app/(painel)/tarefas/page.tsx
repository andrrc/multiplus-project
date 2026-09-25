import Link from "next/link";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { listarPrazos } from "@/lib/projetos-tarefas";
import { Etiqueta } from "@/ui/campo";

const status: Record<string, string> = {
  A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", AGUARDANDO_DOCUMENTO_CLIENTE: "Aguardando documento do cliente", VISITA_REUNIAO_AGENDADA: "Visita/reunião agendada", PROTOCOLADO: "Protocolado", SOB_ANALISE_ORGAO_AMBIENTAL: "Sob análise do órgão", COM_EXIGENCIA_A_CUMPRIR: "Com exigência a cumprir", CONCLUIDO: "Concluída", CANCELADO: "Cancelada",
};
const data = (valor: Date | null) => valor ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(valor) : "Sem prazo";

export default async function TarefasPage() {
  const ctx = await exigirAcessoARota("/tarefas");
  const tarefas = await listarPrazos(ctx, { pendentes: false });

  return <div className="w-full max-w-[1120px]">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="font-[family-name:var(--font-interface)] text-[12px] font-semibold uppercase tracking-[0.08em] text-verde-esc">Operação</p><h1 className="mt-1 text-[30px]">Tarefas</h1><p className="mt-2 text-[15px] text-cinza">Acompanhe todas as tarefas ativas dos projetos.</p></div>
      <Link href="/projetos" className="rounded-[3px] bg-verde px-4 py-2.5 font-[family-name:var(--font-interface)] text-[13px] font-semibold text-tinta hover:bg-verde-esc hover:text-branco">Ver projetos</Link>
    </div>
    {tarefas.length === 0 ? <div className="mt-8 border border-dashed border-linha bg-branco px-8 py-14 text-center"><p className="text-[17px] text-tinta">Nenhuma tarefa ativa.</p><p className="mt-2 text-[14px] text-cinza">Crie uma tarefa dentro do projeto correspondente.</p></div> : <div className="mt-8 overflow-hidden border border-linha bg-branco">
      <table className="hidden w-full border-collapse text-left text-[14px] md:table">
        <thead className="bg-tinta font-[family-name:var(--font-interface)] text-[11px] uppercase tracking-[0.06em] text-branco"><tr><th className="px-5 py-3">Tarefa</th><th className="px-5 py-3">Projeto</th><th className="px-5 py-3">Cliente</th><th className="px-5 py-3">Prazo</th><th className="px-5 py-3">Status</th></tr></thead>
        <tbody>{tarefas.map(tarefa => <tr key={tarefa.id} className="border-t border-linha hover:bg-verde-cl">
          <td className="p-0"><Link href={`/tarefas/${tarefa.id}`} className="block px-5 py-4 font-medium hover:text-azul-esc hover:underline">{tarefa.nome}{tarefa.responsavel && <span className="ml-2 text-[12px] font-normal text-cinza">· {tarefa.responsavel.nome}</span>}</Link></td>
          <td className="p-0"><Link href={`/projetos/${tarefa.projeto.id}`} className="block px-5 py-4 text-azul-esc hover:underline">{tarefa.projeto.nome}</Link></td>
          <td className="p-0"><Link href={`/clientes/${tarefa.projeto.cliente.id}`} className="block px-5 py-4 text-azul-esc hover:underline">{tarefa.projeto.cliente.razaoSocial}</Link></td>
          <td className="p-0"><Link href={`/tarefas/${tarefa.id}`} className="block px-5 py-4 tabular-nums">{data(tarefa.prazo)}</Link></td>
          <td className="p-0"><Link href={`/tarefas/${tarefa.id}`} className="block px-5 py-4"><Etiqueta tom={tarefa.status === "CONCLUIDO" ? "positivo" : undefined}>{status[tarefa.status]}</Etiqueta></Link></td>
        </tr>)}</tbody>
      </table>
      <ul className="divide-y divide-linha md:hidden">{tarefas.map(tarefa => <li key={tarefa.id}>
        <article className="relative px-5 py-4 hover:bg-verde-cl">
          <Link href={`/tarefas/${tarefa.id}`} aria-label={`Abrir tarefa ${tarefa.nome}`} className="absolute inset-0 z-0"><span className="sr-only">Abrir tarefa {tarefa.nome}</span></Link>
          <div className="pointer-events-none relative z-10">
            <div className="flex items-start justify-between gap-3"><p className="font-medium">{tarefa.nome}</p><Etiqueta tom={tarefa.status === "CONCLUIDO" ? "positivo" : undefined}>{status[tarefa.status]}</Etiqueta></div>
            <p className="mt-1 text-[12px] text-cinza">{data(tarefa.prazo)}{tarefa.responsavel ? ` · ${tarefa.responsavel.nome}` : ""}</p>
            <p className="mt-3 text-[13px]"><span className="text-cinza">Projeto: </span><Link href={`/projetos/${tarefa.projeto.id}`} className="pointer-events-auto relative z-20 text-azul-esc hover:underline">{tarefa.projeto.nome}</Link></p>
            <p className="mt-1 text-[13px]"><span className="text-cinza">Cliente: </span><Link href={`/clientes/${tarefa.projeto.cliente.id}`} className="pointer-events-auto relative z-20 text-azul-esc hover:underline">{tarefa.projeto.cliente.razaoSocial}</Link></p>
          </div>
        </article>
      </li>)}</ul>
    </div>}
  </div>;
}
