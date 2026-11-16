import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Isola a compilação dos testes de navegador do servidor de desenvolvimento aberto.
  ...(process.env.MULTIPLUS_TESTE_NAVEGADOR === "1"
    ? { distDir: ".next-browser-test", devIndicators: false }
    : {}),
  // Empacota servidor e dependências no formato usado pela imagem de produção.
  output: "standalone",
  // O pdfkit lê arquivos do próprio pacote (fontes padrão via `#standard-fonts/*`). Embutido no bundle,
  // a imagem de produção (Alpine) não resolve esse caminho e a exportação em PDF responde 500.
  // Como pacote externo, o build copia o pdfkit inteiro para o `standalone`.
  serverExternalPackages: ["pdfkit"],
  experimental: {
    serverActions: {
      // Permite anexos de comentários até o limite definido pelo projeto.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
