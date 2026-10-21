/** RF-051 — validação de laudo, anotações e links privados. */
import { describe, expect, it } from "vitest";
import { validarDadosLaudo, validarAnotacaoLaudo, normalizarPaginaLaudo } from "@/lib/validacao-laudo";
import { formatarDataHoraBrasilia } from "@/lib/datas";

describe("RF-051 — validação", () => {
  it("preserva omissão e dispensa campos quando desmarcado", () => {
    expect(() => validarDadosLaudo()).not.toThrow();
    expect(() => validarDadosLaudo({ possui: false })).not.toThrow();
  });
  it.each(["AMBIENTAL", "RURAL", "AGROAMBIENTAL"] as const)("aceita o tipo %s", (tipo) => {
    expect(() => validarDadosLaudo({ possui: true, nome: "Laudo", tipo, responsavelId: "admin" })).not.toThrow();
  });
  it("exige nome, tipo, responsável e versão válida", () => {
    expect(() => validarDadosLaudo({ possui: true, nome: " " })).toThrow(/nome do laudo/);
    expect(() => validarDadosLaudo({ possui: true, nome: "L" })).toThrow(/tipo de laudo/);
    expect(() => validarDadosLaudo({ possui: true, nome: "L", tipo: "RURAL" })).toThrow(/responsável/);
    expect(() => validarDadosLaudo({ possui: false, versao: 0 })).toThrow(/Versão/);
  });
  it("aceita texto, somente links e múltiplos links; remove linhas vazias", () => {
    expect(validarAnotacaoLaudo({ texto: " Texto ", links: [" "] })).toEqual({ texto: "Texto", links: [] });
    expect(validarAnotacaoLaudo({ texto: "", links: ["https://drive.google.com/a", " http://example.com/b "] })).toEqual({ texto: "", links: ["https://drive.google.com/a", "http://example.com/b"] });
    expect(() => validarAnotacaoLaudo({ texto: " ", links: [""] })).toThrow(/anotação ou inclua/);
  });
  it.each(["javascript:alert(1)", "data:text/html,oi", "file:///arquivo", "ftp://example.com", "invalido"])("recusa link %s", (link) => {
    expect(() => validarAnotacaoLaudo({ texto: "A", links: [link] })).toThrow(/http ou https/);
  });
  it("normaliza paginação e apresenta instantes em Brasília", () => {
    for (const pagina of [NaN, -1, 0, 2.5, Infinity]) expect(normalizarPaginaLaudo(pagina)).toBe(1);
    expect(normalizarPaginaLaudo(3)).toBe(3);
    expect(formatarDataHoraBrasilia(new Date("2026-10-21T03:00:00Z"))).toBe("21/10/2026, 00:00");
  });
});
