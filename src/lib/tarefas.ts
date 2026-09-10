import { comContextoDeUsuario, type ContextoUsuario } from "@/lib/prisma-app";

/**
 * RF-005/RN-006/ADR-007 — define o responsável de uma tarefa (qualquer Pessoa Envolvida,
 * com ou sem acesso ao sistema). Quando a pessoa tem acesso (`temAcesso = true` e existe um
 * `Usuario` vinculado), cria automaticamente o registro de `Atribuicao` correspondente —
 * ela passa a ver a tarefa no próprio login sem passo manual adicional. Quando não tem
 * acesso, nenhuma `Atribuicao` é criada; a tarefa fica marcada com aquele responsável só
 * para controle e registro.
 *
 * Ao TROCAR o responsável (decisão confirmada com a Talita/André após o fechamento da
 * sprint), a `Atribuicao` da pessoa anterior é removida — ela deixa de ver a tarefa assim
 * que perde a responsabilidade por ela.
 *
 * Sem tela própria nesta sprint — o módulo de Projetos/Tarefas ainda não tem CRUD/UI (só o
 * esqueleto de RLS da Sprint 1). Esta função existe pra deixar o schema/RLS/RN-006 prontos e
 * testados, pra reaproveitar quando a UI do módulo for construída.
 */
export async function definirResponsavelTarefa(
  ctx: ContextoUsuario,
  tarefaId: string,
  pessoaEnvolvidaId: string | null,
) {
  return comContextoDeUsuario(ctx, async (tx) => {
    const tarefaAnterior = await tx.tarefa.findUniqueOrThrow({
      where: { id: tarefaId },
      select: { responsavelId: true },
    });

    await tx.tarefa.update({ where: { id: tarefaId }, data: { responsavelId: pessoaEnvolvidaId } });

    // RN-006 (troca de responsável): remove a Atribuicao da pessoa anterior, se houver.
    if (tarefaAnterior.responsavelId && tarefaAnterior.responsavelId !== pessoaEnvolvidaId) {
      const pessoaAnterior = await tx.pessoaEnvolvida.findUnique({
        where: { id: tarefaAnterior.responsavelId },
        include: { usuario: true },
      });

      if (pessoaAnterior?.usuario) {
        await tx.atribuicao.deleteMany({
          where: { usuarioId: pessoaAnterior.usuario.id, entidadeTipo: "TAREFA", entidadeId: tarefaId },
        });
      }
    }

    if (!pessoaEnvolvidaId) return;

    const pessoa = await tx.pessoaEnvolvida.findUnique({
      where: { id: pessoaEnvolvidaId },
      include: { usuario: true },
    });

    if (pessoa?.temAcesso && pessoa.usuario) {
      await tx.atribuicao.upsert({
        where: {
          usuarioId_entidadeTipo_entidadeId: {
            usuarioId: pessoa.usuario.id,
            entidadeTipo: "TAREFA",
            entidadeId: tarefaId,
          },
        },
        create: { usuarioId: pessoa.usuario.id, entidadeTipo: "TAREFA", entidadeId: tarefaId },
        update: {},
      });
    }
  });
}
