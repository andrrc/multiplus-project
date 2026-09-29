import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { buscarTarefa, listarPessoasParaProjeto } from "@/lib/projetos-tarefas";
import {
  concluirTarefaAction,
  atualizarStatusSubtarefaAction,
  alterarStatusTarefaAction,
  atualizarResponsavelSubtarefaFormAction,
  definirAtivoTarefaFormAction,
  excluirTarefaAction,
} from "@/app/(painel)/projetos/actions";
import { Etiqueta, inputClass } from "@/ui/campo";
import { Comentarios } from "@/app/(painel)/projetos/comentarios";
import { StatusSubtarefa } from "@prisma/client";
import { StatusInline } from "@/ui/status-inline";
import { listarEtiquetas } from "@/lib/etiquetas";
import { EtiquetasSubtarefa } from "@/ui/etiquetas-subtarefa";

const statuses: Record<string, string> = {
  A_INICIAR: "A iniciar",
  EM_ANDAMENTO: "Em andamento",
  AGUARDANDO_DOCUMENTO_CLIENTE: "Aguardando documento",
  VISITA_REUNIAO_AGENDADA: "Visita/reunião agendada",
  PROTOCOLADO: "Protocolado",
  SOB_ANALISE_ORGAO_AMBIENTAL: "Sob análise do órgão",
  COM_EXIGENCIA_A_CUMPRIR: "Com exigência",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

const data = (v: Date | null) => v
  ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(v)
  : "—";
const dataHora = (v: Date) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(v);
const statusSubtarefa: Record<StatusSubtarefa, string> = { EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluída", CANCELADO: "Cancelada" };

export default async function TarefaDetalhePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ subtarefa?: string }> }) {
  const ctx = await exigirAcessoARota("/tarefas");
  const { id } = await params;
  const { subtarefa: subtarefaSelecionada } = await searchParams;
  const t = await buscarTarefa(ctx, id, true);
  if (!t) notFound();
  const [{ pessoas, usuarios }, catalogoEtiquetas] = await Promise.all([
    listarPessoasParaProjeto(ctx, t.projeto.clienteId),
    listarEtiquetas(ctx),
  ]);
  const subtarefasSemResponsavel = t.subtarefas.filter(s => s.ativo && s.status !== StatusSubtarefa.CANCELADO && !s.atribuidoAId && !s.atribuidoAUsuarioId);

  return (
    <div className="w-full max-w-[980px]">
      <Link href={`/projetos/${t.projetoId}`} className="font-[family-name:var(--font-interface)] text-[14px] text-azul-esc hover:underline">
        ← {t.projeto.nome}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[14px] text-cinza">{t.projeto.cliente.razaoSocial}</p>
          <h1 className="mt-1 text-[28px]">{t.nome}</h1>
          <p className="mt-2 text-[15px] text-cinza">Prazo: <strong className="font-medium text-tinta">{data(t.prazo)}</strong>{t.responsavel ? ` · Responsável: ${t.responsavel.nome}` : ""}</p>
          <p className="mt-1 text-[12px] text-cinza">Criado por: {t.criadoPorNome ?? "Registro anterior"} · {dataHora(t.criadoEm)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {t.ativo ? <StatusInline status={t.status} label={statuses[t.status]} opcoes={Object.entries(statuses).map(([valor, label]) => ({ valor, label }))} action={alterarStatusTarefaAction.bind(null, id)} /> : <Etiqueta tom="apagado">Desativada</Etiqueta>}
          {t.ativo ? <>
            <Link href={`/tarefas/${id}/editar`} className="rounded-[3px] border border-linha px-3 py-2 font-[family-name:var(--font-interface)] text-[13px] hover:border-azul">Editar</Link>
            {t.status !== "CONCLUIDO" && <form action={concluirTarefaAction.bind(null, id)}><button className="rounded-[3px] bg-verde px-3 py-2 font-[family-name:var(--font-interface)] text-[13px] font-semibold text-tinta">Marcar como concluída</button></form>}
            <form action={excluirTarefaAction.bind(null, id)}><button className="rounded-[3px] border border-critico px-3 py-2 font-[family-name:var(--font-interface)] text-[13px] text-critico hover:bg-critico-cl">Excluir tarefa</button></form>
          </> : <form action={definirAtivoTarefaFormAction.bind(null, id, true)}><button className="rounded-[3px] border border-linha px-3 py-2 font-[family-name:var(--font-interface)] text-[13px] hover:border-verde">Reativar tarefa</button></form>}
        </div>
      </div>
      {t.descricao && <p className="mt-6 max-w-[70ch] text-[15px] text-cinza">{t.descricao}</p>}

      {subtarefasSemResponsavel.length > 0 && <div role="status" className="mt-5 rounded-[3px] border border-ambar/30 bg-ambar/8 px-4 py-3 text-[14px] text-tinta">
        <strong className="font-semibold">Atribuição pendente:</strong> {subtarefasSemResponsavel.length} {subtarefasSemResponsavel.length === 1 ? "subtarefa está" : "subtarefas estão"} sem responsável.
        <Link href={`/tarefas/${id}?subtarefa=${subtarefasSemResponsavel[0].id}#subtarefa-${subtarefasSemResponsavel[0].id}`} className="ml-1 font-semibold text-azul-esc underline underline-offset-2">Atribuir agora</Link>
      </div>}

      <section className="mt-9 max-w-[860px]">
        <div>
          <h2 className="text-[21px]">Subtarefas <span className="font-[family-name:var(--font-interface)] text-[14px] text-cinza">({t.subtarefas.filter(s => s.status === StatusSubtarefa.CONCLUIDO).length}/{t.subtarefas.length})</span></h2>
          <p className="mt-1 text-[14px] text-cinza">Cada subtarefa tem prazo, responsável, status e acompanhamento próprios.</p>
        </div>

        <div className="mt-4 overflow-hidden rounded-[3px] border border-linha bg-branco">
          {t.subtarefas.length === 0 ? <p className="px-5 py-8 text-[14px] text-cinza">Nenhuma subtarefa ainda. Cadastre a primeira etapa para esta tarefa.</p> : t.subtarefas.map(s => (
            <details key={s.id} id={`subtarefa-${s.id}`} open={subtarefaSelecionada === s.id} className="border-b border-linha px-5 py-4 last:border-b-0">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                <span className="flex flex-wrap items-center gap-2 font-medium text-tinta"><span>{s.titulo}</span><EtiquetasSubtarefa nomes={s.etiquetas} catalogo={catalogoEtiquetas} compacta /></span>
                <span className="flex items-center gap-3 text-[13px] text-cinza"><span>Prazo: {data(s.prazo)}</span><span>{s.atribuidoA?.nome ?? s.atribuidoAUsuario?.nome ?? "Sem responsável"}</span><Etiqueta tom={s.status === StatusSubtarefa.CONCLUIDO ? "positivo" : s.status === StatusSubtarefa.CANCELADO ? "apagado" : undefined}>{statusSubtarefa[s.status]}</Etiqueta></span>
              </summary>
              <div className="mt-4 rounded-[3px] border border-linha bg-papel p-4">
                <p className="text-[14px] leading-6 text-cinza">{s.descricao || "Sem descrição."}</p>
                <p className="mt-2 text-[12px] text-cinza">Criado por: {s.criadoPorNome ?? "Registro anterior"} · {dataHora(s.criadoEm)}</p>
                <EtiquetasSubtarefa nomes={s.etiquetas} catalogo={catalogoEtiquetas} />
                {t.ativo && s.ativo && <Link href={`/tarefas/${id}/subtarefas/${s.id}/editar`} className="mt-3 inline-flex min-h-9 items-center rounded-[3px] border border-linha bg-branco px-3 text-[13px] font-medium hover:border-azul hover:text-azul-esc">Editar subtarefa</Link>}
                {t.ativo && s.ativo && <form action={atualizarResponsavelSubtarefaFormAction.bind(null, s.id)} className="mt-4 flex flex-wrap items-end gap-2"><label className="grid gap-1 text-[12px] font-medium">Responsável<select name="responsavelId" required defaultValue={s.atribuidoAUsuarioId ? `usuario:${s.atribuidoAUsuarioId}` : s.atribuidoAId ?? ""} className={`${inputClass} min-w-[220px]`}><option value="" disabled>Selecione</option><optgroup label="Equipe Múltiplus">{usuarios.map(u => <option key={u.id} value={`usuario:${u.id}`}>{u.nome}</option>)}</optgroup><optgroup label="Pessoas envolvidas">{pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</optgroup></select></label><button className="min-h-11 rounded-[3px] border border-linha bg-branco px-3 text-[13px] hover:border-azul">Salvar responsável</button></form>}
                {t.ativo && s.ativo && <details className="mt-3"><summary className="inline-flex cursor-pointer list-none"><Etiqueta tom={s.status === StatusSubtarefa.CONCLUIDO ? "positivo" : s.status === StatusSubtarefa.CANCELADO ? "apagado" : undefined}>{statusSubtarefa[s.status]} ▾</Etiqueta></summary><div className="mt-2 flex flex-wrap gap-2">{Object.values(StatusSubtarefa).map(status => <form key={status} action={atualizarStatusSubtarefaAction.bind(null, s.id)}><button name="status" value={status} className="rounded-[3px] border border-linha bg-branco px-3 py-2 text-[12px] hover:border-azul">{statusSubtarefa[status]}</button></form>)}</div></details>}
                {t.ativo && s.ativo && <Comentarios alvo={{ subtarefaId: s.id }} nivel="subtarefa" entidadeId={s.id} tarefaId={t.id} />}
              </div>
            </details>
          ))}
        </div>

        {t.ativo && <Link href={`/tarefas/${id}/subtarefas/nova`} className="mt-4 inline-flex rounded-[3px] bg-tinta px-4 py-2.5 font-[family-name:var(--font-interface)] text-[13px] font-semibold text-branco hover:bg-azul-esc">+ Nova subtarefa</Link>}
      </section>

      <Comentarios alvo={{ tarefaId: t.id }} nivel="tarefa" entidadeId={t.id} />
    </div>
  );
}
