/**
 * Página da rota `src/app/(painel)/minhas-tarefas/page.tsx`. Recebe os parâmetros da URL ou da rota, valida o acesso no servidor, obtém os dados necessários e compõe a resposta visual; as regras de negócio permanecem nas funções de domínio chamadas por ela.
 */
import { auth } from "@/server/auth";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { listarSubtarefasAtribuidas, listarTarefasAtribuidas } from "@/lib/projetos-tarefas";
import { concluirSubtarefaFormAction, concluirTarefaFormAction } from "@/app/(painel)/projetos/actions";
import { acaoDaLinha, interpretarTipoLista, tipoNaLista } from "@/lib/minhas-tarefas-lista";
import { botaoSecundarioPequeno } from "@/ui/botoes";
import Link from "next/link";
import { buscarLimitesSemaforo } from "@/lib/semaforo";
import { codigoSubtarefa, codigoTarefa } from "@/lib/identificadores-hierarquicos";
import { contarSituacoes, interpretarSituacao, rotulosSituacao } from "@/lib/situacao-prazo";
import { FiltrosListagens } from "../filtros-listagens";
import { correspondeABusca, interpretarBuscaLista } from "@/lib/busca-lista";
import { buscarEOrdenarTarefas, situacaoDoItem } from "@/lib/lista-tarefas";
import { TelaTarefasExterno } from "./tela-externo";
import { CelulaLista, CelulaPrazo, LinhaLista, StatusPonto, TabelaLista, TextoPrincipal, TextoSecundario, TituloLinha, Vazio } from "@/ui/lista";

