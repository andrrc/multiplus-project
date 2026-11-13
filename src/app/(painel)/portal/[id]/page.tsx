/**
 * Detalhe do projeto no portal do cliente (protótipo cliente/02-projetos). Mostra só o que o portal já entrega:
 * progresso, datas, tarefas com prazo, responsável e andamento, e os documentos vinculados. A busca pelo id e
 * pelo cliente da sessão acontece no servidor (`buscarProjetoPortal`); esta página não amplia nenhum dado.
 */
import { formatarDataHoraBrasilia } from "@/lib/datas";
import { notFound } from "next/navigation";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { buscarProjetoPortal } from "@/lib/portal-cliente";
import { EtiquetaStatusPortal } from "@/ui/etiqueta-status-portal";
import { IndicadorSemaforoProjeto } from "@/ui/indicador-dias-restantes";
import { codigoProjeto, codigoTarefa } from "@/lib/identificadores-hierarquicos";
import { Cartao, CelulaResumo, FaixaResumo, Trilha } from "@/ui/cartao";
import { StatusPonto } from "@/ui/status-ponto";

const data = (valor: Date | null) => valor
  ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(valor)
  : "Não informada";
const atualizacao = (valor: Date | null) => valor
  ? formatarDataHoraBrasilia(valor)
  : "Sem movimentação";
const projetoStatus: Record<string, string> = { A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", CANCELADO: "Cancelado" };
const tarefaStatus: Record<string, string> = { A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", AGUARDANDO_DOCUMENTO_CLIENTE: "Aguardando documento do cliente", VISITA_REUNIAO_AGENDADA: "Visita/reunião agendada", PROTOCOLADO: "Protocolado", SOB_ANALISE_ORGAO_AMBIENTAL: "Sob análise do órgão ambiental", COM_EXIGENCIA_A_CUMPRIR: "Com exigência a cumprir", CONCLUIDO: "Concluída", CANCELADO: "Cancelada" };

export default async function PortalProjetoPage({ params }: { params: Promise<{ id: string }> }) {
  // A verificação de rota é seguida de busca pelo id e pelo cliente da sessão, evitando IDOR.
  const ctx = await exigirAcessoARota("/portal");
  const { id } = await params;
  const projeto = await buscarProjetoPortal(ctx, id);
  // A função retorna null tanto para item inexistente quanto fora do escopo do cliente.
  if (!projeto) notFound();
  const percentual = projeto.conclusao.percentual;

  return (
    <div className="w-full max-w-[1280px]">
      <Trilha itens={[{ rotulo: "Painel", href: "/portal" }, { rotulo: projeto.nome }]} />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-2xl">{projeto.nome}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-cinza">
            <span className="break-all tabular-nums text-faint">{codigoProjeto(projeto.cliente.numeroIdentificacao, projeto.numeroLocal)}</span>
            <StatusPonto status={projeto.status}>{projetoStatus[projeto.status] ?? projeto.status}</StatusPonto>
          </p>
        </div>
      </div>

      <FaixaResumo rotulo="Resumo do projeto" colunas={5}>
        <CelulaResumo rotulo="Progresso" detalhe={percentual !== null ? `${projeto.conclusao.concluidas} de ${projeto.conclusao.total} tarefas` : undefined}>
          {percentual === null ? <span className="text-base text-cinza">Sem tarefas ativas</span> : `${percentual}%`}
        </CelulaResumo>
        <CelulaResumo rotulo="Início"><span className="text-base">{data(projeto.dataInicio)}</span></CelulaResumo>
        <CelulaResumo rotulo="Conclusão prevista"><span className="text-base">{data(projeto.dataPrevistaConclusao)}</span></CelulaResumo>
        <CelulaResumo rotulo="Dias restantes"><IndicadorSemaforoProjeto prazo={projeto.dataPrevistaConclusao} status={projeto.status} /></CelulaResumo>
        <CelulaResumo rotulo="Última atualização"><span className="break-words text-base">{atualizacao(projeto.ultimaAtualizacao)}</span></CelulaResumo>
      </FaixaResumo>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <Cartao titulo="Tarefas" semMargem acao={<span className="text-[13px] tabular-nums text-cinza">{projeto.tarefas.length} {projeto.tarefas.length === 1 ? "tarefa" : "tarefas"}</span>}>
          {projeto.tarefas.length === 0 ? (
            <p className="px-5 py-8 text-sm text-cinza">Nenhuma tarefa ativa neste projeto.</p>
          ) : (
            <ul>
              {projeto.tarefas.map((tarefa) => (
                <li key={tarefa.id} className="min-w-0 border-t border-linha px-5 py-4 first:border-t-0">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0">
                      <h3 className="break-words font-[family-name:var(--font-interface)] text-[15px] font-semibold">{tarefa.nome}</h3>
                      <p className="mt-0.5 break-all text-xs tabular-nums text-faint">{codigoTarefa(projeto.cliente.numeroIdentificacao, projeto.numeroLocal, tarefa.numeroLocal)}</p>
                    </div>
                    <EtiquetaStatusPortal status={tarefa.status}>{tarefaStatus[tarefa.status]}</EtiquetaStatusPortal>
                  </div>
                  <dl className="mt-3 grid min-w-0 grid-cols-1 gap-x-6 gap-y-3 text-[13px] sm:grid-cols-3">
                    <div className="min-w-0"><dt className="text-cinza">Prazo</dt><dd className="mt-0.5 break-words tabular-nums">{data(tarefa.prazo)}</dd></div>
                    <div className="min-w-0"><dt className="text-cinza">Responsável</dt><dd className="mt-0.5 break-words">{tarefa.responsavel ?? "Não definido"}</dd></div>
                    <div className="min-w-0">
                      <dt className="text-cinza">{tarefa.progresso.total === 0 ? "Conclusão da tarefa" : "Subtarefas concluídas"}</dt>
                      <dd className="mt-0.5 tabular-nums">
                        {tarefa.progresso.percentual === null ? "Não disponível" : tarefa.progresso.total === 0 ? `${tarefa.progresso.percentual}%` : `${tarefa.progresso.concluidas} de ${tarefa.progresso.total}`}
                      </dd>
                      {tarefa.progresso.percentual !== null && (
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-linha" role="progressbar" aria-label={tarefa.progresso.total === 0 ? "Conclusão da tarefa" : "Subtarefas concluídas"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={tarefa.progresso.percentual} aria-valuetext={tarefa.progresso.total === 0 ? `${tarefa.progresso.percentual}%` : `${tarefa.progresso.concluidas} de ${tarefa.progresso.total} subtarefas`}>
                          <div className="h-full rounded-full bg-verde" style={{ width: `${tarefa.progresso.percentual}%` }} />
                        </div>
                      )}
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <Cartao titulo="Documentos" semMargem>
          {projeto.documentos.length === 0 ? (
            <p className="px-5 py-4 text-sm text-cinza">Nenhum documento vinculado a este projeto.</p>
          ) : (
            <ul>
              {projeto.documentos.map((documento) => (
                <li key={documento.id} className="min-w-0 break-words border-t border-linha px-5 py-3 first:border-t-0">
                  <a href={documento.link} target="_blank" rel="noreferrer" className="font-[family-name:var(--font-interface)] text-sm text-azul-esc hover:underline">{documento.nome} ↗</a>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </div>
    </div>
  );
}
