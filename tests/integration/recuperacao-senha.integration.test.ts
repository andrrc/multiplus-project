/**
 * RF-030 / RF-032 — token de definição de senha e recuperação de acesso.
 *
 * O token vive no banco (tokens_acesso), então mesmo a parte "unitária" pedida no plano
 * (válido / expirado / já usado) precisa de Postgres — está aqui, e não em tests/unit.
 *
 * `next/headers` é mockado porque a Server Action lê o IP da requisição para o limite por
 * IP; fora de um request real, `headers()` não existe.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/email", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/email")>();
  return { ...mod, enviarEmail: vi.fn(async () => {}) };
});

const ipFalso = { valor: "203.0.113.10" };

vi.mock("next/headers", () => ({
  headers: async () => new Map([["x-forwarded-for", ipFalso.valor]]),
}));

import { ownerDb, limparFixtures, fecharConexoes } from "./setup/helpers";
import { criarTokenAcesso, validarTokenAcesso, consumirTokenAcesso } from "@/lib/tokens";
import { esqueciSenhaAction } from "@/app/esqueci-senha/actions";
import { enviarEmail } from "@/lib/email";
import { limparRateLimit } from "@/lib/rate-limit";

const emailMock = vi.mocked(enviarEmail);

beforeEach(async () => {
  await limparFixtures();
  limparRateLimit();
  ipFalso.valor = "203.0.113.10";
});

afterEach(async () => {
  await limparFixtures();
  vi.clearAllMocks();
});

afterAll(async () => {
  await fecharConexoes();
});

async function criarUsuarioAtivo(email: string) {
  return ownerDb.usuario.create({
    data: { nome: "Pessoa", email, perfil: "ADMIN_INTERNO", senhaHash: "hash-qualquer" },
  });
}

describe("RF-030 — token de definição de senha", () => {
  it("token recém-emitido é válido e aponta para o usuário certo", async () => {
    const usuario = await criarUsuarioAtivo("token.valido@teste.local");
    const token = await criarTokenAcesso(usuario.id, "DEFINIR_SENHA");

    const validacao = await validarTokenAcesso(token);
    expect(validacao.valido).toBe(true);
    if (validacao.valido) expect(validacao.usuarioId).toBe(usuario.id);
  });

  it("token expirado é recusado", async () => {
    const usuario = await criarUsuarioAtivo("token.expirado@teste.local");
    const token = await criarTokenAcesso(usuario.id, "DEFINIR_SENHA");

    await ownerDb.tokenAcesso.updateMany({
      where: { usuarioId: usuario.id },
      data: { expiraEm: new Date(Date.now() - 1000) },
    });

    expect(await validarTokenAcesso(token)).toEqual({ valido: false, motivo: "expirado" });
  });

  it("token já usado não vale uma segunda vez", async () => {
    const usuario = await criarUsuarioAtivo("token.usado@teste.local");
    const token = await criarTokenAcesso(usuario.id, "DEFINIR_SENHA");

    const primeira = await validarTokenAcesso(token);
    expect(primeira.valido).toBe(true);
    if (primeira.valido) await consumirTokenAcesso(primeira.tokenId);

    expect(await validarTokenAcesso(token)).toEqual({ valido: false, motivo: "ja_usado" });
  });

  it("token inventado é recusado", async () => {
    expect(await validarTokenAcesso("naoexiste")).toEqual({
      valido: false,
      motivo: "nao_encontrado",
    });
  });

  it("o banco guarda só o hash — o token em texto puro nunca é persistido", async () => {
    const usuario = await criarUsuarioAtivo("token.hash@teste.local");
    const token = await criarTokenAcesso(usuario.id, "DEFINIR_SENHA");

    const registro = await ownerDb.tokenAcesso.findFirstOrThrow({
      where: { usuarioId: usuario.id },
    });
    expect(registro.tokenHash).not.toBe(token);
  });
});

describe("RF-032 — recuperação de senha devolve sempre a mesma resposta", () => {
  it("e-mail existente e inexistente produzem resposta idêntica", async () => {
    await criarUsuarioAtivo("existe.recuperacao@teste.local");

    const comCadastro = await esqueciSenhaAction({}, formDataCom("existe.recuperacao@teste.local"));
    limparRateLimit();
    const semCadastro = await esqueciSenhaAction({}, formDataCom("naoexiste.recuperacao@teste.local"));

    expect(comCadastro).toEqual(semCadastro);
    expect(comCadastro.erro).toBeUndefined();
  });

  it("mas o e-mail só é enviado de verdade quando a conta existe", async () => {
    await criarUsuarioAtivo("existe2.recuperacao@teste.local");

    await esqueciSenhaAction({}, formDataCom("existe2.recuperacao@teste.local"));
    expect(emailMock).toHaveBeenCalledTimes(1);

    emailMock.mockClear();
    limparRateLimit();

    await esqueciSenhaAction({}, formDataCom("naoexiste2.recuperacao@teste.local"));
    expect(emailMock).not.toHaveBeenCalled();
  });

  it("usuário desativado não recebe link, e a resposta continua a mesma", async () => {
    const usuario = await criarUsuarioAtivo("desativado.recuperacao@teste.local");
    await ownerDb.usuario.update({ where: { id: usuario.id }, data: { ativo: false } });

    const resposta = await esqueciSenhaAction({}, formDataCom("desativado.recuperacao@teste.local"));

    expect(resposta.erro).toBeUndefined();
    expect(resposta.mensagem).toBeTruthy();
    expect(emailMock).not.toHaveBeenCalled();
  });
});

describe("RF-032 (B2) — limite de tentativas no endpoint", () => {
  it("para de enviar e-mail depois do limite por e-mail, sem mudar a resposta", async () => {
    await criarUsuarioAtivo("flood.recuperacao@teste.local");

    const respostas = [];
    for (let i = 0; i < 5; i++) {
      respostas.push(await esqueciSenhaAction({}, formDataCom("flood.recuperacao@teste.local")));
    }

    // O limite por e-mail é 3; as duas últimas não devem disparar envio.
    expect(emailMock).toHaveBeenCalledTimes(3);

    // E a resposta segue idêntica: dizer "muitas tentativas" entregaria, pela porta dos
    // fundos, que aquele e-mail existe.
    expect(new Set(respostas.map((r) => JSON.stringify(r))).size).toBe(1);
  });

  it("o limite por IP alcança e-mails diferentes vindos do mesmo lugar", async () => {
    for (let i = 0; i < 12; i++) {
      await criarUsuarioAtivo(`varredura${i}.recuperacao@teste.local`);
    }

    for (let i = 0; i < 12; i++) {
      await esqueciSenhaAction({}, formDataCom(`varredura${i}.recuperacao@teste.local`));
    }

    // Limite por IP é 10, e cada e-mail é diferente (então o limite por e-mail não atua).
    expect(emailMock).toHaveBeenCalledTimes(10);
  });

  it("outro IP recomeça com o próprio saldo", async () => {
    await criarUsuarioAtivo("ip1.recuperacao@teste.local");
    await criarUsuarioAtivo("ip2.recuperacao@teste.local");

    ipFalso.valor = "203.0.113.11";
    for (let i = 0; i < 11; i++) {
      await esqueciSenhaAction({}, formDataCom("ip1.recuperacao@teste.local"));
    }
    const enviadosPrimeiroIp = emailMock.mock.calls.length;

    ipFalso.valor = "203.0.113.12";
    await esqueciSenhaAction({}, formDataCom("ip2.recuperacao@teste.local"));

    expect(emailMock.mock.calls.length).toBe(enviadosPrimeiroIp + 1);
  });
});

function formDataCom(email: string): FormData {
  const formData = new FormData();
  formData.set("email", email);
  return formData;
}
