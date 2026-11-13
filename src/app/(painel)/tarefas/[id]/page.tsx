/**
 * Página da rota `src/app/(painel)/tarefas/[id]/page.tsx`. Recebe os parâmetros da URL ou da rota, valida o acesso no servidor, obtém os dados necessários e compõe a resposta visual; as regras de negócio permanecem nas funções de domínio chamadas por ela.
 */
import { formatarDataHoraBrasilia, calcularDiasRestantes } from "@/lib/datas";
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
import { StatusCardInline, StatusInline } from "@/ui/status-inline";
import { listarEtiquetas } from "@/lib/etiquetas";
import { EtiquetasSubtarefa } from "@/ui/etiquetas-subtarefa";
import { IndicadorSemaforoProjeto } from "@/ui/indicador-dias-restantes";
import { buscarLimitesSemaforo } from "@/lib/semaforo";
import { codigoSubtarefa, codigoTarefa } from "@/lib/identificadores-hierarquicos";
import { botaoPrimario, botaoPrimarioPequeno, botaoSecundario } from "@/ui/botoes";
import { BotaoConfirmacao } from "@/ui/botao-confirmacao";
import { Avatar, BlocoLateral, Cartao, CartaoLateral, CelulaResumo, FaixaResumo, ListaChaveValor, Trilha } from "@/ui/cartao";
import { CelulaPrazo, StatusPonto } from "@/ui/lista";

const statuses: Record<string, string> = {
  A_INICIAR: "A iniciar",
  EM_ANDAMENTO: "Em andamento",
  AGUARDANDO_DOCUMENTO_CLIENTE: "Aguardando documento",
  VISITA_REUNIAO_AGENDADA: "Visita/reunião agendada",
  PROTOCOLADO: "Protocolado",
  SOB_ANALISE_ORGAO_AMBIENTAL: "Sob análise do órgão",
  COM_EXIGENCIA_A_CUMPRIR: "Com exigência",
  CONCLUIDO: "Concluída",
  CANCELADO: "Cancelada",
};
const PERIODICIDADE: Record<string, string> = { SEMANAL: "semanal", MENSAL: "mensal", TRIMESTRAL: "trimestral", SEMESTRAL: "semestral", ANUAL: "anual" };

