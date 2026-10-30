/** RF-043 — a conexão autenticada não pode usar a role privilegiada por fallback. */
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

it("recusa inicialização quando APP_DATABASE_URL não está configurada", async () => {
  vi.resetModules();
  vi.stubEnv("APP_DATABASE_URL", "");
  vi.stubEnv("DATABASE_URL", "postgresql://privilegiada@localhost/banco");
  await expect(import("@/lib/prisma-app")).rejects.toThrow(/APP_DATABASE_URL é obrigatória/);
});
