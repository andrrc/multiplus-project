/** Proteção contra testes simultâneos no banco exclusivo do navegador. */
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ connect: vi.fn(), query: vi.fn(), end: vi.fn(), setup: vi.fn() }));
vi.mock("pg", () => ({ Client: class {
  connect = mocks.connect;
  query = mocks.query;
  end = mocks.end;
} }));
vi.mock("../integration/setup/global-setup", () => ({ default: mocks.setup }));
import prepararBanco from "../browser/setup";

afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });

describe("trava das jornadas de navegador", () => {
  it("recusa o banco da aplicação antes de abrir uma conexão", async () => {
    vi.stubEnv("TEST_DATABASE_URL", "postgresql://owner:senha@127.0.0.1:5434/multiplus_test_e2e");
    vi.stubEnv("TEST_APP_DATABASE_URL", "postgresql://multiplus_app:senha@127.0.0.1:5434/multiplus_test_e2e");
    vi.stubEnv("DATABASE_URL", "postgresql://owner:senha@localhost:5434/multiplus_test_e2e");
    await expect(prepararBanco()).rejects.toThrow(/banco de teste/i);
    expect(mocks.connect).not.toHaveBeenCalled();
    expect(mocks.setup).not.toHaveBeenCalled();
  });
  it("recusa uma segunda execução antes de preparar ou limpar o banco", async () => {
    vi.stubEnv("TEST_DATABASE_URL", "postgresql://owner:senha@127.0.0.1:5434/multiplus_test_e2e");
    vi.stubEnv("TEST_APP_DATABASE_URL", "postgresql://multiplus_app:senha@127.0.0.1:5434/multiplus_test_e2e");
    vi.stubEnv("DATABASE_URL", "postgresql://owner:senha@127.0.0.1:5434/multiplus");
    vi.stubEnv("APP_DATABASE_URL", "postgresql://multiplus_app:senha@127.0.0.1:5434/multiplus");
    mocks.query.mockResolvedValue({ rows: [{ obtida: false }] });
    await expect(prepararBanco()).rejects.toThrow(/Outra execução/);
    expect(mocks.setup).not.toHaveBeenCalled();
    expect(mocks.end).toHaveBeenCalledOnce();
  });
});
