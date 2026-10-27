/**
 * Página da rota `src/app/(painel)/portal/[id]/page.tsx`. Recebe os parâmetros da URL ou da rota, valida o acesso no servidor, obtém os dados necessários e compõe a resposta visual; as regras de negócio permanecem nas funções de domínio chamadas por ela.
 */
import { formatarDataHoraBrasilia } from "@/lib/datas";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { buscarProjetoPortal } from "@/lib/portal-cliente";
import { EtiquetaStatusPortal } from "@/ui/etiqueta-status-portal";
import { IndicadorSemaforoProjeto } from "@/ui/indicador-dias-restantes";

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
  // O detalhe renderiza progresso, tarefas, responsáveis e documentos já filtrados no servidor.
  return <div className="w-full max-w-[1120px]">
    <Link href="/portal" className="inline-flex min-h-11 items-center font-[family-name:var(--font-interface)] text-[14px] text-azul-esc hover:underline">← Meus projetos</Link>
    <div className="mt-3 flex flex-wrap items-start justify-between gap-4 border-b border-linha pb-6">
      <div className="min-w-0"><p className="text-[14px] text-cinza">Nome do projeto</p><h1 className="mt-1 break-words text-[28px]">{projeto.nome}</h1></div>
      <EtiquetaStatusPortal status={projeto.status}>{projetoStatus[projeto.status]}</EtiquetaStatusPortal>
    </div>
    <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div className="border border-linha border-l-[3px] border-l-verde bg-branco p-4"><p className="text-[12px] text-cinza">Progresso</p><p className="mt-1 font-[family-name:var(--font-interface)] text-[20px] font-semibold">{projeto.conclusao.percentual === null ? "—" : `${projeto.conclusao.percentual}%`}</p>{projeto.conclusao.percentual !== null && <p className="text-[13px] text-cinza">{projeto.conclusao.concluidas} de {projeto.conclusao.total} tarefas</p>}</div>
      <div className="border border-linha bg-branco p-4"><p className="text-[12px] text-cinza">Início</p><p className="mt-1 font-[family-name:var(--font-interface)] tabular-nums">{data(projeto.dataInicio)}</p></div>
      <div className="border border-linha bg-branco p-4"><p className="text-[12px] text-cinza">Conclusão prevista</p><p className="mt-1 font-[family-name:var(--font-interface)] tabular-nums">{data(projeto.dataPrevistaConclusao)}</p></div>
      <div className="border border-linha bg-branco p-4"><p className="text-[12px] text-cinza">Dias restantes</p><div className="mt-1"><IndicadorSemaforoProjeto prazo={projeto.dataPrevistaConclusao} status={projeto.status} /></div></div>
      <div className="border border-linha bg-branco p-4"><p className="text-[12px] text-cinza">Última atualização</p><p className="mt-1 break-words font-[family-name:var(--font-interface)] tabular-nums">{atualizacao(projeto.ultimaAtualizacao)}</p></div>
    </section>
    <section className="mt-8">
      <h2 className="text-[21px]">Tarefas</h2>
      {projeto.tarefas.length === 0 ? <p className="mt-3 border border-dashed border-linha bg-branco px-5 py-8 text-[14px] text-cinza">Nenhuma tarefa ativa neste projeto.</p> : <ul className="mt-4 grid gap-3">
        {projeto.tarefas.map((tarefa) => <li key={tarefa.id} className="min-w-0 rounded-[3px] border border-linha border-l-[3px] border-l-azul bg-branco p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div className="min-w-0"><p className="text-[12px] text-cinza">Nome da tarefa</p><h3 className="mt-1 break-words font-[family-name:var(--font-interface)] text-[16px] font-semibold">{tarefa.nome}</h3></div>
            <div className="justify-self-start sm:justify-self-end"><EtiquetaStatusPortal status={tarefa.status}>{tarefaStatus[tarefa.status]}</EtiquetaStatusPortal></div>
          </div>
          <dl className="mt-4 grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
            <div className="min-w-0"><dt className="text-cinza">Prazo</dt><dd className="mt-1 break-words font-[family-name:var(--font-interface)] tabular-nums">{data(tarefa.prazo)}</dd></div>
            <div className="min-w-0"><dt className="text-cinza">Responsável</dt><dd className="mt-1 break-words font-[family-name:var(--font-interface)]">{tarefa.responsavel ?? "Não definido"}</dd></div>
            <div className="min-w-0">
              <dt className="text-cinza">{tarefa.progresso.total === 0 ? "Conclusão da tarefa" : "Subtarefas concluídas"}</dt>
              <dd className="mt-1 font-[family-name:var(--font-interface)]">
                {tarefa.progresso.percentual === null ? "—" : tarefa.progresso.total === 0 ? `${tarefa.progresso.percentual}%` : `${tarefa.progresso.concluidas} de ${tarefa.progresso.total}`}
              </dd>
              {tarefa.progresso.percentual !== null && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-papel" role="progressbar" aria-label={tarefa.progresso.total === 0 ? "Conclusão da tarefa" : "Subtarefas concluídas"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={tarefa.progresso.percentual} aria-valuetext={tarefa.progresso.total === 0 ? `${tarefa.progresso.percentual}%` : `${tarefa.progresso.concluidas} de ${tarefa.progresso.total} subtarefas`}>
                <div className="h-full rounded-full bg-verde-esc" style={{ width: `${tarefa.progresso.percentual}%` }} />
              </div>}
            </div>
          </dl>
        </li>)}
      </ul>}
    </section>
    <section className="mt-8">
      <h2 className="text-[21px]">Documentos</h2>
      {projeto.documentos.length === 0 ? <p className="mt-3 text-[14px] text-cinza">Nenhum documento vinculado a este projeto.</p> : <ul className="mt-4 space-y-2">{projeto.documentos.map((documento) => <li key={documento.id} className="min-w-0 break-words border border-linha bg-branco px-4 py-3"><a href={documento.link} target="_blank" rel="noreferrer" className="font-[family-name:var(--font-interface)] text-[14px] text-azul-esc hover:underline">{documento.nome} ↗</a></li>)}</ul>}
    </section>
  </div>;
}
