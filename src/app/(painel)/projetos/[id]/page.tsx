/**
 * Página da rota `src/app/(painel)/projetos/[id]/page.tsx`. Recebe os parâmetros da URL ou da rota, valida o acesso no servidor, obtém os dados necessários e compõe a resposta visual; as regras de negócio permanecem nas funções de domínio chamadas por ela.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { buscarProjeto } from "@/lib/projetos-tarefas";
import { formatarMoeda } from "@/lib/formatacao";
import { formatarDataHoraBrasilia, calcularDiasRestantes } from "@/lib/datas";
import { Etiqueta, inputClass } from "@/ui/campo";
import { alterarStatusProjetoAction, alterarStatusTarefaAction, definirAtivoProjetoAction, criarDocumentoProjetoAction } from "../actions";
import { Comentarios } from "../comentarios";
import { StatusInline, StatusCardInline } from "@/ui/status-inline";
import { IndicadorSemaforoProjeto } from "@/ui/indicador-dias-restantes";
import { buscarLimitesSemaforo } from "@/lib/semaforo";
import { calcularPercentualConclusao } from "@/lib/regras-projetos-tarefas";
import { codigoProjeto, codigoTarefa } from "@/lib/identificadores-hierarquicos";
import { botaoDiscretoPequeno, botaoPrimarioPequeno, botaoSecundario } from "@/ui/botoes";
import { BotaoConfirmacao } from "@/ui/botao-confirmacao";
import { BlocoLateral, Cartao, CartaoLateral, CelulaResumo, FaixaResumo, ListaChaveValor, NaoInformado, Trilha } from "@/ui/cartao";
import { CelulaPrazo } from "@/ui/lista";

const projetoStatus: Record<string, string> = { A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", CANCELADO: "Cancelado" };
const tarefaStatus: Record<string, string> = { A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", AGUARDANDO_DOCUMENTO_CLIENTE: "Aguardando documento", VISITA_REUNIAO_AGENDADA: "Visita/reunião agendada", PROTOCOLADO: "Protocolado", SOB_ANALISE_ORGAO_AMBIENTAL: "Sob análise do órgão", COM_EXIGENCIA_A_CUMPRIR: "Com exigência", CONCLUIDO: "Concluído", CANCELADO: "Cancelado" };
const data = (v: Date | null) => v ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(v) : null;

type ItemComPrazo = { ativo: boolean; status: string; prazo: Date | null };
/** Item ainda em aberto: ativo e nem concluído nem cancelado. */
const emAberto = (item: ItemComPrazo) => item.ativo && item.status !== "CONCLUIDO" && item.status !== "CANCELADO";
const plural = (n: number, singular: string, pluralTexto: string) => `${n} ${n === 1 ? singular : pluralTexto}`;

