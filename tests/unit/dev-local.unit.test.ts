/** RF/RN: não se aplica — proteção do inicializador de desenvolvimento local. */
import { describe, expect, it } from "vitest";
import { createServer } from "node:net";
import { findAvailablePort, getLocalUrl, portIsAvailable } from "../../scripts/dev-local";

describe("inicializador local do Múltiplus", () => {
  it("pula portas ocupadas e escolhe a primeira livre", async () => {
    const tentativas: number[] = [];
    const port = await findAvailablePort(3000, 3003, async (candidate) => {
      tentativas.push(candidate);
      return candidate === 3002;
    });

    expect(tentativas).toEqual([3000, 3001, 3002]);
    expect(port).toBe(3002);
  });

  it("retorna null quando todas as portas da faixa estão ocupadas", async () => {
    await expect(findAvailablePort(3000, 3001, async () => false)).resolves.toBeNull();
  });

  it("detecta uma porta realmente ocupada no bind padrão do servidor", async () => {
    const occupiedServer = createServer();
    await new Promise<void>((resolve) => occupiedServer.listen(0, resolve));
    const address = occupiedServer.address();
    if (!address || typeof address === "string") throw new Error("Não foi possível obter a porta de teste.");

    try {
      await expect(portIsAvailable(address.port)).resolves.toBe(false);
    } finally {
      await new Promise<void>((resolve, reject) => occupiedServer.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("monta uma origem local com a porta efetivamente escolhida", () => {
    expect(getLocalUrl(3002)).toBe("http://localhost:3002");
  });
});
