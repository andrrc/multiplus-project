import { Prisma, PrismaClient, type Perfil } from "@prisma/client";

/**
 * Dois clientes Prisma, os dois apontando pro banco de TESTE (nunca pro de
 * dev): `ownerDb` é a role dona das tabelas (bypassa RLS — usada só pra
 * montar/limpar fixtures) e `appDb` é a role `multiplus_app` (RLS-restrita
 * — a mesma que a aplicação usa em runtime pra tudo que já está
 * autenticado). Os testes exercitam RLS/trigger passando por `appDb`.
 */
export const ownerDb = new PrismaClient({
  datasources: { db: { url: process.env.TEST_DATABASE_URL } },
});

export const appDb = new PrismaClient({
  datasources: { db: { url: process.env.TEST_APP_DATABASE_URL } },
});

export type ContextoUsuario = { usuarioId: string; perfil: Perfil };

/**
 * Espelha src/lib/prisma-app.ts#comContextoDeUsuario, mas contra o banco de
 * teste — mesmo padrão (set_config parametrizado, escopado à transação) que
 * o código de produção usa pra popular app.usuario_id/app.perfil que as
 * políticas de RLS leem.
 */
export function comoUsuario<T>(
  ctx: ContextoUsuario,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return appDb.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.usuario_id', ${ctx.usuarioId}, true)`;
    await tx.$executeRaw`SELECT set_config('app.perfil', ${ctx.perfil}, true)`;
    return fn(tx);
  });
}

/** Apaga, em ordem segura de FK, todas as linhas criadas pelos testes. */
export async function limparFixtures(): Promise<void> {
  await ownerDb.tokenAcesso.deleteMany();
  await ownerDb.atribuicao.deleteMany();
  await ownerDb.subtarefa.deleteMany();
  await ownerDb.tarefa.deleteMany();
  await ownerDb.projeto.deleteMany();
  await ownerDb.usuario.deleteMany();
  await ownerDb.cliente.deleteMany();
}

export async function fecharConexoes(): Promise<void> {
  await ownerDb.$disconnect();
  await appDb.$disconnect();
}