export default async function ProjetoDetalhePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tarefas?: string }> }) {
  const ctx = await exigirAcessoARota("/projetos");
  const { id } = await params;
  const { tarefas: filtroTarefas } = await searchParams;
  const [projeto, limites] = await Promise.all([buscarProjeto(ctx, id, true), buscarLimitesSemaforo(ctx)]);
  if (!projeto) notFound();

  const conclusao = calcularPercentualConclusao(projeto.tarefas);
  const rotuloStatus = projeto.ativo ? projetoStatus[projeto.status] ?? projeto.status : "Desativado";

  // Pendências: itens abertos já vencidos e tarefas que vencem dentro do limite do semáforo.
  const tarefasAbertas = projeto.tarefas.filter(emAberto);
  const subtarefasAbertas = tarefasAbertas.flatMap((t) => t.subtarefas.filter(emAberto));
  const diasDe = (item: ItemComPrazo) => (item.prazo ? calcularDiasRestantes(item.prazo) : null);
  const tarefasAtrasadas = tarefasAbertas.filter((t) => (diasDe(t) ?? 0) < 0).length;
  const subtarefasAtrasadas = subtarefasAbertas.filter((s) => (diasDe(s) ?? 0) < 0).length;
  const totalAtrasadas = tarefasAtrasadas + subtarefasAtrasadas;
  const tarefasProximas = tarefasAbertas.filter((t) => { const dias = diasDe(t); return dias !== null && dias >= 0 && dias <= limites.diasAmareloAte; }).length;

  // A lista abre só com as tarefas em aberto; "Todas" inclui concluídas, canceladas e desativadas.
  const mostrarTodas = filtroTarefas === "todas";
  const tarefasVisiveis = mostrarTodas ? projeto.tarefas : tarefasAbertas;

  return (
    <div className="w-full max-w-[1280px]">
      <Trilha itens={[{ rotulo: "Projetos", href: "/projetos" }, { rotulo: projeto.cliente.razaoSocial, href: `/clientes/${projeto.clienteId}` }]} />

      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-[26px]">{projeto.nome}</h1>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] text-cinza">
            <span>Cliente <Link href={`/clientes/${projeto.clienteId}`} className="font-medium text-ink hover:text-azul-esc hover:underline">{projeto.cliente.razaoSocial}</Link></span>
            <span>Proposta <b className="font-medium tabular-nums text-ink">{projeto.numeroProposta ?? "não informada"}</b></span>
            <span className="tabular-nums">{codigoProjeto(projeto.cliente.numeroIdentificacao, projeto.numeroLocal)}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {projeto.ativo
            ? <StatusCardInline status={projeto.status} label={rotuloStatus} opcoes={Object.entries(projetoStatus).map(([valor, label]) => ({ valor, label }))} action={alterarStatusProjetoAction.bind(null, id)} />
            : <Etiqueta tom="apagado">Desativado</Etiqueta>}
          <Link href={`/projetos/${id}/editar`} className={botaoSecundario}>Editar</Link>
          {projeto.ativo ? (
            <BotaoConfirmacao
              rotulo="Desativar"
              titulo={`Desativar o projeto "${projeto.nome}"?`}
              descricao={
                <>
                  <p>O projeto sai das listas e fica só para consulta:</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>as tarefas e subtarefas deixam de aparecer e de gerar avisos;</li>
                    <li>o histórico, os comentários e os documentos ficam guardados;</li>
                    <li>o projeto pode ser reativado a qualquer momento.</li>
                  </ul>
                </>
              }
              rotuloConfirmar="Desativar projeto"
              action={definirAtivoProjetoAction.bind(null, id, false)}
            />
          ) : (
            <form action={definirAtivoProjetoAction.bind(null, id, true)}>
              <button className={botaoSecundario}>Reativar</button>
            </form>
          )}
        </div>
      </div>

      <FaixaResumo rotulo="Resumo do projeto" colunas={4}>
        <CelulaResumo rotulo="Prazo de conclusão" detalhe={projeto.dataInicio ? `Início em ${data(projeto.dataInicio)}` : undefined}>
          {projeto.dataPrevistaConclusao ? <span>{data(projeto.dataPrevistaConclusao)}</span> : <span className="text-faint">Sem previsão</span>}
          <IndicadorSemaforoProjeto prazo={projeto.dataPrevistaConclusao} status={projeto.status} ativo={projeto.ativo} limites={limites} />
        </CelulaResumo>
        <CelulaResumo rotulo="Progresso" detalhe={conclusao.total > 0 ? `${conclusao.concluidas} de ${conclusao.total} tarefas concluídas` : "Sem tarefas ativas"}>
          {conclusao.percentual === null ? <span className="text-faint">—</span> : <span>{conclusao.percentual}%</span>}
          {conclusao.percentual !== null && (
            <span aria-hidden="true" className="block h-1.5 w-full basis-full overflow-hidden rounded-full bg-linha"><span className="block h-full bg-verde" style={{ width: `${conclusao.percentual}%` }} /></span>
          )}
        </CelulaResumo>
        <CelulaResumo rotulo="Pendências" detalhe={tarefasProximas > 0 ? `${plural(tarefasProximas, "tarefa vence", "tarefas vencem")} em até ${limites.diasAmareloAte} ${limites.diasAmareloAte === 1 ? "dia" : "dias"}` : "Nenhuma tarefa vence em breve"}>
          {totalAtrasadas > 0
            ? <span className="text-critico">{plural(totalAtrasadas, "item atrasado", "itens atrasados")}</span>
            : <span className="text-verde-esc">Nada atrasado</span>}
        </CelulaResumo>
        <CelulaResumo rotulo="Valor contratado">
          {projeto.valorContratado ? <span>{formatarMoeda(projeto.valorContratado.valorContratado)}</span> : <NaoInformado />}
        </CelulaResumo>
      </FaixaResumo>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <Cartao
            titulo="Tarefas"
            semMargem
            acao={
              <div className="flex flex-wrap items-center gap-3">
                <div role="group" aria-label="Filtrar tarefas" className="flex gap-1">
                  {[{ valor: "abertas", rotulo: "Abertas", total: tarefasAbertas.length }, { valor: "todas", rotulo: "Todas", total: projeto.tarefas.length }].map((aba) => {
                    const ativa = (aba.valor === "todas") === mostrarTodas;
                    return (
                      <Link
                        key={aba.valor}
                        href={aba.valor === "todas" ? `/projetos/${id}?tarefas=todas` : `/projetos/${id}`}
                        aria-current={ativa ? "true" : undefined}
                        className={`inline-flex min-h-11 items-center rounded-selo px-2.5 text-[13px] hover:bg-papel hover:text-ink md:min-h-8 ${ativa ? "bg-selecionado font-semibold text-ink" : "font-medium text-cinza"}`}
                      >
                        {aba.rotulo}<span className="ml-1 font-medium tabular-nums text-faint">{aba.total}</span>
                      </Link>
                    );
                  })}
                </div>
                <Link href={`/projetos/${id}/tarefas/nova`} className={botaoPrimarioPequeno}>+ Nova tarefa</Link>
              </div>
            }
          >
            {tarefasVisiveis.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-cinza">
                {projeto.tarefas.length === 0 ? "Nenhuma tarefa cadastrada neste projeto." : "Nenhuma tarefa em aberto. Use “Todas” para ver as concluídas."}
              </p>
            ) : (
              <ul>
                {tarefasVisiveis.map((t) => {
                  const pendentes = t.subtarefas.filter((s) => s.ativo && s.status !== "CANCELADO" && !s.atribuidoAId && !s.atribuidoAUsuarioId);
                  const progresso = t.subtarefas.length ? calcularPercentualConclusao(t.subtarefas) : calcularPercentualConclusao([t]);
                  return (
                    <li key={t.id} className="grid gap-3 border-t border-linha px-5 py-3.5 first:border-t-0 hover:bg-cabecalho sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-5">
                      <div className="min-w-0">
                        <Link href={`/tarefas/${t.id}`} className="block break-words font-medium text-ink hover:text-azul-esc">{t.nome}</Link>
                        <p className="mt-px flex flex-wrap items-center gap-x-2 text-[12.5px] text-cinza">
                          <span className="tabular-nums text-faint">{codigoTarefa(projeto.cliente.numeroIdentificacao, projeto.numeroLocal, t.numeroLocal)}</span>
                          {t.responsavel && <span>· {t.responsavel.nome}</span>}
                          {t.subtarefas.length > 0 && progresso.total > 0 && <span className="tabular-nums">· {progresso.concluidas} de {progresso.total} subtarefas</span>}
                        </p>
                        {pendentes.length > 0 && (
                          <Link href={`/tarefas/${t.id}?subtarefa=${pendentes[0].id}#subtarefa-${pendentes[0].id}`} className="mt-1 inline-flex text-[12.5px] font-medium text-ambar underline underline-offset-2">
                            {plural(pendentes.length, "subtarefa aguarda", "subtarefas aguardam")} atribuição
                          </Link>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 xl:grid xl:grid-cols-[104px_178px_44px] xl:justify-items-start">
                        <CelulaPrazo prazo={t.prazo} status={t.status} ativo={t.ativo} limites={limites} />
                        {t.ativo ? (
                          <>
                            <StatusInline status={t.status} label={tarefaStatus[t.status]} opcoes={Object.entries(tarefaStatus).map(([valor, label]) => ({ valor, label }))} action={alterarStatusTarefaAction.bind(null, t.id)} />
                            <Link href={`/tarefas/${t.id}/editar`} className={botaoDiscretoPequeno}>Editar</Link>
                          </>
                        ) : <Etiqueta tom="apagado">Desativada</Etiqueta>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Cartao>

          <Comentarios alvo={{ projetoId: projeto.id }} nivel="projeto" entidadeId={projeto.id} />
        </div>

        <CartaoLateral>
          {projeto.descricao && (
            <BlocoLateral titulo="Descrição">
              <p className="whitespace-pre-wrap break-words text-[13.5px] leading-6 text-cinza">{projeto.descricao}</p>
            </BlocoLateral>
          )}

          <BlocoLateral titulo="Documentos">
            {projeto.documentos.length > 0 && (
              <ul className="mb-3 flex flex-col gap-2">
                {projeto.documentos.map((d) => (
                  <li key={d.id} className="min-w-0 text-[13.5px]">
                    <a href={d.link} target="_blank" rel="noreferrer" className="break-words text-azul-esc hover:underline">{d.nome} <span className="text-faint">↗</span></a>
                  </li>
                ))}
              </ul>
            )}
            {projeto.documentos.length === 0 && <p className="mb-3 text-[13px] text-cinza">Nenhum documento vinculado ainda.</p>}
            <details className="group">
              <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-[13px] font-medium text-azul-esc hover:underline md:min-h-8 [&::-webkit-details-marker]:hidden">Vincular documento</summary>
              <form action={criarDocumentoProjetoAction} className="mt-2 grid gap-2">
                <input type="hidden" name="clienteId" value={projeto.clienteId} />
                <input type="hidden" name="projetoId" value={projeto.id} />
                <input name="nome" aria-label="Nome do documento" required placeholder="Nome do documento" className={inputClass} />
                <input name="link" aria-label="Link do Google Drive" type="url" required placeholder="Link do Google Drive" className={inputClass} />
                <button className={botaoSecundario}>Salvar documento</button>
              </form>
            </details>
          </BlocoLateral>

          <BlocoLateral titulo="Registro">
            <ListaChaveValor
              itens={[
                { rotulo: "Início", valor: data(projeto.dataInicio) ?? <NaoInformado /> },
                { rotulo: "Conclusão prevista", valor: data(projeto.dataPrevistaConclusao) ?? <NaoInformado /> },
                { rotulo: "Criado em", valor: data(projeto.criadoEm) },
                { rotulo: "Última alteração", valor: formatarDataHoraBrasilia(projeto.atualizadoEm) },
              ]}
            />
          </BlocoLateral>
        </CartaoLateral>
      </div>
    </div>
  );
}
