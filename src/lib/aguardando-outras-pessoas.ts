/**
 * "Aguardando outras pessoas" no trabalho do colaborador interno (protótipo interno/02 e painel): uma tarefa aberta dele
 * que não anda só por ele. Conta quando há um pedido de conclusão esperando confirmação (da tarefa ou de uma subtarefa)
 * ou quando há subtarefa em andamento atribuída a outra pessoa. A regra é derivada de dados que a consulta já traz.
 */
export type EuColaborador = { usuarioId: string; pessoaEnvolvidaId: string | null };

type SubtarefaDaTarefa = {
  status: string;
  ativo: boolean;
  atribuidoAId: string | null;
  atribuidoAUsuarioId: string | null;
  /** Pedidos de conclusão ainda pendentes desta subtarefa. */
  solicitacoesConclusao: readonly unknown[];
};

type TarefaDoColaborador = {
  status: string;
  ativo: boolean;
  /** Pedidos de conclusão ainda pendentes desta tarefa. */
  solicitacoesConclusao: readonly unknown[];
  subtarefas: readonly SubtarefaDaTarefa[];
};

export function aguardaOutrasPessoas(tarefa: TarefaDoColaborador, eu: EuColaborador): boolean {
  if (!tarefa.ativo || tarefa.status === "CONCLUIDO" || tarefa.status === "CANCELADO") return false;
  const subtarefasAtivas = tarefa.subtarefas.filter((subtarefa) => subtarefa.ativo);
  const pedidoPendente = tarefa.solicitacoesConclusao.length > 0 || subtarefasAtivas.some((subtarefa) => subtarefa.solicitacoesConclusao.length > 0);
  const comOutraPessoa = subtarefasAtivas.some((subtarefa) =>
    subtarefa.status === "EM_ANDAMENTO" &&
    ((subtarefa.atribuidoAUsuarioId !== null && subtarefa.atribuidoAUsuarioId !== eu.usuarioId) ||
      (subtarefa.atribuidoAId !== null && subtarefa.atribuidoAId !== eu.pessoaEnvolvidaId)));
  return pedidoPendente || comOutraPessoa;
}
