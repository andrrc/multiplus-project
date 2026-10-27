import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Configuração separada para os testes unitários em `tests/unit`: não inicia setup global
 * nem banco de dados. `vitest.config.mts` seleciona integração e smoke, que usam Postgres.
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
