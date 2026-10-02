import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { buscarProjetoPortal } from "@/lib/portal-cliente";
import { Etiqueta } from "@/ui/campo";

const data = (valor: Date | null) => valor
  ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(valor)
  : "Não informada";
const atualizacao = (valor: Date | null) => valor
  ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "UTC" }).format(valor)
  : "Sem movimentação";
const projetoStatus: Record<string, string> = { A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", CANCELADO: "Cancelado" };
const tarefaStatus: Record<string, string> = { A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", AGUARDANDO_DOCUMENTO_CLIENTE: "Aguardando documento do cliente", VISITA_REUNIAO_AGENDADA: "Visita/reunião agendada", PROTOCOLADO: "Protocolado", SOB_ANALISE_ORGAO_AMBIENTAL: "Sob análise do órgão ambiental", COM_EXIGENCIA_A_CUMPRIR: "Com exigência a cumprir", CONCLUIDO: "Concluída", CANCELADO: "Cancelada" };

export default async function PortalProjetoPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await exigirAcessoARota("/portal");
  const { id } = await params;
  const projeto = await buscarProjetoPortal(ctx, id);
  if (!projeto) notFound();
  return <div className="w-full max-w-[1120px]">
    <Link href="/portal" className="inline-flex min-h-11 items-center font-[family-name:var(--font-interface)] text-[14px] text-azul-esc hover:underline">← Meus projetos</Link>
    <div className="mt-3 flex flex-wrap items-start justify-between gap-4 border-b border-linha pb-6">
      <div className="min-w-0"><p className="text-[14px] text-cinza">Projeto</p><h1 className="mt-1 break-words text-[28px]">{projeto.nome}</h1></div>
      <Etiqueta>{projetoStatus[projeto.status]}</Etiqueta>
    </div>
    <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="border border-linha border-l-[3px] border-l-verde bg-branco p-4"><p className="text-[12px] text-cinza">Conclusão</p><p className="mt-1 font-[family-name:var(--font-interface)] text-[20px] font-semibold">{projeto.conclusao.percentual === null ? "—" : `${projeto.conclusao.percentual}%`}</p>{projeto.conclusao.percentual !== null && <p className="text-[13px] text-cinza">{projeto.conclusao.concluidas} de {projeto.conclusao.total} tarefas</p>}</div>
      <div className="border border-linha bg-branco p-4"><p className="text-[12px] text-cinza">Início</p><p className="mt-1 font-[family-name:var(--font-interface)] tabular-nums">{data(projeto.dataInicio)}</p></div>
      <div className="border border-linha bg-branco p-4"><p className="text-[12px] text-cinza">Conclusão prevista</p><p className="mt-1 font-[family-name:var(--font-interface)] tabular-nums">{data(projeto.dataPrevistaConclusao)}</p></div>
      <div className="border border-linha bg-branco p-4"><p className="text-[12px] text-cinza">Última atualização</p><p className="mt-1 break-words font-[family-name:var(--font-interface)] tabular-nums">{atualizacao(projeto.ultimaAtualizacao)}</p></div>
    </section>
    <section className="mt-8">
      <h2 className="text-[21px]">Tarefas</h2>
      {projeto.tarefas.length === 0 ? <p className="mt-3 border border-dashed border-linha bg-branco px-5 py-8 text-[14px] text-cinza">Nenhuma tarefa ativa neste projeto.</p> : <ul className="mt-4 divide-y divide-linha border border-linha bg-branco">
        {projeto.tarefas.map((tarefa) => <li key={tarefa.id} className="min-w-0 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><h3 className="min-w-0 break-words font-[family-name:var(--font-interface)] text-[16px] font-semibold">{tarefa.nome}</h3><Etiqueta tom={tarefa.status === "CONCLUIDO" ? "positivo" : undefined}>{tarefaStatus[tarefa.status]}</Etiqueta></div>
          <dl className="mt-3 grid gap-3 text-[13px] sm:grid-cols-3"><div><dt className="text-cinza">Prazo</dt><dd className="mt-0.5 font-[family-name:var(--font-interface)] tabular-nums">{data(tarefa.prazo)}</dd></div><div><dt className="text-cinza">Responsável</dt><dd className="mt-0.5 break-words font-[family-name:var(--font-interface)]">{tarefa.responsavel ?? "Não definido"}</dd></div><div><dt className="text-cinza">Progresso</dt><dd className="mt-0.5 font-[family-name:var(--font-interface)]">{tarefa.progresso.percentual === null ? "—" : tarefa.progresso.total === 0 ? `${tarefa.progresso.percentual}%` : `${tarefa.progresso.concluidas} de ${tarefa.progresso.total} concluídas`}</dd></div></dl>
        </li>)}
      </ul>}
    </section>
    <section className="mt-8">
      <h2 className="text-[21px]">Documentos</h2>
      {projeto.documentos.length === 0 ? <p className="mt-3 text-[14px] text-cinza">Nenhum documento vinculado a este projeto.</p> : <ul className="mt-4 space-y-2">{projeto.documentos.map((documento) => <li key={documento.id} className="min-w-0 break-words border border-linha bg-branco px-4 py-3"><a href={documento.link} target="_blank" rel="noreferrer" className="font-[family-name:var(--font-interface)] text-[14px] text-azul-esc hover:underline">{documento.nome} ↗</a></li>)}</ul>}
    </section>
  </div>;
}
