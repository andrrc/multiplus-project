import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Tarefa 0.1 — a verificação por trás do endpoint que o gate de deploy e o UptimeRobot
 * consultam. O route handler em si é casca sobre esta função: ele chama `connection()`, que
 * não roda fora do escopo de uma requisição.
 *
 * O caso que importa é o 503: um healthcheck que responde 200 com o banco fora do ar não
 * serve para bloquear deploy nenhum, e essa é a falha que passa despercebida — o 200 do
 * caminho feliz sempre funciona.
 */
describe("Tarefa 0.1 — saúde para GET /api/health", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/prisma");
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("responde 200 quando alcança o Postgres", async () => {
    const { respostaDeSaude } = await import("@/lib/saude");

    const resposta = await respostaDeSaude();

    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ status: "ok" });
    expect(resposta.headers.get("Cache-Control")).toBe("no-store");
  });

  it("responde 503 quando o Postgres não responde, sem detalhar a falha", async () => {
    const erroNoLog = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.resetModules();
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        $queryRaw: () => Promise.reject(new Error("connection refused")),
      },
    }));

    const { respostaDeSaude } = await import("@/lib/saude");

    const resposta = await respostaDeSaude();

    expect(resposta.status).toBe(503);
    // A resposta é pública (o proxy não cobre /api): diz que caiu, não o que caiu.
    expect(await resposta.json()).toEqual({ status: "indisponivel" });
    expect(erroNoLog).toHaveBeenCalled();
  });
});
