/**
 * Página da rota `src/app/(painel)/minhas-tarefas/page.tsx`. Recebe os parâmetros da URL ou da rota, valida o acesso no servidor, obtém os dados necessários e compõe a resposta visual; as regras de negócio permanecem nas funções de domínio chamadas por ela.
 */
import { auth } from "@/server/auth";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { listarTarefasAtribuidas } from "@/lib/projetos-tarefas";
import { buscarLimitesSemaforo } from "@/lib/semaforo";
import { calcularDiasRestantes } from "@/lib/datas";
import { codigoTarefa } from "@/lib/identificadores-hierarquicos";
import { contarSituacoes, interpretarSituacao, rotulosSituacao, situacaoDoPrazo } from "@/lib/situacao-prazo";
import { FiltrosListagens } from "../filtros-listagens";
import { interpretarBuscaLista } from "@/lib/busca-lista";
import { buscarEOrdenarTarefas } from "@/lib/lista-tarefas";
import { TelaTarefasExterno } from "./tela-externo";
import { CelulaLista, CelulaPrazo, LinhaLista, StatusPonto, TabelaLista, TextoPrincipal, TextoSecundario, TituloLinha, Vazio } from "@/ui/lista";

const status: Record<string, string> = { A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", AGUARDANDO_DOCUMENTO_CLIENTE: "Aguardando documento", VISITA_REUNIAO_AGENDADA: "Visita/reunião agendada", PROTOCOLADO: "Protocolado", SOB_ANALISE_ORGAO_AMBIENTAL: "Sob análise do órgão", COM_EXIGENCIA_A_CUMPRIR: "Com exigência", CONCLUIDO: "Concluída", CANCELADO: "Cancelada" };

const COLUNAS = [
  { titulo: "Tarefa", largura: "36%" },
  { titulo: "Projeto e cliente", largura: "26%" },
  { titulo: "Prazo", largura: "16%" },
  { titulo: "Status", largura: "22%" },
];

export default async function MinhasTarefasPage({ searchParams }: { searchParams: Promise<{ situacao?: string | string[]; busca?: string | string[]; cliente?: string; projeto?: string }> }) {
  const ctx = await exigirAcessoARota("/minhas-tarefas");
  const { situacao: situacaoParametro, busca: buscaParametro, cliente, projeto } = await searchParams;
  const [tarefas, limites] = await Promise.all([
    listarTarefasAtribuidas(ctx),
    buscarLimitesSemaforo(ctx),
  ]);

  // O colaborador externo tem uma tela própria, pensada para o celular; os dados são os mesmos.
  if (ctx.perfil === "ADMIN_EXTERNO") {
    const sessao = await auth();
    return <TelaTarefasExterno nome={sessao?.user?.name ?? ""} tarefas={tarefas} limites={limites} />;
  }

  // Busca, cliente e projeto valem sobre as tarefas que a consulta já entregou a este colaborador.
  const busca = interpretarBuscaLista(buscaParametro);
  const clienteId = typeof cliente === "string" ? cliente : "";
  const projetoId = typeof projeto === "string" ? projeto : "";
  const clientes = [...new Map(tarefas.map((t) => [t.projeto.cliente.id, t.projeto.cliente.razaoSocial])).entries()]
    .map(([id, razaoSocial]) => ({ id, razaoSocial }))
    .sort((a, b) => a.razaoSocial.localeCompare(b.razaoSocial, "pt-BR"));
  const projetos = [...new Map(tarefas.map((t) => [t.projeto.id, { id: t.projeto.id, nome: t.projeto.nome, cliente: { id: t.projeto.cliente.id } }])).values()]
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const daSelecao = buscarEOrdenarTarefas(
    tarefas.filter((t) => (!clienteId || t.projeto.cliente.id === clienteId) && (!projetoId || t.projeto.id === projetoId)),
    busca,
    null,
  );

  // Cada tarefa recebe sua situação de prazo; as contagens dos botões usam a lista antes desse filtro.
  const situacaoFiltro = interpretarSituacao(situacaoParametro);
  const itens = daSelecao.map((tarefa) => ({
    tarefa,
    situacao: situacaoDoPrazo(
      { diasRestantes: tarefa.prazo ? calcularDiasRestantes(tarefa.prazo) : null, fechado: tarefa.status === "CONCLUIDO" || tarefa.status === "CANCELADO" },
      limites.diasAmareloAte,
    ),
  }));
  const contagens = contarSituacoes(itens.map((item) => item.situacao));
  // Tarefas abertas vêm antes das concluídas e canceladas, mantendo a ordem de prazo da consulta.
  const visiveis = (situacaoFiltro === "todos" ? itens : itens.filter((item) => item.situacao === situacaoFiltro))
    .sort((a, b) => Number(a.situacao === "fechado") - Number(b.situacao === "fechado"));

  return (
    <div className="w-full max-w-[1280px]">
      <h1 className="text-2xl">Minhas tarefas</h1>
      <p className="mt-1 text-sm text-cinza">Tarefas em que você é o responsável, em ordem de prazo.</p>

      <FiltrosListagens
        key={`${clienteId}|${projetoId}|${situacaoFiltro}`}
        rota="/minhas-tarefas"
        clientes={clientes}
        projetos={projetos}
        tarefas={[]}
        responsaveis={[]}
        ocultarTarefa
        ocultarResponsavel
        clienteInicial={clienteId}
        projetoInicial={projetoId}
        buscaInicial={busca}
        placeholderBusca="Buscar por nome, projeto, cliente ou ID"
        situacaoInicial={situacaoFiltro}
        rotulosSituacao={rotulosSituacao(limites.diasAmareloAte)}
        contagens={contagens}
        total={visiveis.length}
        singular="tarefa"
        plural="tarefas"
      />

      {visiveis.length === 0 ? (
        <Vazio
          titulo={tarefas.length === 0 ? "Nenhuma tarefa atribuída a você ainda." : "Nenhuma tarefa nesta seleção."}
          descricao={tarefas.length === 0 ? "Quando uma tarefa for atribuída a você, ela aparece aqui." : "Ajuste a busca ou os filtros."}
        />
      ) : (
        <TabelaLista rotulo="Tabela de minhas tarefas" colunas={COLUNAS}>
          {visiveis.map(({ tarefa: t }) => (
            <LinhaLista key={t.id}>
              <CelulaLista larga>
                <TituloLinha href={`/minhas-tarefas/${t.id}`}>{t.nome}</TituloLinha>
                <TextoSecundario>
                  <span className="tabular-nums text-faint">{codigoTarefa(t.projeto.cliente.numeroIdentificacao, t.projeto.numeroLocal, t.numeroLocal)}</span>
                  {t.subtarefas.length > 0 && <span className="tabular-nums"> · {t.subtarefas.filter((s) => s.status === "CONCLUIDO").length}/{t.subtarefas.length} subtarefas</span>}
                </TextoSecundario>
                {t._count.subtarefas > 0 && <span className="mt-px block text-[12.5px] text-ambar">{t._count.subtarefas} {t._count.subtarefas === 1 ? "subtarefa aguarda" : "subtarefas aguardam"} atribuição</span>}
              </CelulaLista>
              <CelulaLista larga>
                <TextoPrincipal>{t.projeto.nome}</TextoPrincipal>
                <TextoSecundario>{t.projeto.cliente.razaoSocial}</TextoSecundario>
              </CelulaLista>
              <CelulaLista rotulo="Prazo"><CelulaPrazo prazo={t.prazo} status={t.status} ativo limites={limites} /></CelulaLista>
              <CelulaLista rotulo="Status"><StatusPonto status={t.status}>{status[t.status] ?? t.status}</StatusPonto></CelulaLista>
            </LinhaLista>
          ))}
        </TabelaLista>
      )}
    </div>
  );
}
