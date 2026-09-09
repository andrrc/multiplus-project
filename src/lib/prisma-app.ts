import { Prisma, PrismaClient } from "@prisma/client";
import type { Perfil } from "@prisma/client";

/**
 * Cliente Prisma conectado como a role `multiplus_app` (RLS-restrita — ver
 * prisma/migrations/*_rls_policies). Usar para toda operação já autenticada
 * (após login). Login, criação de token e validação de token continuam na
 * role dona das tabelas (`src/lib/prisma.ts`), que roda antes de existir
 * sessão de usuário.
 */
const globalForPrismaApp = globalThis as unknown as {
  prismaApp: PrismaClient | undefined;
};

export const prismaApp =
  globalForPrismaApp.prismaApp ??
  new PrismaClient({
    datasources: { db: { url: process.env.APP_DATABASE_URL } },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrismaApp.prismaApp = prismaApp;
}

export type ContextoUsuario = {
  usuarioId: string;
  perfil: Perfil;
};

/**
 * Executa `fn` numa transação com `app.usuario_id`/`app.perfil` setados via
 * `set_config(..., true)` (equivalente a SET LOCAL, mas parametrizável —
 * evita concatenar valores direto no SQL). As políticas de RLS do Postgres
 * leem essas duas variáveis para decidir o que cada perfil enxerga/altera.
 */
export function comContextoDeUsuario<T>(
  ctx: ContextoUsuario,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prismaApp.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.usuario_id', ${ctx.usuarioId}, true)`;
    await tx.$executeRaw`SELECT set_config('app.perfil', ${ctx.perfil}, true)`;
    return fn(tx);
  });
}
