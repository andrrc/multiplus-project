/**
 * Página da rota `src/app/(painel)/minhas-tarefas/[id]/page.tsx` (colaboradores). Recebe os parâmetros da rota, valida o acesso no servidor, obtém os dados e compõe a resposta visual; as regras de conclusão e permissão ficam nas funções de domínio e nas actions.
 */
import { formatarDataHoraBrasilia } from "@/lib/datas";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusSubtarefa } from "@prisma/client";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { buscarTarefaParaColaborador } from "@/lib/projetos-tarefas";
import { buscarLimitesSemaforo } from "@/lib/semaforo";
import { cancelarSolicitacaoConclusaoFormAction, concluirSubtarefaFormAction, concluirTarefaFormAction } from "@/app/(painel)/projetos/actions";
import { Comentarios } from "@/app/(painel)/projetos/comentarios";
import { Etiqueta } from "@/ui/campo";
import { listarEtiquetas } from "@/lib/etiquetas";
import { EtiquetasSubtarefa } from "@/ui/etiquetas-subtarefa";
import { codigoSubtarefa, codigoTarefa } from "@/lib/identificadores-hierarquicos";
import { IndicadorSemaforoProjeto } from "@/ui/indicador-dias-restantes";
import { botaoPrimario, botaoPrimarioPequeno, botaoSecundario, botaoSecundarioPequeno } from "@/ui/botoes";
import { BlocoLateral, Cartao, CartaoLateral, CelulaResumo, FaixaResumo, Trilha } from "@/ui/cartao";
import { CelulaPrazo, StatusPonto } from "@/ui/lista";

