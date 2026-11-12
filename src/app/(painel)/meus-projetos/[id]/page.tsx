/**
 * Página da rota `src/app/(painel)/meus-projetos/[id]/page.tsx`. Recebe os parâmetros da URL ou da rota, valida o acesso no servidor, obtém os dados necessários e compõe a resposta visual; as regras de negócio permanecem nas funções de domínio chamadas por ela.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { buscarProjetoAtribuido } from "@/lib/projetos-tarefas";
import { Etiqueta } from "@/ui/campo";
import { IndicadorSemaforoProjeto } from "@/ui/indicador-dias-restantes";
import { buscarLimitesSemaforo } from "@/lib/semaforo";
import { calcularPercentualConclusao } from "@/lib/regras-projetos-tarefas";
import { IndicadorConclusao } from "@/ui/indicador-conclusao";
import { codigoProjeto } from "@/lib/identificadores-hierarquicos";

const status: Record<string, string> = { A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", CANCELADO: "Cancelado" };
const taskStatus: Record<string, string> = { A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluída", CANCELADO: "Cancelada" };
const data = (v: Date | null) => v ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(v) : "Não informado";

export default async function MeuProjetoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await exigirAcessoARota("/meus-projetos");
  const { id } = await params;
  const [p, limites] = await Promise.all([buscarProjetoAtribuido(ctx, id), buscarLimitesSemaforo(ctx)]);
  if (!p) notFound();

  const documentos = [...p.documentos, ...p.cliente.documentos];

  return <div className="w-full max-w-[1280px]">
    <Link href="/meus-projetos" className="font-[family-name:var(--font-interface)] text-[14px] text-azul-esc">← Meus projetos</Link>
    <div className="mt-5">
      <p className="text-[14px] text-cinza">{p.cliente.razaoSocial}</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0"><h1 className="break-words text-[28px]">{p.nome}</h1><p className="mt-1 break-all font-[family-name:var(--font-interface)] text-[13px] tabular-nums text-cinza">ID {codigoProjeto(p.cliente.numeroIdentificacao, p.numeroLocal)}</p></div>
        <Etiqueta>{status[p.status]}</Etiqueta>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-cinza"><span>Semáforo do prazo:</span><IndicadorSemaforoProjeto prazo={p.dataPrevistaConclusao} status={p.status} limites={limites} /></div>
    </div>
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
    <section>
      <h2 className="text-[21px]">Tarefas do projeto</h2>
      <div className="mt-4 overflow-hidden border border-linha bg-branco">
        {p.tarefas.length === 0 ? <p className="px-5 py-8 text-[14px] text-cinza">Nenhuma tarefa disponível.</p> : p.tarefas.map(t => { const progresso = t.subtarefas.length ? calcularPercentualConclusao(t.subtarefas) : calcularPercentualConclusao([{ ativo: true, status: t.status }]); return <Link href={`/minhas-tarefas/${t.id}`} key={t.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-linha px-5 py-4 hover:bg-papel last:border-b-0"><div><p className="break-words font-[family-name:var(--font-interface)] font-medium text-tinta">{t.nome}</p><p className="mt-1 text-[13px] text-cinza">Prazo: {data(t.prazo)} · <IndicadorSemaforoProjeto prazo={t.prazo} status={t.status} limites={limites} /> · <IndicadorConclusao indicador={progresso} detalhado />{t.subtarefas.length ? " subtarefas" : ""}</p></div><Etiqueta tom={t.status === "CONCLUIDO" ? "positivo" : undefined}>{taskStatus[t.status] ?? t.status}</Etiqueta></Link>; })}
      </div>
    </section>
    <section>
      <h2 className="text-[21px]">Documentos</h2>
      {documentos.length === 0 ? <p className="mt-3 text-[14px] text-cinza">Nenhum documento vinculado a este projeto ou cliente.</p> : <ul className="mt-4 space-y-2">{documentos.map(d => <li key={d.id} className="rounded-[3px] border border-linha bg-branco px-4 py-3"><a href={d.link} target="_blank" rel="noreferrer" className="font-[family-name:var(--font-interface)] text-[14px] text-azul-esc hover:underline">{d.nome} ↗</a></li>)}</ul>}
    </section>
    </div>
  </div>;
}
