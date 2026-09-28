import { afterAll, describe, expect, it } from "vitest";
import { ownerDb, fecharConexoes } from "./setup/helpers";

describe("identificador sequencial do cliente", () => {
  it("gera números crescentes automaticamente, inclusive em cadastros simultâneos", async () => {
    const timestamp = Date.now();
    const clientes = await Promise.all(
      [1, 2, 3].map((item) =>
        ownerDb.cliente.create({
          data: {
            razaoSocial: `Cliente ID teste ${timestamp}-${item}`,
            segmento: "Teste",
            origemContato: "Teste automatizado",
          },
          select: { id: true, numeroIdentificacao: true },
        }),
      ),
    );

    try {
      const numeros = clientes.map((cliente) => cliente.numeroIdentificacao).sort((a, b) => a - b);
      expect(new Set(numeros).size).toBe(3);
      expect(numeros[1]).toBe(numeros[0] + 1);
      expect(numeros[2]).toBe(numeros[1] + 1);
    } finally {
      await ownerDb.cliente.deleteMany({ where: { id: { in: clientes.map((cliente) => cliente.id) } } });
    }
  });
});

afterAll(fecharConexoes);
