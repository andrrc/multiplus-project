/**
 * Página da rota `src/app/(painel)/subtarefas/page.tsx`. Recebe os parâmetros da URL ou da rota, valida o acesso no servidor, obtém os dados necessários e compõe a resposta visual; as regras de negócio permanecem nas funções de domínio chamadas por ela.
 */
import { interpretarResponsavel, urlExportacaoPdf } from "@/lib/filtro-responsavel";
import Link from "next/link";
import { StatusSubtarefa } from "@prisma/client";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { indicadorDePrazosSubtarefas, listarClientesParaProjeto, listarProjetos, listarSubtarefasPrazos, listarTarefasParaFiltro, listarResponsaveisParaFiltro, listarSolicitacoesConclusaoPendentes } from "@/lib/projetos-tarefas";
import { Etiqueta, inputClass } from "@/ui/campo";
import { botaoPerigo, botaoPrimario, botaoSecundario } from "@/ui/botoes";
import { FiltrosListagens } from "../filtros-listagens";
import { buscarLimitesSemaforo } from "@/lib/semaforo";
import { calcularDiasRestantes } from "@/lib/datas";
import { contarSituacoes, interpretarSituacao, rotulosSituacao, situacaoDoPrazo } from "@/lib/situacao-prazo";
import { codigoSubtarefa } from "@/lib/identificadores-hierarquicos";
import { decidirSolicitacaoConclusaoFormAction } from "@/app/(painel)/projetos/actions";
import { CelulaLista, CelulaPrazo, LinhaLista, LinkSecundario, StatusPonto, TabelaLista, TextoPrincipal, TextoSecundario, TituloLinha, Vazio } from "@/ui/lista";

