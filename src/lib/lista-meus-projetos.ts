/**
 * Regras da lista "Meus projetos" do colaborador interno (protótipo interno/03): busca, filtro de cliente, abas de
 * situação com contagem e ordenação. Trabalha sobre os projetos que a consulta já entregou ao colaborador pela RLS;
 * não amplia nenhum acesso.
 */
import { calcularDiasRestantes } from "@/lib/datas";
import { correspondeABusca } from "@/lib/busca-lista";
import { codigoProjeto } from "@/lib/identificadores-hierarquicos";
import { ordenarLista, type OrdemLista } from "@/lib/ordenacao-lista";

export type SituacaoMeusProjetos = "ativos" | "atraso" | "concluidos" | "todos";
export type OrdemMeusProjetos = "prazo" | "nome" | "abertas";

const SITUACOES: SituacaoMeusProjetos[] = ["ativos", "atraso", "concluidos", "todos"];
const ORDENS: OrdemMeusProjetos[] = ["prazo", "nome", "abertas"];

type TarefaDoProjeto = { ativo: boolean; status: string; prazo: Date | null };
type ProjetoDaLista = {
  nome: string;
  status: string;
  clienteId: string;
  numeroLocal: number;
  dataPrevistaConclusao: Date | null;
  cliente: { razaoSocial: string; numeroIdentificacao: number };
  tarefas: TarefaDoProjeto[];
};

/** Sem parâmetro (ou com valor desconhecido), a lista abre em "Ativos", como no protótipo. */
export function interpretarSituacaoMeusProjetos(valor: string | string[] | undefined): SituacaoMeusProjetos {
  return typeof valor === "string" && (SITUACOES as string[]).includes(valor) ? (valor as SituacaoMeusProjetos) : "ativos";
}

export function interpretarOrdemMeusProjetos(valor: string | string[] | undefined): OrdemMeusProjetos {
  return typeof valor === "string" && (ORDENS as string[]).includes(valor) ? (valor as OrdemMeusProjetos) : "prazo";
}

export const tarefaEmAberto = (tarefa: TarefaDoProjeto) => tarefa.ativo && tarefa.status !== "CONCLUIDO" && tarefa.status !== "CANCELADO";

/** Tarefas em aberto cujo prazo já passou. */
export const tarefasAtrasadas = (projeto: { tarefas: TarefaDoProjeto[] }) =>
  projeto.tarefas.filter((tarefa) => tarefaEmAberto(tarefa) && tarefa.prazo && calcularDiasRestantes(tarefa.prazo) < 0).length;

const projetoAtivo = (projeto: { status: string }) => projeto.status !== "CONCLUIDO" && projeto.status !== "CANCELADO";

export function prepararMeusProjetos<P extends ProjetoDaLista>(
  projetos: readonly P[],
  { busca, clienteId, situacao, ordem }: { busca: string; clienteId: string; situacao: SituacaoMeusProjetos; ordem: OrdemMeusProjetos },
): { contagens: Record<SituacaoMeusProjetos, number>; visiveis: P[] } {
  // As contagens das abas valem para a busca e o cliente escolhidos, antes de a aba filtrar.
  const base = projetos.filter((p) =>
    (!clienteId || p.clienteId === clienteId) &&
    correspondeABusca(busca, [p.nome, p.cliente.razaoSocial, codigoProjeto(p.cliente.numeroIdentificacao, p.numeroLocal)]));
  const contagens = {
    ativos: base.filter(projetoAtivo).length,
    atraso: base.filter((p) => projetoAtivo(p) && tarefasAtrasadas(p) > 0).length,
    concluidos: base.filter((p) => p.status === "CONCLUIDO").length,
    todos: base.length,
  };
  const daAba = base.filter((p) =>
    situacao === "todos" ? true
    : situacao === "concluidos" ? p.status === "CONCLUIDO"
    : situacao === "atraso" ? projetoAtivo(p) && tarefasAtrasadas(p) > 0
    : projetoAtivo(p));
  const ordemLista: OrdemLista = { chave: ordem, direcao: ordem === "abertas" ? "desc" : "asc" };
  const visiveis = ordenarLista(daAba, ordemLista, {
    prazo: (p) => p.dataPrevistaConclusao,
    nome: (p) => p.nome,
    abertas: (p) => p.tarefas.filter(tarefaEmAberto).length,
  });
  return { contagens, visiveis };
}
