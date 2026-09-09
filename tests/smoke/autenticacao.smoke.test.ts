/**
 * RF-014 (login por credenciais) + RF-030/RF-031 (link de definição de senha
 * no primeiro acesso) + RF-032 (recuperação de senha). Módulo SRS:
 * Autenticação.
 *
 * Smoke test do caminho feliz ponta a ponta, chamando o código real de
 * produção (src/lib/tokens.ts, src/lib/senha.ts,
 * src/server/auth/credentials.ts) contra o banco de teste — não é teste de
 * UI (ver docs/padrao-testes-por-sprint-multiplus.md, Seção 6: sem E2E de
 * UI, smoke test do fluxo crítico basta). O fluxo via navegador já foi
 * validado manualmente na Sprint 1; isso automatiza a mesma checagem.
 *
 * Depende de tests/setup-env.ts (setupFiles do Vitest) apontar
 * DATABASE_URL pro banco de teste antes desses módulos serem importados.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ownerDb, limparFixtures, fecharConexoes } from "../integration/setup/helpers";
import { criarTokenAcesso, validarTokenAcesso, consumirTokenAcesso } from "@/lib/tokens";
import { hashSenha } from "@/lib/senha";
import { autenticarComCredenciais } from "@/server/auth/credentials";

async function definirSenha(usuarioId: string, tokenId: string, senha: string) {
  await ownerDb.usuario.update({ where: { id: usuarioId }, data: { senhaHash: await hashSenha(senha) } });
  await consumirTokenAcesso(tokenId);
}

beforeAll(async () => {
  await limparFixtures();
});

afterEach(async () => {
  await limparFixtures();
});

afterAll(async () => {
  await fecharConexoes();
});

describe("onboarding (RF-030/031) → login (RF-014)", () => {
  it("usuário sem senha não loga; após definir a senha pelo link, loga normalmente", async () => {
    const usuario = await ownerDb.usuario.create({
      data: { nome: "Estagiário Smoke", email: "onboarding.smoke@teste.local", perfil: "ADMIN_INTERNO" },
    });

    // Antes de definir a senha: nem existe senha, login não pode funcionar.
    const tentativaAntes = await autenticarComCredenciais({ email: usuario.email, senha: "qualquer" });
    expect(tentativaAntes).toBeNull();

    // RF-030: Talita cadastra o usuário, sistema gera o link de definição de senha.
    const token = await criarTokenAcesso(usuario.id, "DEFINIR_SENHA");

    const validacao = await validarTokenAcesso(token);
    expect(validacao.valido).toBe(true);
    if (!validacao.valido) throw new Error("token deveria ser válido");
    expect(validacao.usuarioId).toBe(usuario.id);
    expect(validacao.tipo).toBe("DEFINIR_SENHA");

    await definirSenha(usuario.id, validacao.tokenId, "SenhaForte123");

    // RF-014: agora loga normalmente com a senha definida.
    const autenticado = await autenticarComCredenciais({ email: usuario.email, senha: "SenhaForte123" });
    expect(autenticado?.id).toBe(usuario.id);
    expect(autenticado?.perfil).toBe("ADMIN_INTERNO");

    // Senha errada continua barrada.
    const senhaErrada = await autenticarComCredenciais({ email: usuario.email, senha: "outra-senha" });
    expect(senhaErrada).toBeNull();

    // Token de onboarding é de uso único.
    const reuso = await validarTokenAcesso(token);
    expect(reuso.valido).toBe(false);
    if (reuso.valido) throw new Error("token não deveria mais ser válido");
    expect(reuso.motivo).toBe("ja_usado");
  });
});

describe("recuperação de senha (RF-032)", () => {
  it("define uma senha nova pelo link de recuperação e a senha antiga deixa de funcionar", async () => {
    const usuario = await ownerDb.usuario.create({
      data: {
        nome: "Cliente Smoke",
        email: "recuperacao.smoke@teste.local",
        perfil: "CLIENTE",
        senhaHash: await hashSenha("SenhaAntiga123"),
      },
    });

    const loginComSenhaAntiga = await autenticarComCredenciais({ email: usuario.email, senha: "SenhaAntiga123" });
    expect(loginComSenhaAntiga?.id).toBe(usuario.id);

    const token = await criarTokenAcesso(usuario.id, "RECUPERAR_SENHA");
    const validacao = await validarTokenAcesso(token);
    expect(validacao.valido).toBe(true);
    if (!validacao.valido) throw new Error("token deveria ser válido");
    expect(validacao.tipo).toBe("RECUPERAR_SENHA");

    await definirSenha(usuario.id, validacao.tokenId, "SenhaNova456");

    const loginComSenhaAntigaDepois = await autenticarComCredenciais({
      email: usuario.email,
      senha: "SenhaAntiga123",
    });
    expect(loginComSenhaAntigaDepois).toBeNull();

    const loginComSenhaNova = await autenticarComCredenciais({ email: usuario.email, senha: "SenhaNova456" });
    expect(loginComSenhaNova?.id).toBe(usuario.id);
  });
});
