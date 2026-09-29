/**
 * Identidade visual (docs/Identidade_Visual_Multiplus.md, AGENTS.md § 6.1).
 *
 * Classe Tailwind com cor inexistente não dá erro de build: o estilo simplesmente não é
 * gerado e a cor some da tela. Foi assim que 33 usos de `vermelho`, `vermelho-cl` e
 * `azul-cl` ficaram invisíveis (itens atrasados sem destaque). Este teste cruza toda
 * classe de cor usada em `src/` com os tokens `--color-*` de `src/app/globals.css`.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = path.resolve(import.meta.dirname, "../..");
const GLOBALS_CSS = path.join(RAIZ, "src/app/globals.css");
const SRC = path.join(RAIZ, "src");

/** Utilitários do Tailwind que recebem uma cor como valor. */
const CLASSE_DE_COR =
  /(?<=^|[\s"'`{(:])(?:bg|text|border(?:-[xytrbl])?|ring|outline|fill|stroke|accent|caret|divide|decoration|from|via|to)-([a-z][a-z0-9-]*)(?:\/\d+)?(?=$|[\s"'`})])/g;

/** Valores desses mesmos utilitários que não são cor (tamanho, alinhamento, estilo…). */
const VALORES_QUE_NAO_SAO_COR = new Set([
  "xs", "sm", "base", "lg", "xl",
  "left", "center", "right", "justify", "start", "end", "top", "bottom",
  "wrap", "nowrap", "balance", "pretty", "ellipsis", "clip",
  "solid", "dashed", "dotted", "double", "hidden", "none", "wavy",
  "collapse", "separate",
  "transparent", "current", "inherit",
  "fixed", "local", "scroll", "cover", "contain", "auto", "repeat", "no-repeat",
  "inset",
]);

function naoECor(valor: string) {
  return (
    VALORES_QUE_NAO_SAO_COR.has(valor) ||
    // `border-b-0`, `divide-y`: a lado/eixo seguido de espessura, não uma cor.
    /^[xytrblse](-\d+)?$/.test(valor) ||
    /^(offset|gradient|opacity)(-|$)/.test(valor)
  );
}

function tokensDeCor(): Set<string> {
  const css = readFileSync(GLOBALS_CSS, "utf8");
  return new Set([...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]));
}

function arquivosFonte(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = path.join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivosFonte(caminho);
    return /\.(tsx?|jsx?)$/.test(nome) ? [caminho] : [];
  });
}

describe("classes de cor usam apenas tokens da identidade visual", () => {
  it("globals.css define os tokens de fundo claro criados em 29/09", () => {
    const tokens = tokensDeCor();
    expect(tokens).toContain("critico-cl");
    expect(tokens).toContain("azul-cl");
  });

  it("toda classe de cor em src/ aponta para um token existente", () => {
    const tokens = tokensDeCor();
    const invalidas: string[] = [];

    for (const arquivo of arquivosFonte(SRC)) {
      const conteudo = readFileSync(arquivo, "utf8");
      for (const m of conteudo.matchAll(CLASSE_DE_COR)) {
        const valor = m[1];
        if (tokens.has(valor) || naoECor(valor)) continue;
        invalidas.push(`${path.relative(RAIZ, arquivo)}: ${m[0]}`);
      }
    }

    expect([...new Set(invalidas)]).toEqual([]);
  });
});
