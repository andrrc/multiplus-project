import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Isola a compilação dos testes de navegador do servidor de desenvolvimento aberto.
  ...(process.env.MULTIPLUS_TESTE_NAVEGADOR === "1" ? { distDir: ".next-browser-test" } : {}),
  // Empacota servidor e dependências no formato usado pela imagem de produção.
  output: "standalone",
  experimental: {
    serverActions: {
      // Permite anexos de comentários até o limite definido pelo projeto.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