const status: Record<StatusSubtarefa, string> = { EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluída", CANCELADO: "Cancelada" };

const COLUNAS = [
  { titulo: "Subtarefa", largura: "30%" },
  { titulo: "Tarefa, projeto e cliente", largura: "25%" },
  { titulo: "Responsável", largura: "15%" },
  { titulo: "Prazo", largura: "14%" },
  { titulo: "Status", largura: "16%" },
];

export default async function SubtarefasPage({ searchParams }: { searchParams: Promise<{ responsavel?: string | string[]; projeto?: string; cliente?: string; tarefa?: string; todos?: string; situacao?: string | string[] }> }) {
  // A rota gerencial exige ADMIN; consultas e actions continuam protegidas no servidor.
  const ctx = await exigirAcessoARota("/subtarefas");
  const filtros = await searchParams;
  const hrefExportacao = urlExportacaoPdf("/api/exportacao-pdf/subtarefas", {
    cliente: filtros.cliente,
    projeto: filtros.projeto,
    tarefa: filtros.tarefa,
    responsavel: filtros.responsavel,
    todos: filtros.todos,
  });
  // Parâmetro repetido ou malformado é tratado como inválido e não amplia a lista.
  const responsavelInvalido = interpretarResponsavel(filtros.responsavel).tipo === "invalido";
  const responsavelInicial = typeof filtros.responsavel === "string" ? filtros.responsavel : filtros.responsavel ? "invalido" : "";
  // Por padrão, concluídas e canceladas ficam fora; `todos=1` solicita a lista completa.
  const pendentes = filtros.todos !== "1";
  // Os dados, contadores, opções de filtro e solicitações pendentes são carregados em paralelo.
  const [subtarefas, projetos, clientes, tarefasFiltro, limites, responsaveis, solicitacoes] = await Promise.all([
    listarSubtarefasPrazos(ctx, { projetoId: filtros.projeto, clienteId: filtros.cliente, tarefaId: filtros.tarefa, responsavel: filtros.responsavel, pendentes }),
    listarProjetos(ctx),
    listarClientesParaProjeto(ctx),
    listarTarefasParaFiltro(ctx),
    buscarLimitesSemaforo(ctx),
    listarResponsaveisParaFiltro(ctx, "subtarefas", { clienteId: filtros.cliente, projetoId: filtros.projeto, tarefaId: filtros.tarefa, pendentes }),
    listarSolicitacoesConclusaoPendentes(ctx),
  ]);
  // O indicador usa a mesma coleção que será exibida após a aplicação dos filtros.
  const indicador = indicadorDePrazosSubtarefas(subtarefas);
  // Cada subtarefa recebe sua situação de prazo; as contagens dos botões usam a lista antes desse filtro.
  const situacaoFiltro = interpretarSituacao(filtros.situacao);
  const itens = subtarefas.map((subtarefa) => ({
    subtarefa,
    situacao: situacaoDoPrazo(
      { diasRestantes: subtarefa.prazo ? calcularDiasRestantes(subtarefa.prazo) : null, fechado: subtarefa.status === StatusSubtarefa.CONCLUIDO || subtarefa.status === StatusSubtarefa.CANCELADO || subtarefa.ativo === false },
      limites.diasAmareloAte,
    ),
  }));
  const contagens = contarSituacoes(itens.map((item) => item.situacao));
  // Itens abertos vêm antes dos concluídos e cancelados, mantendo a ordem da consulta dentro de cada grupo.
  const visiveis = (situacaoFiltro === "todos" ? itens : itens.filter((item) => item.situacao === situacaoFiltro))
    .sort((a, b) => Number(a.situacao === "fechado") - Number(b.situacao === "fechado"));
  const hrefSubtarefa = (tarefaId: string, subtarefaId: string) => `/tarefas/${tarefaId}?subtarefa=${subtarefaId}`;

  return <div className="w-full max-w-[1280px]">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <h1 className="text-2xl">Subtarefas</h1>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={hrefExportacao} className={botaoSecundario} title="Exporta a lista com os filtros aplicados">Exportar PDF</Link>
        <div className="rounded-cartao border border-linha bg-branco px-5 py-2.5"><p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-cinza">Em dia</p><p className="font-[family-name:var(--font-interface)] text-2xl font-semibold tabular-nums text-ink">{indicador.percentual === null ? "—" : `${indicador.percentual}%`} <span className="text-[13px] font-normal text-cinza">({indicador.emDia}/{indicador.total})</span></p></div>
      </div>
    </div>
    {solicitacoes.length > 0 && <section className="mb-6 rounded-cartao border border-linha bg-branco p-4 sm:p-5" aria-labelledby="conclusoes-pendentes">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 id="conclusoes-pendentes" className="font-[family-name:var(--font-interface)] text-[18px] font-semibold">Conclusões aguardando confirmação</h2><p className="mt-1 text-[13px] text-cinza">Confirme para registrar a conclusão ou rejeite para devolver o item ao status anterior.</p></div>
        <span className="rounded-selo bg-ambar-cl px-2 py-[3px] font-[family-name:var(--font-interface)] text-xs font-semibold text-ambar">{solicitacoes.length} {solicitacoes.length === 1 ? "pedido" : "pedidos"}</span>
      </div>
      {solicitacoes.length === 0 ? <p className="mt-4 border-t border-linha pt-4 text-[14px] text-cinza">Nenhuma conclusão aguarda confirmação.</p> : <ul className="mt-4 divide-y divide-linha border-t border-linha">{solicitacoes.map((pedido) => {
        const ehTarefa = !!pedido.tarefa;
        const titulo = pedido.tarefa?.nome ?? pedido.subtarefa?.titulo ?? "Item";
        const tarefaId = pedido.tarefa?.id ?? pedido.subtarefa?.tarefa.id;
        const tarefaNome = pedido.tarefa?.nome ?? pedido.subtarefa?.tarefa.nome;
        const projeto = pedido.tarefa?.projeto ?? pedido.subtarefa?.tarefa.projeto;
        const cliente = projeto?.cliente;
        const itemAtivo = pedido.tarefa
          ? pedido.tarefa.ativo && pedido.tarefa.status !== "CANCELADO" && pedido.tarefa.projeto.ativo && pedido.tarefa.projeto.cliente.ativo
          : !!pedido.subtarefa?.ativo && pedido.subtarefa.status !== StatusSubtarefa.CANCELADO && !!pedido.subtarefa.tarefa.ativo && !!pedido.subtarefa.tarefa.projeto.ativo && !!pedido.subtarefa.tarefa.projeto.cliente.ativo;
        const href = tarefaId ? `/tarefas/${tarefaId}${ehTarefa ? "" : `?subtarefa=${pedido.subtarefaId}#subtarefa-${pedido.subtarefaId}`}` : "/subtarefas";
        return <li id={`solicitacao-${pedido.id}`} key={pedido.id} className="grid gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><Etiqueta tom="atencao">{ehTarefa ? "Tarefa" : "Subtarefa"}</Etiqueta><Link href={href} className="break-words font-[family-name:var(--font-interface)] text-[15px] font-semibold text-azul-esc hover:underline">{titulo}</Link></div>
            <p className="mt-2 break-words text-[13px] text-cinza">Solicitado por {pedido.solicitadoPor?.nome ?? pedido.solicitadoPorNome} · {cliente?.razaoSocial ?? "Cliente"} · {projeto?.nome ?? "Projeto"}{!ehTarefa && tarefaNome ? ` · ${tarefaNome}` : ""}</p>
            <p className="mt-1 text-[12px] text-cinza">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(pedido.solicitadoEm)}</p>
          </div>
          <form action={decidirSolicitacaoConclusaoFormAction.bind(null, pedido.id)} className="grid gap-2">
            {!itemAtivo && <p className="text-[13px] text-ambar">Item cancelado/inativo ou projeto/cliente inativo. Reative para confirmar; este pedido ainda pode ser rejeitado.</p>}
            <label className="grid gap-1 text-[12px] font-medium text-cinza">Comentário (opcional, usado se rejeitar)<textarea name="comentario" maxLength={2000} rows={2} className={inputClass} /></label>
            <div className="flex flex-wrap gap-2"><button name="decisao" value="APROVAR" disabled={!itemAtivo} className={botaoPrimario}>Confirmar conclusão</button><button name="decisao" value="REJEITAR" className={botaoPerigo}>Rejeitar</button></div>
          </form>
        </li>;
      })}</ul>}
    </section>}
    <FiltrosListagens
      key={`${responsavelInicial}|${filtros.cliente ?? ""}|${filtros.projeto ?? ""}|${filtros.tarefa ?? ""}|${filtros.todos ?? ""}|${situacaoFiltro}`}
      rota="/subtarefas"
      clientes={clientes}
      projetos={projetos.map(({ id, nome, cliente }) => ({ id, nome, cliente: { id: cliente.id } }))}
      tarefas={tarefasFiltro}
      responsaveis={responsaveis}
      responsavelInicial={responsavelInicial}
      clienteInicial={filtros.cliente}
      projetoInicial={filtros.projeto}
      tarefaInicial={filtros.tarefa}
      mostrarConcluidasInicial={!pendentes}
      incluirFiltroConcluidas
      situacaoInicial={situacaoFiltro}
      rotulosSituacao={rotulosSituacao(limites.diasAmareloAte)}
      contagens={contagens}
      total={visiveis.length}
      singular="subtarefa"
      plural="subtarefas"
    />
    {responsavelInvalido && <p role="alert" className="mb-3 text-sm text-critico">Filtro de responsável inválido. Selecione um responsável ou “Todos os responsáveis”.</p>}
    {visiveis.length === 0 ? <Vazio titulo="Nenhuma subtarefa nesta seleção." descricao="A fila está limpa ou os filtros não encontraram subtarefas." /> : (
      <TabelaLista rotulo="Tabela de subtarefas" colunas={COLUNAS}>
        {visiveis.map(({ subtarefa: s }) => {
          const nomeResponsavel = s.atribuidoA?.nome ?? s.atribuidoAUsuario?.nome;
          return <LinhaLista key={s.id}>
            <CelulaLista larga>
              <TituloLinha href={hrefSubtarefa(s.tarefa.id, s.id)} rotuloAcessivel={`Abrir subtarefa ${s.titulo}`}>{s.titulo}</TituloLinha>
              <span className="block truncate text-xs tabular-nums text-faint">{codigoSubtarefa(s.tarefa.projeto.cliente.numeroIdentificacao, s.tarefa.projeto.numeroLocal, s.tarefa.numeroLocal, s.numeroLocal)}</span>
            </CelulaLista>
            <CelulaLista larga>
              <TextoPrincipal><LinkSecundario href={`/tarefas/${s.tarefa.id}`}>{s.tarefa.nome}</LinkSecundario></TextoPrincipal>
              <TextoSecundario>
                <LinkSecundario href={`/projetos/${s.tarefa.projeto.id}`} suave>{s.tarefa.projeto.nome}</LinkSecundario> · <LinkSecundario href={`/clientes/${s.tarefa.projeto.cliente.id}`} suave>{s.tarefa.projeto.cliente.razaoSocial}</LinkSecundario>
              </TextoSecundario>
            </CelulaLista>
            <CelulaLista rotulo="Responsável">
              {nomeResponsavel ? <TextoPrincipal>{nomeResponsavel}</TextoPrincipal> : <span className="text-faint">Sem responsável</span>}
            </CelulaLista>
            <CelulaLista rotulo="Prazo"><CelulaPrazo prazo={s.prazo} status={s.status} ativo={s.ativo} limites={limites} /></CelulaLista>
            <CelulaLista rotulo="Status"><StatusPonto status={s.status}>{status[s.status]}</StatusPonto></CelulaLista>
          </LinhaLista>;
        })}
      </TabelaLista>
    )}
  </div>;
}
