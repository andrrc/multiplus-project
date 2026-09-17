import { comContextoDeUsuario, type ContextoUsuario } from "@/lib/prisma-app";

/**
 * RF-039 / RN-007 / ADR-008 — desativação (soft delete) das entidades que já existem.
 * Projeto, Tarefa e Subtarefa entram aqui na Sprint 4, quando tiverem CRUD.
 */
export type EntidadeDesativavel =
  | "cliente"
  | "pessoaEnvolvida"
  | "documento"
  | "usuario"
  | "projeto"
  | "tarefa"
  | "subtarefa";

export type ResultadoDesativacao =
  | { sucesso: true }
  | { sucesso: false; motivo: "sem_permissao" | "auto_desativacao" | "nao_encontrado" };

/**
 * RF-039 — desativa ou reativa um registro. Nunca apaga: o histórico (comentários,
 * conclusões, vínculos) continua no banco, e reativar devolve o registro ao estado exato
 * anterior, porque a cascata do ADR-008 é por herança e não marca os filhos.
 *
 * A checagem de perfil acontece aqui *e* no banco: as políticas `*_write` são todas
 * ADMIN-only, então mesmo uma chamada que escapasse desta função não conseguiria
 * desativar nada (RN-007). A redundância é proposital — esconder o botão não é permissão,
 * e um `throw` na Server Action também não seria, sozinho.
 */
export async function definirAtivo(
  ctx: ContextoUsuario,
  entidade: EntidadeDesativavel,
  id: string,
  ativo: boolean,
): Promise<ResultadoDesativacao> {
  if (ctx.perfil !== "ADMIN") return { sucesso: false, motivo: "sem_permissao" };

  // Sem isto, a Talita consegue se trancar para fora do próprio sistema: ela é a única
  // ADMIN, e só um ADMIN reativa usuário.
  if (entidade === "usuario" && id === ctx.usuarioId && !ativo) {
    return { sucesso: false, motivo: "auto_desativacao" };
  }

  const dados = ativo
    ? { ativo: true, desativadoEm: null, desativadoPor: null }
    : { ativo: false, desativadoEm: new Date(), desativadoPor: ctx.usuarioId };

  const afetados = await comContextoDeUsuario(ctx, async (tx) => {
    switch (entidade) {
      case "cliente":
        return (await tx.cliente.updateMany({ where: { id }, data: dados })).count;
      case "pessoaEnvolvida":
        return (await tx.pessoaEnvolvida.updateMany({ where: { id }, data: dados })).count;
      case "documento":
        return (await tx.documento.updateMany({ where: { id }, data: dados })).count;
      case "usuario":
        return (await tx.usuario.updateMany({ where: { id }, data: dados })).count;
      case "projeto":
        return (await tx.projeto.updateMany({ where: { id }, data: dados })).count;
      case "tarefa":
        return (await tx.tarefa.updateMany({ where: { id }, data: dados })).count;
      case "subtarefa":
        return (await tx.subtarefa.updateMany({ where: { id }, data: dados })).count;
    }
  });

  // `updateMany` em vez de `update` de propósito: quando a RLS esconde a linha, o
  // `updateMany` devolve count 0, enquanto `update` estoura um erro de registro
  // inexistente — que confundiria "não existe" com "você não pode".
  return afetados > 0 ? { sucesso: true } : { sucesso: false, motivo: "nao_encontrado" };
}

/**
 * RF-039 — um registro desativado é somente leitura. A RLS já impede escrever nos
 * *filhos* de um cliente desativado (as políticas `*_write` exigem `cliente_esta_ativo`),
 * mas o próprio cliente continua gravável pelo Administrador, porque é o UPDATE que o
 * reativa. Esta função é a guarda que falta para as edições de conteúdo.
 */
export async function exigirClienteAtivo(
  ctx: ContextoUsuario,
  clienteId: string,
  /** Completa a mensagem de erro com a ação que foi barrada — "…antes de <acao>." */
  acao = "editar o cadastro",
): Promise<void> {
  const cliente = await comContextoDeUsuario(ctx, (tx) =>
    tx.cliente.findUnique({ where: { id: clienteId }, select: { ativo: true } }),
  );
  if (!cliente) throw new Error("Cliente não encontrado.");
  if (!cliente.ativo) {
    throw new Error(`Este cliente está desativado. Reative-o antes de ${acao}.`);
  }
}
