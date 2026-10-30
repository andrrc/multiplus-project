import "dotenv/config";
import { defineConfig } from "@playwright/test";
import { validarDestinosDeTeste, validarSeparacaoDeBancos } from "./tests/integration/setup/banco-teste-seguro";

validarDestinosDeTeste(process.env.TEST_DATABASE_URL, process.env.TEST_APP_DATABASE_URL);
for (const key of ["TEST_DATABASE_URL", "TEST_APP_DATABASE_URL"] as const) {
  const url = new URL(process.env[key]!);
  url.pathname = "/multiplus_test_e2e";
  process.env[key] = url.toString();
}
validarDestinosDeTeste(process.env.TEST_DATABASE_URL, process.env.TEST_APP_DATABASE_URL);
validarSeparacaoDeBancos(process.env.TEST_DATABASE_URL!, [process.env.DATABASE_URL, process.env.APP_DATABASE_URL]);

export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  fullyParallel: false,
  reporter: "list",
  globalSetup: "./tests/browser/setup.ts",
  use: { baseURL: "http://localhost:3105", trace: "off", screenshot: "off" },
  webServer: {
    command: "npx next dev --port 3105",
    url: "http://localhost:3105/login",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL!,
      APP_DATABASE_URL: process.env.TEST_APP_DATABASE_URL!,
      AUTH_URL: "http://localhost:3105",
      AUTH_SECRET: "segredo-exclusivo-para-testes-de-navegador",
      RESEND_API_KEY: "",
      MULTIPLUS_TESTE_NAVEGADOR: "1",
    },
  },
});
