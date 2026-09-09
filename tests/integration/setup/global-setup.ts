import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

/**
 * Roda uma vez antes da suíte inteira (Vitest `globalSetup`). Garante que o
 * banco `multiplus_test` existe e está com as migrations em dia — nunca toca
 * no banco de dev (`multiplus`). Os testes então conectam como a role
 * `multiplus_app` (RLS-restrita) nesse banco separado — ver
 * tests/integration/setup/helpers.ts.
 */
export default async function setup() {
  const dbUrl = process.env.TEST_DATABASE_URL;
  if (!dbUrl) {
    throw new Error("TEST_DATABASE_URL não configurada — ver .env.example");
  }

  const nomeBanco = new URL(dbUrl).pathname.replace(/^\//, "");
  const urlBancoPadrao = dbUrl.replace(`/${nomeBanco}`, "/postgres");

  const admin = new PrismaClient({ datasources: { db: { url: urlBancoPadrao } } });
  try {
    const existe = await admin.$queryRawUnsafe<{ existe: boolean }[]>(
      `SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1) as existe`,
      nomeBanco,
    );
    if (!existe[0]?.existe) {
      // CREATE DATABASE não aceita parâmetro — nome vem de env, não de input externo.
      await admin.$executeRawUnsafe(`CREATE DATABASE "${nomeBanco}"`);
    }
  } finally {
    await admin.$disconnect();
  }

  execSync("npx prisma migrate deploy", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: "inherit",
  });
}
