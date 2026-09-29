import { describe, expect, it } from "vitest";
import { numeroCliente } from "@/lib/formatacao";

describe("numeroCliente", () => {
  it("exibe números menores que 10 com zero à esquerda", () => {
    expect(numeroCliente(1)).toBe("01");
    expect(numeroCliente(9)).toBe("09");
  });

  it("mantém a sequência sem truncar números com mais de dois dígitos", () => {
    expect(numeroCliente(10)).toBe("10");
    expect(numeroCliente(100)).toBe("100");
  });
});
