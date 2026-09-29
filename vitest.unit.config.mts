import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Config separada dos testes unitários (tests/unit) — sem globalSetup nem banco de
 * dados. Ver vitest.config.mts para integration/smoke (que dependem de Postgres).
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    // Alguns testes unitários importam módulos de domínio que inicializam Prisma.
    // O setup só aponta as URLs para o banco efêmero; não abre conexão nem roda migrations.
    setupFiles: ["tests/setup-env.ts"],
  },
});