const data = (v: Date | null) => v ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(v) : null;
const dataHora = (v: Date) => formatarDataHoraBrasilia(v);
const statusSubtarefa: Record<StatusSubtarefa, string> = { EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluída", CANCELADO: "Cancelada" };
const plural = (n: number, singular: string, pluralTexto: string) => `${n} ${n === 1 ? singular : pluralTexto}`;

export default async function TarefaDetalhePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ subtarefa?: string }> }) {
  const ctx = await exigirAcessoARota("/tarefas");
  const { id } = await params;
  const { subtarefa: subtarefaSelecionada } = await searchParams;
  const t = await buscarTarefa(ctx, id, true);
  if (!t) notFound();
  const [{ pessoas, usuarios }, catalogoEtiquetas, limites] = await Promise.all([
    listarPessoasParaProjeto(ctx, t.projeto.clienteId),
    listarEtiquetas(ctx),
    buscarLimitesSemaforo(ctx),
  ]);
  const subtarefasSemResponsavel = t.subtarefas.filter(s => s.ativo && s.status !== StatusSubtarefa.CANCELADO && !s.atribuidoAId && !s.atribuidoAUsuarioId);
  const subtarefasConcluidas = t.subtarefas.filter(s => s.status === StatusSubtarefa.CONCLUIDO).length;
  const subtarefasAtrasadas = t.subtarefas.filter(s => s.ativo && s.status === StatusSubtarefa.EM_ANDAMENTO && s.prazo && calcularDiasRestantes(s.prazo) < 0).length;

  return (
    <div className="w-full max-w-[1280px]">
      <Trilha itens={[
        { rotulo: "Projetos", href: "/projetos" },
        { rotulo: t.projeto.cliente.razaoSocial, href: `/clientes/${t.projeto.clienteId}` },
        { rotulo: t.projeto.nome, href: `/projetos/${t.projetoId}` },
      ]} />

      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-[26px]">{t.nome}</h1>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] text-cinza">
            <span className="tabular-nums">{codigoTarefa(t.projeto.cliente.numeroIdentificacao, t.projeto.numeroLocal, t.numeroLocal)}</span>
            {t.periodicidade && <span>Recorrente: <b className="font-medium text-ink">{PERIODICIDADE[t.periodicidade] ?? t.periodicidade}</b></span>}
            <span>Criada por {t.criadoPorNome ?? "registro anterior"} em <span className="tabular-nums">{dataHora(t.criadoEm)}</span></span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {t.ativo ? (
            <>
              <StatusCardInline status={t.status} label={statuses[t.status]} opcoes={Object.entries(statuses).map(([valor, label]) => ({ valor, label }))} action={alterarStatusTarefaAction.bind(null, id)} />
              <Link href={`/tarefas/${id}/editar`} className={botaoSecundario}>Editar</Link>
              {t.status !== "CONCLUIDO" && <form action={concluirTarefaAction.bind(null, id)}><button className={botaoPrimario}>Marcar como concluída</button></form>}
              <BotaoConfirmacao
                rotulo="Desativar"
                titulo={`Desativar a tarefa "${t.nome}"?`}
                descricao={
                  <>
                    <p>A tarefa sai das listas e fica só para consulta:</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      <li>as subtarefas deixam de aparecer e de gerar avisos;</li>
                      <li>o histórico e os comentários ficam guardados;</li>
                      <li>a tarefa pode ser reativada a qualquer momento.</li>
                    </ul>
                  </>
                }
                rotuloConfirmar="Desativar tarefa"
                action={excluirTarefaAction.bind(null, id)}
              />
            </>
          ) : (
            <>
              <Etiqueta tom="apagado">Desativada</Etiqueta>
              <form action={definirAtivoTarefaFormAction.bind(null, id, true)}><button className={botaoSecundario}>Reativar tarefa</button></form>
            </>
          )}
        </div>
      </div>

      <FaixaResumo rotulo="Resumo da tarefa" colunas={4}>
        <CelulaResumo rotulo="Prazo" detalhe={t.diasAntecedencia ? `Aviso ao responsável ${plural(t.diasAntecedencia, "dia", "dias")} antes` : undefined}>
          {t.prazo ? <span>{data(t.prazo)}</span> : <span className="text-faint">Sem prazo</span>}
          <IndicadorSemaforoProjeto prazo={t.prazo} status={t.status} ativo={t.ativo} limites={limites} />
        </CelulaResumo>
        <CelulaResumo rotulo="Responsável">
          {t.responsavel ? <><Avatar nome={t.responsavel.nome} /><span className="text-base">{t.responsavel.nome}</span></> : <span className="text-faint">Sem responsável</span>}
        </CelulaResumo>
        <CelulaResumo rotulo="Subtarefas" detalhe={subtarefasAtrasadas > 0 ? <span className="text-critico">{plural(subtarefasAtrasadas, "atrasada", "atrasadas")}</span> : undefined}>
          <span>{subtarefasConcluidas} de {t.subtarefas.length}</span>
          <span className="text-[13px] font-normal text-cinza">concluídas</span>
        </CelulaResumo>
        <CelulaResumo rotulo="Recorrência">
          {t.periodicidade ? <span className="capitalize">{PERIODICIDADE[t.periodicidade] ?? t.periodicidade}</span> : <span className="text-faint">Não recorrente</span>}
        </CelulaResumo>
      </FaixaResumo>

      {subtarefasSemResponsavel.length > 0 && <div role="status" className="mb-6 rounded-cartao border border-ambar/25 bg-ambar-cl px-5 py-3.5 text-sm text-ambar">
        <strong className="font-semibold">Atribuição pendente:</strong> {subtarefasSemResponsavel.length} {subtarefasSemResponsavel.length === 1 ? "subtarefa está" : "subtarefas estão"} sem responsável.
        <Link href={`/tarefas/${id}?subtarefa=${subtarefasSemResponsavel[0].id}#subtarefa-${subtarefasSemResponsavel[0].id}`} className="ml-1 font-semibold underline underline-offset-2">Atribuir agora</Link>
      </div>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <Cartao
            titulo={<>Subtarefas <span className="rounded-full bg-papel px-2 py-px text-xs font-semibold tabular-nums text-ink">{subtarefasConcluidas}/{t.subtarefas.length}</span></>}
            semMargem
            acao={t.ativo ? <Link href={`/tarefas/${id}/subtarefas/nova`} className={botaoPrimarioPequeno}>+ Nova subtarefa</Link> : undefined}
          >
            {t.subtarefas.length === 0 ? <p className="px-5 py-8 text-center text-sm text-cinza">Nenhuma subtarefa ainda. Cadastre a primeira etapa para esta tarefa.</p> : t.subtarefas.map(s => (
              <details key={s.id} id={`subtarefa-${s.id}`} open={subtarefaSelecionada === s.id} className="group border-t border-linha first:border-t-0">
                <summary className="grid cursor-pointer list-none gap-2 px-5 py-3.5 hover:bg-cabecalho xl:grid-cols-[minmax(0,1fr)_96px_104px_140px_18px] xl:items-center xl:gap-3 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0">
                    <span className="block break-words font-medium text-ink">{s.titulo}</span>
                    <span className="mt-px flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-cinza">
                      <span className="tabular-nums text-faint">{codigoSubtarefa(t.projeto.cliente.numeroIdentificacao, t.projeto.numeroLocal, t.numeroLocal, s.numeroLocal)}</span>
                      <EtiquetasSubtarefa nomes={s.etiquetas} catalogo={catalogoEtiquetas} compacta />
                    </span>
                  </span>
                  <span className="truncate text-[13px] text-ink">{s.atribuidoA?.nome ?? s.atribuidoAUsuario?.nome ?? <span className="text-faint">Sem responsável</span>}</span>
                  <CelulaPrazo prazo={s.prazo} status={s.status} ativo={s.ativo} limites={limites} />
                  <StatusPonto status={s.status}>{statusSubtarefa[s.status]}</StatusPonto>
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" className="hidden shrink-0 text-cinza transition-transform group-open:rotate-180 xl:block" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
                </summary>
                <div className="border-t border-linha bg-cabecalho px-5 py-4">
                  <p className="text-sm leading-6 text-cinza">{s.descricao || "Sem descrição."}</p>
                  <p className="mt-2 text-xs text-cinza">Criado por: {s.criadoPorNome ?? "Registro anterior"} · {dataHora(s.criadoEm)}</p>
                  <EtiquetasSubtarefa nomes={s.etiquetas} catalogo={catalogoEtiquetas} />
                  {t.ativo && s.ativo && <Link href={`/tarefas/${id}/subtarefas/${s.id}/editar`} className={`mt-3 ${botaoSecundario}`}>Editar subtarefa</Link>}
                  {t.ativo && s.ativo && <form action={atualizarResponsavelSubtarefaFormAction.bind(null, s.id)} className="mt-4 flex flex-wrap items-end gap-2"><label className="grid gap-1 text-xs font-medium">Responsável<select name="responsavelId" required defaultValue={s.atribuidoAUsuarioId ? `usuario:${s.atribuidoAUsuarioId}` : s.atribuidoAId ?? ""} className={`${inputClass} min-w-[220px]`}><option value="" disabled>Selecione</option><optgroup label="Equipe Múltiplus">{usuarios.map(u => <option key={u.id} value={`usuario:${u.id}`}>{u.nome}</option>)}</optgroup><optgroup label="Pessoas envolvidas">{pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</optgroup></select></label><button className={botaoSecundario}>Salvar responsável</button></form>}
                  {t.ativo && s.ativo && <div className="mt-3"><StatusInline status={s.status} label={statusSubtarefa[s.status]} opcoes={Object.values(StatusSubtarefa).map(valor => ({ valor, label: statusSubtarefa[valor] }))} action={atualizarStatusSubtarefaAction.bind(null, s.id)} alinhar="esquerda" /></div>}
                  {t.ativo && s.ativo && <Comentarios alvo={{ subtarefaId: s.id }} nivel="subtarefa" entidadeId={s.id} tarefaId={t.id} />}
                </div>
              </details>
            ))}
          </Cartao>

          <Comentarios alvo={{ tarefaId: t.id }} nivel="tarefa" entidadeId={t.id} />
        </div>

        <CartaoLateral>
          {t.descricao && (
            <BlocoLateral titulo="Descrição">
              <p className="whitespace-pre-wrap break-words text-[13.5px] leading-6 text-cinza">{t.descricao}</p>
            </BlocoLateral>
          )}
          <BlocoLateral titulo="Configuração">
            <ListaChaveValor
              itens={[
                { rotulo: "Periodicidade", valor: t.periodicidade ? <span className="capitalize">{PERIODICIDADE[t.periodicidade] ?? t.periodicidade}</span> : "Não recorrente" },
                { rotulo: "Aviso antes do prazo", valor: t.diasAntecedencia ? plural(t.diasAntecedencia, "dia", "dias") : <span className="text-cinza">Sem aviso extra</span> },
                { rotulo: "Responsável cria subtarefas", valor: t.colaboradorPodeCriarSubtarefas ? "Sim" : "Não" },
              ]}
            />
          </BlocoLateral>
          <BlocoLateral titulo="Registro">
            <ListaChaveValor
              itens={[
                { rotulo: "Criada por", valor: t.criadoPorNome ?? "Registro anterior" },
                { rotulo: "Criada em", valor: dataHora(t.criadoEm) },
                { rotulo: "Última alteração", valor: dataHora(t.atualizadoEm) },
              ]}
            />
          </BlocoLateral>
        </CartaoLateral>
      </div>
    </div>
  );
}