const status: Record<string, string> = { A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", AGUARDANDO_DOCUMENTO_CLIENTE: "Aguardando documento", VISITA_REUNIAO_AGENDADA: "Visita/reunião agendada", PROTOCOLADO: "Protocolado", SOB_ANALISE_ORGAO_AMBIENTAL: "Sob análise do órgão", COM_EXIGENCIA_A_CUMPRIR: "Com exigência", CONCLUIDO: "Concluída", CANCELADO: "Cancelada" };

const COLUNAS = [
  { titulo: "Item", largura: "32%" },
  { titulo: "Projeto e cliente", largura: "23%" },
  { titulo: "Prazo", largura: "14%" },
  { titulo: "Status", largura: "17%" },
  { titulo: "Ação", largura: "14%" },
];

/** Linha da lista: uma tarefa ou uma subtarefa do colaborador, já com a situação do prazo e a ação da linha. */
type LinhaMinhas = {
  chave: string;
  tipo: "tarefa" | "subtarefa";
  id: string;
  titulo: string;
  codigo: string;
  /** Tarefa de origem, quando a linha é uma subtarefa. */
  tarefaOrigem?: { id: string; nome: string };
  complemento?: string;
  aguardam: number;
  projeto: { nome: string };
  cliente: { razaoSocial: string };
  prazo: Date | null;
  status: string;
  aguardandoOutras: boolean;
  acao: ReturnType<typeof acaoDaLinha>;
};

export default async function MinhasTarefasPage({ searchParams }: { searchParams: Promise<{ situacao?: string | string[]; busca?: string | string[]; cliente?: string; projeto?: string; aguardando?: string; tipo?: string | string[] }> }) {
  const ctx = await exigirAcessoARota("/minhas-tarefas");
  const { situacao: situacaoParametro, busca: buscaParametro, cliente, projeto, aguardando, tipo: tipoParametro } = await searchParams;
  const [tarefas, subtarefasDoColaborador, limites] = await Promise.all([
    listarTarefasAtribuidas(ctx),
    // As subtarefas entram na lista só para o colaborador interno; o externo tem a tela própria, abaixo.
    ctx.perfil === "ADMIN_INTERNO" ? listarSubtarefasAtribuidas(ctx) : Promise.resolve([]),
    buscarLimitesSemaforo(ctx),
  ]);

  // O colaborador externo tem uma tela própria, pensada para o celular; os dados são os mesmos.
  if (ctx.perfil === "ADMIN_EXTERNO") {
    const sessao = await auth();
    return <TelaTarefasExterno nome={sessao?.user?.name ?? ""} tarefas={tarefas} limites={limites} />;
  }

  // Busca, cliente e projeto valem sobre as tarefas e subtarefas que a consulta já entregou a este colaborador.
  const busca = interpretarBuscaLista(buscaParametro);
  const clienteId = typeof cliente === "string" ? cliente : "";
  const projetoId = typeof projeto === "string" ? projeto : "";
  const tipoFiltro = interpretarTipoLista(tipoParametro);
  const projetosDoColaborador = [...tarefas.map((t) => t.projeto), ...subtarefasDoColaborador.map((s) => s.tarefa.projeto)];
  const clientes = [...new Map(projetosDoColaborador.map((p) => [p.cliente.id, p.cliente.razaoSocial])).entries()]
    .map(([id, razaoSocial]) => ({ id, razaoSocial }))
    .sort((a, b) => a.razaoSocial.localeCompare(b.razaoSocial, "pt-BR"));
  const projetos = [...new Map(projetosDoColaborador.map((p) => [p.id, { id: p.id, nome: p.nome, cliente: { id: p.cliente.id } }])).values()]
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const naSelecao = (p: { id: string; cliente: { id: string } }) => (!clienteId || p.cliente.id === clienteId) && (!projetoId || p.id === projetoId);
  const tarefasDaSelecao = buscarEOrdenarTarefas(tarefas.filter((t) => naSelecao(t.projeto)), busca, null);
  const subtarefasDaSelecao = subtarefasDoColaborador.filter((s) => naSelecao(s.tarefa.projeto) && correspondeABusca(busca, [
    s.titulo, s.tarefa.nome, s.tarefa.projeto.nome, s.tarefa.projeto.cliente.razaoSocial,
    codigoSubtarefa(s.tarefa.projeto.cliente.numeroIdentificacao, s.tarefa.projeto.numeroLocal, s.tarefa.numeroLocal, s.numeroLocal),
  ]));

  // "Aguardando outras pessoas" é um filtro à parte da situação do prazo e vale só para tarefas: o botão conta as da seleção atual.
  const soAguardando = aguardando === "1";
  const totalAguardando = tarefasDaSelecao.filter((tarefa) => tarefa.aguardandoOutras).length;

  const linhasTarefa: LinhaMinhas[] = (soAguardando ? tarefasDaSelecao.filter((tarefa) => tarefa.aguardandoOutras) : tarefasDaSelecao).map((t) => ({
    chave: `tarefa:${t.id}`,
    tipo: "tarefa",
    id: t.id,
    titulo: t.nome,
    codigo: codigoTarefa(t.projeto.cliente.numeroIdentificacao, t.projeto.numeroLocal, t.numeroLocal),
    complemento: t.subtarefas.length > 0 ? `${t.subtarefas.filter((s) => s.status === "CONCLUIDO").length}/${t.subtarefas.length} subtarefas` : undefined,
    aguardam: t._count.subtarefas,
    projeto: { nome: t.projeto.nome },
    cliente: { razaoSocial: t.projeto.cliente.razaoSocial },
    prazo: t.prazo,
    status: t.status,
    aguardandoOutras: t.aguardandoOutras,
    acao: acaoDaLinha({ tipo: "tarefa", meu: t.meu, status: t.status, ativo: t.ativo, comprovanteExigido: t.comprovanteExigido, pedidoPendente: t.solicitacoesConclusao.length > 0 }),
  }));
  const linhasSubtarefa: LinhaMinhas[] = soAguardando ? [] : subtarefasDaSelecao.map((s) => ({
    chave: `subtarefa:${s.id}`,
    tipo: "subtarefa",
    id: s.id,
    titulo: s.titulo,
    codigo: codigoSubtarefa(s.tarefa.projeto.cliente.numeroIdentificacao, s.tarefa.projeto.numeroLocal, s.tarefa.numeroLocal, s.numeroLocal),
    tarefaOrigem: { id: s.tarefa.id, nome: s.tarefa.nome },
    aguardam: 0,
    projeto: { nome: s.tarefa.projeto.nome },
    cliente: { razaoSocial: s.tarefa.projeto.cliente.razaoSocial },
    prazo: s.prazo,
    status: s.status,
    aguardandoOutras: false,
    acao: acaoDaLinha({ tipo: "subtarefa", meu: true, status: s.status, ativo: s.ativo, comprovanteExigido: s.comprovanteExigido, pedidoPendente: s.pedidoPendente }),
  }));
  const contagemTipo = { todos: linhasTarefa.length + linhasSubtarefa.length, tarefas: linhasTarefa.length, subtarefas: linhasSubtarefa.length };

  // Cada item recebe sua situação de prazo; as contagens dos botões usam a lista antes desse filtro, já no tipo escolhido.
  const situacaoFiltro = interpretarSituacao(situacaoParametro);
  const itens = [...linhasTarefa, ...linhasSubtarefa]
    .filter((linha) => tipoNaLista(linha.tipo, tipoFiltro))
    .map((linha) => ({
      linha,
      situacao: situacaoDoItem({ prazo: linha.prazo, status: linha.status, ativo: true }, limites.diasAmareloAte),
    }))
    // Prazo mais próximo primeiro, sem prazo no fim; a ordenação é estável, então tarefa e subtarefa de mesmo prazo mantêm a ordem.
    .sort((a, b) => (a.linha.prazo?.getTime() ?? Infinity) - (b.linha.prazo?.getTime() ?? Infinity));
  const contagens = contarSituacoes(itens.map((item) => item.situacao));
  // Itens abertos vêm antes dos concluídos e cancelados, mantendo a ordem de prazo dentro de cada grupo.
  const visiveis = (situacaoFiltro === "todos" ? itens : itens.filter((item) => item.situacao === situacaoFiltro))
    .sort((a, b) => Number(a.situacao === "fechado") - Number(b.situacao === "fechado"));
  const semItens = tarefas.length === 0 && subtarefasDoColaborador.length === 0;

  return (
    <div className="w-full max-w-[1280px]">
      <h1 className="text-2xl">Minhas tarefas</h1>
      <p className="mt-1 text-sm text-cinza">Tarefas e subtarefas em que você é o responsável, em ordem de prazo.</p>

      <FiltrosListagens
        key={`${clienteId}|${projetoId}|${situacaoFiltro}|${soAguardando}|${tipoFiltro}`}
        rota="/minhas-tarefas"
        clientes={clientes}
        projetos={projetos}
        tarefas={[]}
        responsaveis={[]}
        ocultarTarefa
        ocultarResponsavel
        botaoAguardando={{ total: totalAguardando, ativoInicial: soAguardando }}
        tipoLista={{ inicial: tipoFiltro, contagens: contagemTipo }}
        clienteInicial={clienteId}
        projetoInicial={projetoId}
        buscaInicial={busca}
        placeholderBusca="Buscar por nome, projeto, cliente ou ID"
        situacaoInicial={situacaoFiltro}
        rotulosSituacao={rotulosSituacao(limites.diasAmareloAte)}
        contagens={contagens}
        total={visiveis.length}
        singular="item"
        plural="itens"
      />

      {visiveis.length === 0 ? (
        <Vazio
          titulo={semItens ? "Nada atribuído a você ainda." : "Nenhum item nesta seleção."}
          descricao={semItens ? "Quando uma tarefa ou subtarefa for atribuída a você, ela aparece aqui." : "Ajuste a busca ou os filtros."}
        />
      ) : (
        <TabelaLista rotulo="Tabela de minhas tarefas" colunas={COLUNAS}>
          {visiveis.map(({ linha: l }) => (
            <LinhaLista key={l.chave}>
              <CelulaLista larga>
                <TituloLinha href={`/minhas-tarefas/${l.tarefaOrigem?.id ?? l.id}`}>{l.titulo}</TituloLinha>
                <TextoSecundario>
                  <span className="tabular-nums text-faint">{l.codigo}</span>
                  {l.tarefaOrigem && <span> · Subtarefa de {l.tarefaOrigem.nome}</span>}
                  {l.complemento && <span className="tabular-nums"> · {l.complemento}</span>}
                </TextoSecundario>
                {l.aguardam > 0 && <span className="mt-px block text-[12.5px] text-ambar">{l.aguardam} {l.aguardam === 1 ? "subtarefa aguarda" : "subtarefas aguardam"} atribuição</span>}
              </CelulaLista>
              <CelulaLista larga>
                <TextoPrincipal>{l.projeto.nome}</TextoPrincipal>
                <TextoSecundario>{l.cliente.razaoSocial}</TextoSecundario>
              </CelulaLista>
              <CelulaLista rotulo="Prazo"><CelulaPrazo prazo={l.prazo} status={l.status} ativo limites={limites} /></CelulaLista>
              <CelulaLista rotulo="Status"><StatusPonto status={l.status}>{status[l.status] ?? l.status}</StatusPonto></CelulaLista>
              <CelulaLista rotulo="Ação">
                {/* Acima do link esticado do título, para o botão continuar clicável. */}
                <div className="relative z-10">
                  {l.acao === "concluir" && (
                    <form action={(l.tipo === "tarefa" ? concluirTarefaFormAction : concluirSubtarefaFormAction).bind(null, l.id)}>
                      <button className={botaoSecundarioPequeno} title="Envia o pedido de conclusão; a administração confirma.">Concluir</button>
                    </form>
                  )}
                  {l.acao === "comprovante" && (
                    <Link href={`/minhas-tarefas/${l.tarefaOrigem?.id ?? l.id}`} className={botaoSecundarioPequeno} title="Este item exige comprovante: envie os arquivos na página dele.">Enviar comprovante</Link>
                  )}
                  {l.acao === null && l.aguardandoOutras && <span className="text-[12.5px] text-cinza">Aguardando outras pessoas</span>}
                </div>
              </CelulaLista>
            </LinhaLista>
          ))}
        </TabelaLista>
      )}
    </div>
  );
}
