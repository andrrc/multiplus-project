import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { buscarProjetoAtribuido } from "@/lib/projetos-tarefas";
import { Etiqueta } from "@/ui/campo";

const status: Record<string, string> = { A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", CANCELADO: "Cancelado" };
const taskStatus: Record<string, string> = { A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluída", CANCELADO: "Cancelada" };
const data = (v: Date | null) => v ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(v) : "—";

export default async function MeuProjetoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await exigirAcessoARota("/meus-projetos");
  const { id } = await params;
  const p = await buscarProjetoAtribuido(ctx, id);
  if (!p) notFound();

  const documentos = [...p.documentos, ...p.cliente.documentos];

  return <div className="w-full max-w-[980px]">
    <Link href="/meus-projetos" className="font-[family-name:var(--font-interface)] text-[14px] text-azul-esc">← Meus projetos</Link>
    <div className="mt-5">
      <p className="text-[14px] text-cinza">{p.cliente.razaoSocial}</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px]">{p.nome}</h1>
        <Etiqueta>{status[p.status]}</Etiqueta>
      </div>
    </div>
    <section className="mt-8">
      <h2 className="text-[21px]">Tarefas do projeto</h2>
      <div className="mt-4 overflow-hidden border border-linha bg-branco">
        {p.tarefas.length === 0 ? <p className="px-5 py-8 text-[14px] text-cinza">Nenhuma tarefa disponível.</p> : p.tarefas.map(t => <Link href={`/minhas-tarefas/${t.id}`} key={t.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-linha px-5 py-4 hover:bg-verde-cl last:border-b-0"><div><p className="font-[family-name:var(--font-interface)] font-medium text-tinta">{t.nome}</p><p className="mt-1 text-[13px] text-cinza">Prazo: {data(t.prazo)} · {t.subtarefas.filter(s => s.status === "CONCLUIDO").length}/{t.subtarefas.length} subtarefas</p></div><Etiqueta tom={t.status === "CONCLUIDO" ? "positivo" : undefined}>{taskStatus[t.status] ?? t.status}</Etiqueta></Link>)}
      </div>
    </section>
    <section className="mt-8">
      <h2 className="text-[21px]">Documentos</h2>
      {documentos.length === 0 ? <p className="mt-3 text-[14px] text-cinza">Nenhum documento vinculado a este projeto ou cliente.</p> : <ul className="mt-4 space-y-2">{documentos.map(d => <li key={d.id} className="rounded-[3px] border border-linha bg-branco px-4 py-3"><a href={d.link} target="_blank" rel="noreferrer" className="font-[family-name:var(--font-interface)] text-[14px] text-azul-esc hover:underline">{d.nome} ↗</a></li>)}</ul>}
    </section>
  </div>;
}