const status: Record<StatusSubtarefa, string> = { EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluída", CANCELADO: "Cancelada" };
const statusTarefa: Record<string, string> = { A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", AGUARDANDO_DOCUMENTO_CLIENTE: "Aguardando documento", VISITA_REUNIAO_AGENDADA: "Visita/reunião agendada", PROTOCOLADO: "Protocolado", SOB_ANALISE_ORGAO_AMBIENTAL: "Sob análise do órgão", COM_EXIGENCIA_A_CUMPRIR: "Com exigência", CONCLUIDO: "Concluída", CANCELADO: "Cancelada" };
const data = (v: Date | null) => v ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(v) : null;
const dataHora = (v: Date) => formatarDataHoraBrasilia(v);

export default async function MinhaTarefaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await exigirAcessoARota("/minhas-tarefas");
  const { id } = await params;
  const [t, limites] = await Promise.all([buscarTarefaParaColaborador(ctx, id), buscarLimitesSemaforo(ctx)]);
  if (!t) notFound();
  const catalogoEtiquetas = await listarEtiquetas(ctx);
  const subtarefasSemResponsavel = t.subtarefas.filter(s => s.status !== StatusSubtarefa.CANCELADO && !s.atribuidoAId && !s.atribuidoAUsuarioId);
  const subtarefasConcluidas = t.subtarefas.filter(s => s.status === StatusSubtarefa.CONCLUIDO).length;
  const tarefaAberta = t.status !== "CONCLUIDO" && t.status !== "CANCELADO";
  const podeSolicitar = t.podeConcluirTarefa && tarefaAberta;
  const solicitacao = t.solicitacaoConclusao;
  // Só o colaborador interno tem a tela de projetos; o externo vê apenas o nome.
  const podeAbrirProjeto = ctx.perfil === "ADMIN_INTERNO";

  return <div className="w-full max-w-[1280px]">
    <Trilha itens={[{ rotulo: "Minhas tarefas", href: "/minhas-tarefas" }, { rotulo: t.projeto.nome, href: podeAbrirProjeto ? `/meus-projetos/${t.projeto.id}` : undefined }]} />

    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h1 className="break-words text-[26px]">{t.nome}</h1>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] text-cinza">
          <span className="tabular-nums">{codigoTarefa(t.projeto.cliente.numeroIdentificacao, t.projeto.numeroLocal, t.numeroLocal)}</span>
          <span>{t.projeto.cliente.razaoSocial}</span>
          <span>Criada por {t.criadoPorNome ?? "registro anterior"} em <span className="tabular-nums">{dataHora(t.criadoEm)}</span></span>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <StatusPonto status={t.status}>{statusTarefa[t.status] ?? t.status}</StatusPonto>
        {podeSolicitar && !solicitacao && (
          <form action={concluirTarefaFormAction.bind(null, t.id)}>
            <button className={botaoPrimario} title="A conclusão só será registrada depois da confirmação da Talita.">Solicitar conclusão</button>
          </form>
        )}
      </div>
    </div>

    {podeSolicitar && solicitacao && (
      <div role="status" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-cartao border border-ambar/25 bg-ambar-cl px-5 py-3.5 text-sm text-ambar">
        {solicitacao.solicitadoPorId === ctx.usuarioId
          ? <><span>Sua solicitação de conclusão aguarda confirmação da Talita.</span><form action={cancelarSolicitacaoConclusaoFormAction.bind(null, solicitacao.id)}><button className={botaoSecundario}>Retirar solicitação</button></form></>
          : <span>Pedido de {solicitacao.solicitadoPorNome} aguardando confirmação da Talita.</span>}
      </div>
    )}

    {subtarefasSemResponsavel.length > 0 && <div role="status" className="mb-6 rounded-cartao border border-ambar/25 bg-ambar-cl px-5 py-3.5 text-sm text-ambar"><strong className="font-semibold">Atribuição pendente:</strong> {subtarefasSemResponsavel.length} {subtarefasSemResponsavel.length === 1 ? "subtarefa está" : "subtarefas estão"} sem responsável. A administração precisa definir quem ficará responsável.</div>}

    <FaixaResumo rotulo="Resumo da tarefa" colunas={3}>
      <CelulaResumo rotulo="Prazo">
        {t.prazo ? <span>{data(t.prazo)}</span> : <span className="text-faint">Sem prazo</span>}
        <IndicadorSemaforoProjeto prazo={t.prazo} status={t.status} limites={limites} />
      </CelulaResumo>
      <CelulaResumo rotulo="Subtarefas">
        <span>{subtarefasConcluidas} de {t.subtarefas.length}</span>
        <span className="text-[13px] font-normal text-cinza">concluídas</span>
      </CelulaResumo>
      <CelulaResumo rotulo="Projeto">
        {podeAbrirProjeto
          ? <Link href={`/meus-projetos/${t.projeto.id}`} className="truncate text-base hover:text-azul-esc">{t.projeto.nome}</Link>
          : <span className="truncate text-base">{t.projeto.nome}</span>}
      </CelulaResumo>
    </FaixaResumo>

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <Cartao
        titulo={<>Subtarefas <span className="rounded-full bg-papel px-2 py-px text-xs font-semibold tabular-nums text-ink">{subtarefasConcluidas}/{t.subtarefas.length}</span></>}
        semMargem
        acao={t.podeCriarSubtarefas ? <Link href={`/minhas-tarefas/${id}/subtarefas/nova`} className={botaoPrimarioPequeno}>+ Nova subtarefa</Link> : undefined}
      >
        {t.subtarefas.length === 0 ? <p className="px-5 py-8 text-center text-sm text-cinza">Nenhuma subtarefa nesta tarefa.</p> : t.subtarefas.map(s => (
          <details key={s.id} className="group border-t border-linha first:border-t-0">
            <summary className="grid cursor-pointer list-none gap-2 px-5 py-3.5 hover:bg-cabecalho xl:grid-cols-[minmax(0,1fr)_96px_104px_150px_18px] xl:items-center xl:gap-3 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0">
                <span className="block break-words font-medium text-ink">{s.titulo}</span>
                <span className="mt-px block text-[12.5px] tabular-nums text-faint">{codigoSubtarefa(t.projeto.cliente.numeroIdentificacao, t.projeto.numeroLocal, t.numeroLocal, s.numeroLocal)}</span>
              </span>
              <span className="truncate text-[13px] text-ink">{s.atribuidoA?.nome ?? s.atribuidoAUsuario?.nome ?? <span className="text-faint">Sem responsável</span>}</span>
              <CelulaPrazo prazo={s.prazo} status={s.status} ativo limites={limites} />
              <span className="flex flex-wrap items-center gap-2">
                <StatusPonto status={s.status}>{status[s.status]}</StatusPonto>
                {s.solicitacaoConclusao && <Etiqueta tom="atencao">Aguardando confirmação</Etiqueta>}
              </span>
              <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" className="hidden shrink-0 text-cinza transition-transform group-open:rotate-180 xl:block" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
            </summary>
            <div className="border-t border-linha bg-cabecalho px-5 py-4">
              <p className="text-sm leading-6 text-cinza">{s.descricao || "Sem descrição."}</p>
              <p className="mt-2 text-xs text-cinza">Criado por: {s.criadoPorNome ?? "Registro anterior"} · {dataHora(s.criadoEm)}</p>
              <EtiquetasSubtarefa nomes={s.etiquetas} catalogo={catalogoEtiquetas} />
              {s.status === StatusSubtarefa.EM_ANDAMENTO && s.responsavelDaSessao && (s.solicitacaoConclusao
                ? (s.solicitacaoConclusao.solicitadoPorId === ctx.usuarioId
                  ? <form action={cancelarSolicitacaoConclusaoFormAction.bind(null, s.solicitacaoConclusao.id)} className="mt-3"><p className="text-[13px] text-ambar">Seu pedido está aguardando confirmação da Talita.</p><button className={`mt-2 ${botaoSecundarioPequeno}`}>Retirar solicitação</button></form>
                  : <p className="mt-3 text-[13px] text-ambar">Pedido de {s.solicitacaoConclusao.solicitadoPorNome} aguardando confirmação da Talita.</p>)
                : <form action={concluirSubtarefaFormAction.bind(null, s.id)} className="mt-3"><button className={botaoPrimarioPequeno}>Solicitar conclusão</button></form>)}
              <Comentarios alvo={{ subtarefaId: s.id }} nivel="subtarefa" entidadeId={s.id} tarefaId={t.id} />
            </div>
          </details>
        ))}
      </Cartao>

      {t.descricao && (
        <CartaoLateral>
          <BlocoLateral titulo="Descrição">
            <p className="whitespace-pre-wrap break-words text-[13.5px] leading-6 text-cinza">{t.descricao}</p>
          </BlocoLateral>
        </CartaoLateral>
      )}
    </div>
  </div>;
}
