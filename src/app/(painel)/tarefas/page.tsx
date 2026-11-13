/**
 * Página da rota `src/app/(painel)/tarefas/page.tsx`. Recebe os parâmetros da URL ou da rota, valida o acesso no servidor, obtém os dados necessários e compõe a resposta visual; as regras de negócio permanecem nas funções de domínio chamadas por ela.
 */
import { interpretarResponsavel, urlExportacaoPdf } from "@/lib/filtro-responsavel";
import Link from "next/link";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { listarClientesParaProjeto, listarProjetos, listarPrazos, listarTarefasParaFiltro, listarResponsaveisParaFiltro } from "@/lib/projetos-tarefas";
import { Etiqueta } from "@/ui/campo";
import { FiltrosListagens } from "../filtros-listagens";
import { buscarLimitesSemaforo } from "@/lib/semaforo";
import { IndicadorSemaforoProjeto } from "@/ui/indicador-dias-restantes";
import { codigoTarefa } from "@/lib/identificadores-hierarquicos";
import { RolagemHorizontal } from "@/ui/rolagem-horizontal";

const status: Record<string, string> = {
  A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", AGUARDANDO_DOCUMENTO_CLIENTE: "Aguardando documento do cliente", VISITA_REUNIAO_AGENDADA: "Visita/reunião agendada", PROTOCOLADO: "Protocolado", SOB_ANALISE_ORGAO_AMBIENTAL: "Sob análise do órgão", COM_EXIGENCIA_A_CUMPRIR: "Com exigência a cumprir", CONCLUIDO: "Concluída", CANCELADO: "Cancelada",
};

function ProgressoSubtarefas({ progresso }: { progresso?: { concluidas: number; total: number } }) {
  // Esta variante de tabela só é renderizada quando a consulta também pediu a agregação.
  if (!progresso) throw new Error("Contagem de subtarefas não disponível.");
  return <span className="font-[family-name:var(--font-interface)] tabular-nums" role="img" aria-label={`${progresso.concluidas} de ${progresso.total} subtarefas concluídas`}>{progresso.concluidas}/{progresso.total}</span>;
}

