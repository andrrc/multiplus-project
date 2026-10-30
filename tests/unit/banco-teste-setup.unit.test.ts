/** Segurança da suíte: destinos inválidos são rejeitados antes de conectar ou migrar. */
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ cliente: vi.fn(), migrar: vi.fn() }));
vi.mock("@prisma/client", () => ({ PrismaClient: mocks.cliente }));
vi.mock("node:child_process", () => ({ execSync: mocks.migrar }));
import setup from "../integration/setup/global-setup";

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("preparação segura do banco de teste", () => {
  it("recusa destinos diferentes antes de criar um cliente ou executar migrations", async () => {
    vi.stubEnv("TEST_DATABASE_URL", "postgresql://owner:senha@127.0.0.1:5434/multiplus");
    vi.stubEnv("TEST_APP_DATABASE_URL", "postgresql://multiplus_app:senha@127.0.0.1:5434/multiplus_test");
    await expect(setup()).rejects.toThrow(/banco de teste/i);
    expect(mocks.cliente).not.toHaveBeenCalled();
    expect(mocks.migrar).not.toHaveBeenCalled();
  });
});
