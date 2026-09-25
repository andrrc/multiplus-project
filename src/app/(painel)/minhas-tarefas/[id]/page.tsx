import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusSubtarefa } from "@prisma/client";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { buscarTarefaParaColaborador } from "@/lib/projetos-tarefas";
import { concluirSubtarefaFormAction, concluirTarefaFormAction } from "@/app/(painel)/projetos/actions";
import { Comentarios } from "@/app/(painel)/projetos/comentarios";
import { Etiqueta } from "@/ui/campo";

const status: Record<StatusSubtarefa, string> = { EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluída", CANCELADO: "Cancelada" };
const statusTarefa: Record<string, string> = { A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", AGUARDANDO_DOCUMENTO_CLIENTE: "Aguardando documento", VISITA_REUNIAO_AGENDADA: "Visita/reunião agendada", PROTOCOLADO: "Protocolado", SOB_ANALISE_ORGAO_AMBIENTAL: "Sob análise do órgão", COM_EXIGENCIA_A_CUMPRIR: "Com exigência", CONCLUIDO: "Concluída", CANCELADO: "Cancelada" };
const data = (v: Date | null) => v ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(v) : "Sem prazo";

export default async function MinhaTarefaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await exigirAcessoARota("/minhas-tarefas");
  const { id } = await params;
  const t = await buscarTarefaParaColaborador(ctx, id);
  if (!t) notFound();
  return <div className="w-full max-w-[820px]">
    <Link href="/minhas-tarefas" className="font-[family-name:var(--font-interface)] text-[14px] text-azul-esc">← Voltar</Link>
    <div className="mt-5"><p className="text-[14px] text-cinza">{t.projeto.cliente.razaoSocial} · <Link href={`/meus-projetos/${t.projeto.id}`} className="text-azul-esc hover:underline">{t.projeto.nome}</Link></p><div className="mt-1 flex flex-wrap items-center justify-between gap-3"><h1 className="text-[28px]">{t.nome}</h1><Etiqueta tom={t.status === "CONCLUIDO" ? "positivo" : undefined}>{statusTarefa[t.status] ?? t.status}</Etiqueta></div><p className="mt-3 text-[15px] text-cinza">Prazo: <strong className="font-medium text-tinta">{data(t.prazo)}</strong></p></div>
    {t.descricao && <p className="mt-6 text-[15px] leading-7 text-cinza">{t.descricao}</p>}
    <section className="mt-8 border-t border-linha pt-6"><h2 className="text-[20px]">Subtarefas</h2><div className="mt-4 overflow-hidden border border-linha bg-branco">{t.subtarefas.length === 0 ? <p className="px-5 py-6 text-[14px] text-cinza">Nenhuma subtarefa nesta tarefa.</p> : t.subtarefas.map(s => <details key={s.id} className="border-b border-linha px-5 py-4 last:border-b-0"><summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3"><span className="font-medium text-tinta">{s.titulo}</span><Etiqueta tom={s.status === StatusSubtarefa.CONCLUIDO ? "positivo" : undefined}>{status[s.status]}</Etiqueta></summary><div className="mt-4 rounded-[3px] border border-linha bg-papel p-4"><p className="text-[14px] leading-6 text-cinza">{s.descricao || "Sem descrição."}</p><p className="mt-3 text-[13px] text-cinza">Prazo: <strong className="font-medium text-tinta">{data(s.prazo)}</strong> · Responsável: <strong className="font-medium text-tinta">{s.atribuidoA?.nome ?? s.atribuidoAUsuario?.nome ?? "Não definido"}</strong></p>{s.etiquetas.length > 0 && <p className="mt-2 text-[13px] text-cinza">Etiquetas: <strong className="font-medium text-tinta">{s.etiquetas.join(" · ")}</strong></p>}{s.status === StatusSubtarefa.EM_ANDAMENTO && s.responsavelDaSessao && <form action={concluirSubtarefaFormAction.bind(null, s.id)} className="mt-3"><button className="rounded-[3px] bg-verde px-3 py-2 text-[13px] font-medium">Marcar como concluída</button></form>}<Comentarios alvo={{ subtarefaId: s.id }} nivel="subtarefa" entidadeId={s.id} tarefaId={t.id} /></div></details>)}</div></section>
    {t.podeConcluirTarefa && t.status !== "CONCLUIDO" && t.status !== "CANCELADO" && <form action={concluirTarefaFormAction.bind(null, t.id)} className="mt-8"><button className="min-h-11 rounded-[3px] bg-verde px-5 font-[family-name:var(--font-interface)] text-[14px] font-semibold text-tinta hover:bg-verde-esc hover:text-branco">Marcar tarefa como concluída</button><p className="mt-2 text-[13px] text-cinza">Essa é a única alteração disponível para a sua função.</p></form>}
  </div>;
}
