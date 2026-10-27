import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
