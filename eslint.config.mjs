import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Junta as regras recomendadas pelo Next.js para acessibilidade/desempenho e TypeScript.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Substitui a lista padrão de caminhos ignorados pelo ESLint.
  globalIgnores([
    // Saídas de build e tipos gerados não são código-fonte para análise.
    ".next/**",
    ".next-browser-test/**",
    "test-results/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
