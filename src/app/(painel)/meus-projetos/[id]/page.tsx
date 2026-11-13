import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { buscarProjetoAtribuido } from "@/lib/projetos-tarefas";
import { IndicadorSemaforoProjeto } from "@/ui/indicador-dias-restantes";
import { buscarLimitesSemaforo } from "@/lib/semaforo";
import { calcularPercentualConclusao } from "@/lib/regras-projetos-tarefas";
import { calcularDiasRestantes } from "@/lib/datas";
import { codigoProjeto } from "@/lib/identificadores-hierarquicos";
import { BlocoLateral, Cartao, CartaoLateral, CelulaResumo, FaixaResumo, Trilha } from "@/ui/cartao";
import { CelulaPrazo, StatusPonto } from "@/ui/lista";

const status: Record<string, string> = { A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", CANCELADO: "Cancelado" };
const taskStatus: Record<string, string> = { A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", AGUARDANDO_DOCUMENTO_CLIENTE: "Aguardando documento", VISITA_REUNIAO_AGENDADA: "Visita/reunião agendada", PROTOCOLADO: "Protocolado", SOB_ANALISE_ORGAO_AMBIENTAL: "Sob análise do órgão", COM_EXIGENCIA_A_CUMPRIR: "Com exigência", CONCLUIDO: "Concluída", CANCELADO: "Cancelada" };
const data = (v: Date | null) => v ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(v) : null;

export default async function MeuProjetoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await exigirAcessoARota("/meus-projetos");
  const { id } = await params;
  const [p, limites] = await Promise.all([buscarProjetoAtribuido(ctx, id), buscarLimitesSemaforo(ctx)]);
  if (!p) notFound();

  const documentos = [...p.documentos, ...p.cliente.documentos];
  const conclusao = calcularPercentualConclusao(p.tarefas);
  const abertas = p.tarefas.filter((t) => t.status !== "CONCLUIDO" && t.status !== "CANCELADO");
  const atrasadas = abertas.filter((t) => t.prazo && calcularDiasRestantes(t.prazo) < 0).length;

  return <div className="w-full max-w-[1280px]">
    <Trilha itens={[{ rotulo: "Meus projetos", href: "/meus-projetos" }, { rotulo: p.cliente.razaoSocial }]} />

    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h1 className="break-words text-[26px]">{p.nome}</h1>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] text-cinza">
          <span>Cliente <b className="font-medium text-ink">{p.cliente.razaoSocial}</b></span>
          <span className="tabular-nums">{codigoProjeto(p.cliente.numeroIdentificacao, p.numeroLocal)}</span>
        </div>
      </div>
      <StatusPonto status={p.status}>{status[p.status] ?? p.status}</StatusPonto>
    </div>

    <FaixaResumo rotulo="Resumo do projeto" colunas={3}>
      <CelulaResumo rotulo="Prazo de conclusão">
        {p.dataPrevistaConclusao ? <span>{data(p.dataPrevistaConclusao)}</span> : <span className="text-faint">Sem previsão</span>}
        <IndicadorSemaforoProjeto prazo={p.dataPrevistaConclusao} status={p.status} limites={limites} />
      </CelulaResumo>
      <CelulaResumo rotulo="Progresso" detalhe={conclusao.total > 0 ? `${conclusao.concluidas} de ${conclusao.total} tarefas concluídas` : "Sem tarefas ativas"}>
        {conclusao.percentual === null ? <span className="text-faint">—</span> : <span>{conclusao.percentual}%</span>}
        {conclusao.percentual !== null && (
          <span aria-hidden="true" className="block h-1.5 w-full basis-full overflow-hidden rounded-full bg-linha"><span className="block h-full bg-verde" style={{ width: `${conclusao.percentual}%` }} /></span>
        )}
      </CelulaResumo>
      <CelulaResumo rotulo="Tarefas em aberto" detalhe={atrasadas > 0 ? <span className="text-critico">{atrasadas} {atrasadas === 1 ? "atrasada" : "atrasadas"}</span> : "Nenhuma atrasada"}>
        <span>{abertas.length}</span>
      </CelulaResumo>
    </FaixaResumo>

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <Cartao titulo="Tarefas do projeto" semMargem>
        {p.tarefas.length === 0 ? <p className="px-5 py-8 text-center text-sm text-cinza">Nenhuma tarefa disponível.</p> : (
          <ul>
            {p.tarefas.map((t) => {
              const progresso = t.subtarefas.length ? calcularPercentualConclusao(t.subtarefas) : null;
              return (
                <li key={t.id} className="relative grid gap-2 border-t border-linha px-5 py-3.5 first:border-t-0 hover:bg-cabecalho sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-5">
                  <div className="min-w-0">
                    <Link href={`/minhas-tarefas/${t.id}`} className="block break-words font-medium text-ink before:absolute before:inset-0 before:content-[''] hover:text-azul-esc">{t.nome}</Link>
                    {progresso && progresso.total > 0 && <p className="mt-px text-[12.5px] tabular-nums text-cinza">{progresso.concluidas} de {progresso.total} subtarefas</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <CelulaPrazo prazo={t.prazo} status={t.status} ativo limites={limites} />
                    <StatusPonto status={t.status}>{taskStatus[t.status] ?? t.status}</StatusPonto>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Cartao>

      <CartaoLateral>
        <BlocoLateral titulo="Documentos">
          {documentos.length === 0 ? <p className="text-[13px] text-cinza">Nenhum documento vinculado a este projeto ou cliente.</p> : (
            <ul className="flex flex-col gap-2">
              {documentos.map((d) => (
                <li key={d.id} className="min-w-0 text-[13.5px]">
                  <a href={d.link} target="_blank" rel="noreferrer" className="break-words text-azul-esc hover:underline">{d.nome} <span className="text-faint">↗</span></a>
                </li>
              ))}
            </ul>
          )}
        </BlocoLateral>
      </CartaoLateral>
    </div>
  </div>;
}
