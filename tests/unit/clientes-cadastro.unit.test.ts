/**
 * Cadastro incompleto do cliente: falta o segmento ou a cidade (protótipo 06-clientes).
 */
import { describe, expect, it } from "vitest";
import { clienteIncompleto } from "@/lib/clientes-cadastro";

describe("clienteIncompleto", () => {
  it("é completo quando tem segmento e cidade", () => {
    expect(clienteIncompleto({ segmento: "Indústria", municipio: "Itapetininga" })).toBe(false);
  });

  it("é incompleto sem segmento", () => {
    expect(clienteIncompleto({ segmento: "", municipio: "Itapetininga" })).toBe(true);
    expect(clienteIncompleto({ segmento: null, municipio: "Itapetininga" })).toBe(true);
  });

  it("é incompleto sem cidade", () => {
    expect(clienteIncompleto({ segmento: "Indústria", municipio: null })).toBe(true);
    expect(clienteIncompleto({ segmento: "Indústria", municipio: "" })).toBe(true);
  });

  it("trata texto só com espaços como ausente", () => {
    expect(clienteIncompleto({ segmento: "   ", municipio: "Tatuí" })).toBe(true);
    expect(clienteIncompleto({ segmento: "Comércio", municipio: "  " })).toBe(true);
  });

  it("é incompleto quando faltam os dois", () => {
    expect(clienteIncompleto({ segmento: "", municipio: null })).toBe(true);
  });
});
