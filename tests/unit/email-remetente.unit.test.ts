/** RF-031, RF-032 e RF-022: o remetente é compartilhado por convites, recuperação e notificações. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const resendMock = vi.hoisted(() => ({ send: vi.fn(async () => ({ id: "email-1" })) }));
const emailFromOriginal = process.env.EMAIL_FROM;

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendMock.send };
  },
}));

describe("remetente dos e-mails", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("RESEND_API_KEY", "resend-test-key");
    if (emailFromOriginal === undefined) delete process.env.EMAIL_FROM;
    else vi.stubEnv("EMAIL_FROM", emailFromOriginal);
    resendMock.send.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    if (emailFromOriginal === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = emailFromOriginal;
  });

  it("usa o nome institucional novo e preserva o endereço padrão", async () => {
    const { enviarEmail } = await import("@/lib/email");

    await enviarEmail({ to: "destino@teste.local", subject: "Teste", html: "<p>Teste</p>" });

    expect(resendMock.send).toHaveBeenCalledWith(expect.objectContaining({
      from: "SGA Múltiplus Ambiental <nao-responda@multiplusambiental.com.br>",
    }));
  });

  it("mantém o endereço definido em EMAIL_FROM e substitui somente o nome documentado", async () => {
    vi.stubEnv("EMAIL_FROM", "SGA Múltiplus Ambiental <nao-responda@multiplus.com.br>");
    const { enviarEmail } = await import("@/lib/email");

    await enviarEmail({ to: "destino@teste.local", subject: "Teste", html: "<p>Teste</p>" });

    expect(resendMock.send).toHaveBeenCalledWith(expect.objectContaining({
      from: "SGA Múltiplus Ambiental <nao-responda@multiplus.com.br>",
    }));
  });
});
