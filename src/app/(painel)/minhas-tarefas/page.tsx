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
import { BotoesSituacao } from "@/ui/botoes-situacao";
import { TelaTarefasExterno } from "./tela-externo";
import { CelulaLista, CelulaPrazo, LinhaLista, StatusPonto, TabelaLista, TextoPrincipal, TextoSecundario, TituloLinha, Vazio } from "@/ui/lista";

const status: Record<string, string> = { A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", AGUARDANDO_DOCUMENTO_CLIENTE: "Aguardando documento", VISITA_REUNIAO_AGENDADA: "Visita/reunião agendada", PROTOCOLADO: "Protocolado", SOB_ANALISE_ORGAO_AMBIENTAL: "Sob análise do órgão", COM_EXIGENCIA_A_CUMPRIR: "Com exigência", CONCLUIDO: "Concluída", CANCELADO: "Cancelada" };

const COLUNAS = [
  { titulo: "Tarefa", largura: "36%" },
  { titulo: "Projeto e cliente", largura: "26%" },
  { titulo: "Prazo", largura: "16%" },
  { titulo: "Status", largura: "22%" },
];

export default async function MinhasTarefasPage({ searchParams }: { searchParams: Promise<{ situacao?: string | string[] }> }) {
  const ctx = await exigirAcessoARota("/minhas-tarefas");
  const { situacao: situacaoParametro } = await searchParams;
  const [tarefas, limites] = await Promise.all([
    listarTarefasAtribuidas(ctx),
    buscarLimitesSemaforo(ctx),
  ]);

  // O colaborador externo tem uma tela própria, pensada para o celular; os dados são os mesmos.
  if (ctx.perfil === "ADMIN_EXTERNO") {
    const sessao = await auth();
    return <TelaTarefasExterno nome={sessao?.user?.name ?? ""} tarefas={tarefas} limites={limites} />;
  }

  // Cada tarefa recebe sua situação de prazo; as contagens dos botões usam a lista inteira.
  const situacaoFiltro = interpretarSituacao(situacaoParametro);
  const itens = tarefas.map((tarefa) => ({
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

      <BotoesSituacao
        key={situacaoFiltro}
        rota="/minhas-tarefas"
        rotulos={rotulosSituacao(limites.diasAmareloAte)}
        contagens={contagens}
        situacaoInicial={situacaoFiltro}
        total={visiveis.length}
        singular="tarefa"
        plural="tarefas"
      />

      {visiveis.length === 0 ? (
        <Vazio
          titulo={tarefas.length === 0 ? "Nenhuma tarefa atribuída a você ainda." : "Nenhuma tarefa nesta seleção."}
          descricao={tarefas.length === 0 ? "Quando uma tarefa for atribuída a você, ela aparece aqui." : "Ajuste o filtro de situação."}
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
