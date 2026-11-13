/**
 * Página da rota `src/app/(painel)/tarefas/page.tsx`. Recebe os parâmetros da URL ou da rota, valida o acesso no servidor, obtém os dados necessários e compõe a resposta visual; as regras de negócio permanecem nas funções de domínio chamadas por ela.
 */
import { interpretarResponsavel, urlExportacaoPdf } from "@/lib/filtro-responsavel";
import Link from "next/link";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { listarClientesParaProjeto, listarProjetos, listarPrazos, listarTarefasParaFiltro, listarResponsaveisParaFiltro } from "@/lib/projetos-tarefas";
import { FiltrosListagens } from "../filtros-listagens";
import { buscarLimitesSemaforo } from "@/lib/semaforo";
import { calcularDiasRestantes } from "@/lib/datas";
import { contarSituacoes, interpretarSituacao, rotulosSituacao, situacaoDoPrazo } from "@/lib/situacao-prazo";
import { codigoTarefa } from "@/lib/identificadores-hierarquicos";
import { botaoSecundario } from "@/ui/botoes";
import { CelulaLista, CelulaPrazo, LinhaLista, LinkSecundario, StatusPonto, TabelaLista, TextoPrincipal, TextoSecundario, TituloLinha, Vazio } from "@/ui/lista";

const status: Record<string, string> = {
  A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", AGUARDANDO_DOCUMENTO_CLIENTE: "Aguardando documento do cliente", VISITA_REUNIAO_AGENDADA: "Visita/reunião agendada", PROTOCOLADO: "Protocolado", SOB_ANALISE_ORGAO_AMBIENTAL: "Sob análise do órgão", COM_EXIGENCIA_A_CUMPRIR: "Com exigência a cumprir", CONCLUIDO: "Concluída", CANCELADO: "Cancelada",
};

const COLUNAS = [
  { titulo: "Tarefa", largura: "30%" },
  { titulo: "Projeto e cliente", largura: "23%" },
  { titulo: "Responsável", largura: "15%" },
  { titulo: "Prazo", largura: "14%" },
  { titulo: "Status", largura: "18%" },
];

function ProgressoSubtarefas({ progresso }: { progresso?: { concluidas: number; total: number } }) {
  // Esta variante de tabela só é renderizada quando a consulta também pediu a agregação.
  if (!progresso) throw new Error("Contagem de subtarefas não disponível.");
  return <span className="font-[family-name:var(--font-interface)] tabular-nums" role="img" aria-label={`${progresso.concluidas} de ${progresso.total} subtarefas concluídas`}>{progresso.concluidas}/{progresso.total}</span>;
}

