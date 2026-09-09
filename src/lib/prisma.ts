import { PrismaClient } from "@prisma/client";

/**
 * Cliente Prisma conectado como a role dona das tabelas (DATABASE_URL — sem
 * RLS). Reservado para as operações que precisam rodar antes de existir uma
 * sessão de usuário: login por credenciais, emissão/validação de token de
 * acesso (definir/recuperar senha) e a própria criação de usuário pelo ADMIN.
 * Qualquer outra leitura/escrita de dados de domínio deve passar pela role
 * restrita por RLS — ver src/lib/prisma-app.ts.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
