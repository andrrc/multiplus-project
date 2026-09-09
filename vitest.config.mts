import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    include: [
      "tests/integration/**/*.integration.test.ts",
      "tests/smoke/**/*.smoke.test.ts",
    ],
    globalSetup: ["tests/integration/setup/global-setup.ts"],
    setupFiles: ["tests/setup-env.ts"],
    // Fixtures + trigger de banco real — mais lento que teste unitário.
    testTimeout: 20_000,
    hookTimeout: 30_000,
    // RLS/UPDATE concorrente na mesma tabela entre arquivos — roda um de cada vez.
    fileParallelism: false,
  },
});
