/**
 * Filtro de situação do prazo das listas (protótipo 03-listas-projetos-tarefas): os botões
 * "Atrasados", "Vencem em até N dias", "No prazo" e "Sem prazo" usam o mesmo limite do semáforo.
 */
import { describe, expect, it } from "vitest";
import { contarSituacoes, interpretarSituacao, rotulosSituacao, situacaoDoPrazo } from "@/lib/situacao-prazo";

describe("situacaoDoPrazo", () => {
  it("separa vencido, próximo, no prazo e sem prazo pelo limite configurado", () => {
    expect(situacaoDoPrazo({ diasRestantes: -1, fechado: false }, 5)).toBe("atrasado");
    expect(situacaoDoPrazo({ diasRestantes: 0, fechado: false }, 5)).toBe("proximo");
    expect(situacaoDoPrazo({ diasRestantes: 5, fechado: false }, 5)).toBe("proximo");
    expect(situacaoDoPrazo({ diasRestantes: 6, fechado: false }, 5)).toBe("prazo");
    expect(situacaoDoPrazo({ diasRestantes: null, fechado: false }, 5)).toBe("sem");
  });

  it("respeita o limite zero: só o próprio dia é próximo", () => {
    expect(situacaoDoPrazo({ diasRestantes: 0, fechado: false }, 0)).toBe("proximo");
    expect(situacaoDoPrazo({ diasRestantes: 1, fechado: false }, 0)).toBe("prazo");
  });

  it("item fechado nunca é atrasado, mesmo com prazo vencido", () => {
    expect(situacaoDoPrazo({ diasRestantes: -30, fechado: true }, 5)).toBe("fechado");
    expect(situacaoDoPrazo({ diasRestantes: null, fechado: true }, 5)).toBe("fechado");
  });
});

describe("contarSituacoes", () => {
  it("soma todos os itens em 'todos' e deixa os fechados fora dos demais grupos", () => {
    const contagem = contarSituacoes(["atrasado", "atrasado", "proximo", "prazo", "sem", "fechado"]);
    expect(contagem).toEqual({ todos: 6, atrasado: 2, proximo: 1, prazo: 1, sem: 1 });
  });
});

describe("interpretarSituacao", () => {
  it("aceita só os valores conhecidos e trata o resto como 'todos'", () => {
    expect(interpretarSituacao("atrasado")).toBe("atrasado");
    expect(interpretarSituacao("sem")).toBe("sem");
    expect(interpretarSituacao("fechado")).toBe("todos");
    expect(interpretarSituacao("qualquer")).toBe("todos");
    expect(interpretarSituacao(undefined)).toBe("todos");
    // Parâmetro repetido na URL não escolhe um valor ao acaso.
    expect(interpretarSituacao(["atrasado", "prazo"])).toBe("todos");
  });
});

describe("rotulosSituacao", () => {
  it("escreve o limite no botão e usa o singular para um dia", () => {
    expect(rotulosSituacao(5)[2]).toEqual(["proximo", "Vencem em até 5 dias"]);
    expect(rotulosSituacao(1)[2]).toEqual(["proximo", "Vencem em até 1 dia"]);
    expect(rotulosSituacao(5).map(([valor]) => valor)).toEqual(["todos", "atrasado", "proximo", "prazo", "sem"]);
  });
});