export default async function TarefasPage({ searchParams }: { searchParams: Promise<{ responsavel?: string | string[]; cliente?: string; projeto?: string; tarefa?: string; situacao?: string | string[] }> }) {
  // A página é administrativa; a action de domínio também verifica ADMIN antes de ler dados.
  const ctx = await exigirAcessoARota("/tarefas");
  const filtros = await searchParams;
  // A situação do prazo é aplicada nesta página; a exportação em PDF usa só os filtros da consulta.
  const { situacao: situacaoParametro, ...filtrosDaConsulta } = filtros;
  const hrefExportacao = urlExportacaoPdf("/api/exportacao-pdf/tarefas", filtrosDaConsulta);
  // Determina se a coluna agregada deve ser solicitada ao backend para este filtro.
  const tipoResponsavel = interpretarResponsavel(filtros.responsavel).tipo;
  const responsavelInvalido = tipoResponsavel === "invalido";
  const mostrarProgresso = tipoResponsavel !== "todos" && !responsavelInvalido;
  const responsavelInicial = typeof filtros.responsavel === "string" ? filtros.responsavel : filtros.responsavel ? "invalido" : "";
  // Busca lista, filtros e limites em paralelo, mantendo a consulta principal restrita no servidor.
  const [tarefasConsulta, projetos, clientes, tarefasFiltro, limites, responsaveis] = await Promise.all([
    listarPrazos(ctx, { clienteId: filtros.cliente, projetoId: filtros.projeto, tarefaId: filtros.tarefa, responsavel: filtros.responsavel, pendentes: false }, mostrarProgresso),
    listarProjetos(ctx),
    listarClientesParaProjeto(ctx),
    listarTarefasParaFiltro(ctx),
    buscarLimitesSemaforo(ctx),
    listarResponsaveisParaFiltro(ctx, "tarefas", { clienteId: filtros.cliente, projetoId: filtros.projeto, tarefaId: filtros.tarefa, pendentes: false }),
  ]);

  // Cada tarefa recebe sua situação de prazo; as contagens dos botões usam a lista antes desse filtro.
  const situacaoFiltro = interpretarSituacao(situacaoParametro);
  const itens = tarefasConsulta.map((tarefa) => ({
    tarefa,
    situacao: situacaoDoPrazo(
      { diasRestantes: tarefa.prazo ? calcularDiasRestantes(tarefa.prazo) : null, fechado: tarefa.status === "CONCLUIDO" || tarefa.status === "CANCELADO" || tarefa.ativo === false },
      limites.diasAmareloAte,
    ),
  }));
  const contagens = contarSituacoes(itens.map((item) => item.situacao));
  // Itens abertos vêm antes dos concluídos e cancelados, mantendo a ordem da consulta dentro de cada grupo.
  const visiveis = (situacaoFiltro === "todos" ? itens : itens.filter((item) => item.situacao === situacaoFiltro))
    .sort((a, b) => Number(a.situacao === "fechado") - Number(b.situacao === "fechado"));

  return <div className="w-full max-w-[1280px]">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <h1 className="text-2xl">Tarefas</h1>
      <Link href={hrefExportacao} className={botaoSecundario} title="Exporta a lista com os filtros aplicados">Exportar PDF</Link>
    </div>
    <FiltrosListagens
      key={`${responsavelInicial}|${filtros.cliente ?? ""}|${filtros.projeto ?? ""}|${filtros.tarefa ?? ""}|${situacaoFiltro}`}
      rota="/tarefas"
      clientes={clientes}
      projetos={projetos.map(({ id, nome, cliente }) => ({ id, nome, cliente: { id: cliente.id } }))}
      tarefas={tarefasFiltro}
      responsaveis={responsaveis}
      responsavelInicial={responsavelInicial}
      clienteInicial={filtros.cliente}
      projetoInicial={filtros.projeto}
      tarefaInicial={filtros.tarefa}
      situacaoInicial={situacaoFiltro}
      rotulosSituacao={rotulosSituacao(limites.diasAmareloAte)}
      contagens={contagens}
      total={visiveis.length}
      singular="tarefa"
      plural="tarefas"
    />
    {responsavelInvalido && <p role="alert" className="mb-3 text-sm text-critico">Filtro de responsável inválido. Selecione um responsável ou “Todos os responsáveis”.</p>}
    {visiveis.length === 0 ? <Vazio titulo="Nenhuma tarefa nesta seleção." descricao="Não há tarefas ativas ou os filtros não encontraram tarefas." /> : (
      <TabelaLista rotulo="Tabela de tarefas" colunas={COLUNAS}>
        {visiveis.map(({ tarefa }) => {
          const nomeResponsavel = tarefa.responsavel?.nome ?? tarefa.responsavelUsuario?.nome;
          return <LinhaLista key={tarefa.id}>
            <CelulaLista larga>
              <TituloLinha href={`/tarefas/${tarefa.id}`}>{tarefa.nome}</TituloLinha>
              <TextoSecundario>
                <span className="tabular-nums text-faint">{codigoTarefa(tarefa.projeto.cliente.numeroIdentificacao, tarefa.projeto.numeroLocal, tarefa.numeroLocal)}</span>
                {mostrarProgresso && <> · Subtarefas: <ProgressoSubtarefas progresso={tarefa.progressoSubtarefas} /> concluídas</>}
              </TextoSecundario>
              {tarefa._count.subtarefas > 0 && <span className="mt-px block text-[12.5px] text-ambar">{tarefa._count.subtarefas} {tarefa._count.subtarefas === 1 ? "subtarefa aguarda" : "subtarefas aguardam"} atribuição</span>}
            </CelulaLista>
            <CelulaLista larga>
              <TextoPrincipal><LinkSecundario href={`/projetos/${tarefa.projeto.id}`}>{tarefa.projeto.nome}</LinkSecundario></TextoPrincipal>
              <TextoSecundario><LinkSecundario href={`/clientes/${tarefa.projeto.cliente.id}`} suave>{tarefa.projeto.cliente.razaoSocial}</LinkSecundario></TextoSecundario>
            </CelulaLista>
            <CelulaLista rotulo="Responsável">
              {nomeResponsavel ? <TextoPrincipal>{nomeResponsavel}</TextoPrincipal> : <span className="text-faint">Sem responsável</span>}
            </CelulaLista>
            <CelulaLista rotulo="Prazo"><CelulaPrazo prazo={tarefa.prazo} status={tarefa.status} ativo={tarefa.ativo} limites={limites} /></CelulaLista>
            <CelulaLista rotulo="Status"><StatusPonto status={tarefa.status}>{status[tarefa.status]}</StatusPonto></CelulaLista>
          </LinhaLista>;
        })}
      </TabelaLista>
    )}
  </div>;
}