export default async function TarefasPage({ searchParams }: { searchParams: Promise<{ responsavel?: string | string[]; cliente?: string; projeto?: string; tarefa?: string }> }) {
  // A página é administrativa; a action de domínio também verifica ADMIN antes de ler dados.
  const ctx = await exigirAcessoARota("/tarefas");
  const filtros = await searchParams;
  const hrefExportacao = urlExportacaoPdf("/api/exportacao-pdf/tarefas", filtros);
  // Determina se a coluna agregada deve ser solicitada ao backend para este filtro.
  const tipoResponsavel = interpretarResponsavel(filtros.responsavel).tipo;
  const responsavelInvalido = tipoResponsavel === "invalido";
  const mostrarProgresso = tipoResponsavel !== "todos" && !responsavelInvalido;
  const responsavelInicial = typeof filtros.responsavel === "string" ? filtros.responsavel : filtros.responsavel ? "invalido" : "";
  // Busca lista, filtros e limites em paralelo, mantendo a consulta principal restrita no servidor.
  const [tarefas, projetos, clientes, tarefasFiltro, limites, responsaveis] = await Promise.all([
    listarPrazos(ctx, { clienteId: filtros.cliente, projetoId: filtros.projeto, tarefaId: filtros.tarefa, responsavel: filtros.responsavel, pendentes: false }, mostrarProgresso),
    listarProjetos(ctx),
    listarClientesParaProjeto(ctx),
    listarTarefasParaFiltro(ctx),
    buscarLimitesSemaforo(ctx),
    listarResponsaveisParaFiltro(ctx, "tarefas", { clienteId: filtros.cliente, projetoId: filtros.projeto, tarefaId: filtros.tarefa, pendentes: false }),
  ]);

  return <div className="w-full max-w-[1280px]">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <h1 className="text-[24px]">Tarefas</h1>
      <div className="flex flex-wrap gap-2">
        <Link href={hrefExportacao} className="flex min-h-11 items-center rounded-controle border border-linha bg-branco px-4 py-2.5 font-[family-name:var(--font-interface)] text-[14px] font-semibold text-tinta hover:bg-papel">Exportar PDF</Link>
        <Link href="/projetos" className="flex min-h-11 items-center rounded-controle bg-tinta px-5 py-2.5 font-[family-name:var(--font-interface)] text-[14px] font-semibold text-branco hover:bg-tinta2">Ver projetos</Link>
      </div>
    </div>
    <FiltrosListagens
      key={`${responsavelInicial}|${filtros.cliente ?? ""}|${filtros.projeto ?? ""}|${filtros.tarefa ?? ""}`}
      rota="/tarefas"
      clientes={clientes}
      projetos={projetos.map(({ id, nome, cliente }) => ({ id, nome, cliente: { id: cliente.id } }))}
      tarefas={tarefasFiltro}
      responsaveis={responsaveis}
      responsavelInicial={responsavelInicial}
      clienteInicial={filtros.cliente}
      projetoInicial={filtros.projeto}
      tarefaInicial={filtros.tarefa}
    />
    {responsavelInvalido && <p role="alert" className="mt-4 text-[14px] text-critico">Filtro de responsável inválido. Selecione um responsável ou “Todos os responsáveis”.</p>}
    {tarefas.length === 0 ? <div className="mt-8 rounded-controle border border-linha bg-branco px-8 py-14 text-center"><p className="text-[17px] text-tinta">Nenhuma tarefa nesta seleção.</p><p className="mt-2 text-[14px] text-cinza">Não há tarefas ativas ou os filtros não encontraram tarefas.</p></div> : <div className="mt-7">
      <RolagemHorizontal className="hidden rounded-controle border border-linha bg-branco md:block" rotulo="Tabela de tarefas">
        <table className="w-full table-fixed border-collapse text-left font-[family-name:var(--font-interface)] text-[13px]">
          <thead><tr className="bg-papel text-cinza"><th className="w-[27%] px-4 py-3 text-[11px] uppercase">Tarefa</th><th className="w-[28%] px-4 py-3 text-[11px] uppercase">Projeto e cliente</th><th className="w-[17%] px-4 py-3 text-[11px] uppercase">Responsável</th><th className="w-[14%] px-4 py-3 text-[11px] uppercase">Prazo</th><th className="w-[14%] px-4 py-3 text-[11px] uppercase">Status</th></tr></thead>
          <tbody>{tarefas.map(tarefa => <tr key={tarefa.id} className="border-t border-linha bg-branco align-top hover:bg-papel">
            <td className="break-words px-4 py-4"><Link href={`/tarefas/${tarefa.id}`} className="inline-flex min-h-11 items-center font-semibold text-tinta hover:text-azul-esc hover:underline">{tarefa.nome}</Link><p className="mt-1 break-all text-[12px] tabular-nums text-cinza">{codigoTarefa(tarefa.projeto.cliente.numeroIdentificacao, tarefa.projeto.numeroLocal, tarefa.numeroLocal)}</p>{tarefa._count.subtarefas > 0 && <p className="mt-1 text-[12px] text-ambar">{tarefa._count.subtarefas} {tarefa._count.subtarefas === 1 ? "subtarefa aguarda" : "subtarefas aguardam"} atribuição</p>}{mostrarProgresso && <p className="mt-1 text-[12px] text-cinza">Subtarefas: <ProgressoSubtarefas progresso={tarefa.progressoSubtarefas} /> concluídas</p>}</td>
            <td className="break-words px-4 py-4"><Link href={`/projetos/${tarefa.projeto.id}`} className="inline-flex min-h-11 items-center text-azul-esc hover:underline">{tarefa.projeto.nome}</Link><p className="mt-1"><Link href={`/clientes/${tarefa.projeto.cliente.id}`} className="inline-flex min-h-11 items-center text-cinza hover:text-azul-esc hover:underline">{tarefa.projeto.cliente.razaoSocial}</Link></p></td>
            <td className="break-words px-4 py-4 text-cinza">{tarefa.responsavel?.nome ?? tarefa.responsavelUsuario?.nome ?? "Sem responsável"}</td>
            <td className="break-words px-4 py-4"><div className="[&_span]:max-w-full [&_span]:break-words"><IndicadorSemaforoProjeto prazo={tarefa.prazo} status={tarefa.status} ativo={tarefa.ativo} limites={limites} /></div></td>
            <td className="break-words px-4 py-4"><div className="[&_span]:max-w-full [&_span]:break-words"><Etiqueta tom={tarefa.status === "CONCLUIDO" ? "positivo" : undefined}>{status[tarefa.status]}</Etiqueta></div></td>
          </tr>)}</tbody>
        </table>
      </RolagemHorizontal>
      <ul className="flex flex-col gap-3 md:hidden">{tarefas.map(tarefa => <li key={tarefa.id}>
        <article className="relative rounded-cartao border border-linha bg-branco px-4 py-4 hover:border-azul">
          <Link href={`/tarefas/${tarefa.id}`} aria-label={`Abrir tarefa ${tarefa.nome}`} className="absolute inset-0 z-0"><span className="sr-only">Abrir tarefa {tarefa.nome}</span></Link>
          <div className="pointer-events-none relative z-10">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-[family-name:var(--font-interface)] text-[15px] font-semibold text-tinta">{tarefa.nome}</p><p className="mt-1 whitespace-nowrap font-[family-name:var(--font-interface)] text-[12px] tabular-nums text-cinza">ID {codigoTarefa(tarefa.projeto.cliente.numeroIdentificacao, tarefa.projeto.numeroLocal, tarefa.numeroLocal)}</p></div><Etiqueta tom={tarefa.status === "CONCLUIDO" ? "positivo" : undefined}>{status[tarefa.status]}</Etiqueta></div>
            <p className="mt-1 text-[12px] text-cinza"><IndicadorSemaforoProjeto prazo={tarefa.prazo} status={tarefa.status} ativo={tarefa.ativo} limites={limites} /></p>
            {tarefa._count.subtarefas > 0 && <p className="mt-2 text-[12px] font-medium text-ambar">{tarefa._count.subtarefas} {tarefa._count.subtarefas === 1 ? "subtarefa aguarda" : "subtarefas aguardam"} atribuição</p>}
            <p className="mt-3 text-[13px]"><span className="text-cinza">Projeto: </span><Link href={`/projetos/${tarefa.projeto.id}`} className="pointer-events-auto relative z-20 text-azul-esc hover:underline">{tarefa.projeto.nome}</Link></p>
            <p className="mt-1 text-[13px]"><span className="text-cinza">Cliente: </span><Link href={`/clientes/${tarefa.projeto.cliente.id}`} className="pointer-events-auto relative z-20 text-azul-esc hover:underline">{tarefa.projeto.cliente.razaoSocial}</Link></p>
            <p className="mt-1 text-[13px]"><span className="text-cinza">Responsável: </span><span className="text-tinta">{tarefa.responsavel?.nome ?? tarefa.responsavelUsuario?.nome ?? "Sem responsável"}</span></p>
            {mostrarProgresso && <p className="mt-1 text-[13px]"><span className="text-cinza">Subtarefas: </span><ProgressoSubtarefas progresso={tarefa.progressoSubtarefas} /> concluídas</p>}
          </div>
        </article>
      </li>)}</ul>
    </div>}
  </div>;
}
