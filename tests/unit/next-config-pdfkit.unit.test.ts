/**
 * A exportação em PDF responde 500 em produção se o pdfkit for embutido no bundle do servidor: na imagem
 * Docker (standalone) o pacote não é copiado e `#standard-fonts/Helvetica` não resolve. O pdfkit precisa ficar
 * como pacote externo para que o build o leve inteiro para a imagem.
 */
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("next.config: pdfkit", () => {
  it("mantém o pdfkit como pacote externo do servidor", () => {
    expect(nextConfig.serverExternalPackages).toContain("pdfkit");
  });
});
