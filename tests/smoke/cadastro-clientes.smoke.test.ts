/**
 * RF-001/RF-002 (cadastro via CNPJ + dados complementares), RF-026/RF-027 (Responsável
 * Legal / Ponto de Contato), RF-028 (pessoa do operacional), RF-031 (criar acesso do
 * cliente, reaproveitando o onboarding RF-030) e RF-014 (login). Módulo SRS: Cadastro
 * de Clientes.
 *
 * Smoke test do caminho feliz ponta a ponta, chamando o código real de produção
 * (src/lib/clientes.ts, src/lib/tokens.ts, src/lib/senha.ts,
 * src/server/auth/credentials.ts) contra o banco de teste — não é teste de UI (ver
 * docs/padrao-testes-por-sprint-multiplus.md, Seção 6).
 *
 * Depende de tests/setup-env.ts (setupFiles do Vitest) apontar
 * DATABASE_URL/APP_DATABASE_URL pro banco de teste antes desses módulos serem
 * importados. `enviarEmail` é mockado só para capturar o link do e-mail (sem
 * RESEND_API_KEY configurada, ele já só loga no console — não bate em rede real).
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/email", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/email")>();
  return { ...mod, enviarEmail: vi.fn(async () => {}) };
});

import { ownerDb, limparFixtures, fecharConexoes } from "../integration/setup/helpers";
import { validarTokenAcesso, consumirTokenAcesso } from "@/lib/tokens";
import { hashSenha } from "@/lib/senha";
import { autenticarComCredenciais } from "@/server/auth/credentials";
import { criarCliente, criarAcessoCliente, buscarClienteDetalheSeguro } from "@/lib/clientes";
import { enviarEmail } from "@/lib/email";

function extrairTokenDoEmail(html: string): string {
  const match = html.match(/token=([a-f0-9]+)/);
  if (!match) throw new Error("link de definição de senha não encontrado no corpo do e-mail");
  return match[1];
}

beforeAll(async () => {
  await limparFixtures();
});

afterEach(async () => {
  await limparFixtures();
  vi.clearAllMocks();
});

afterAll(async () => {
  await fecharConexoes();
});

describe("cadastro de cliente → criar acesso → login do cliente", () => {
  it("cadastra cliente com Responsável Legal, Ponto de Contato e pessoa do operacional, cria o acesso e o cliente loga com a senha definida pelo link", async () => {
    const admin = await ownerDb.usuario.create({
      data: { nome: "Talita", email: "talita.smoke-cadastro@teste.local", perfil: "ADMIN" },
    });
    const ctxAdmin = { usuarioId: admin.id, perfil: "ADMIN" as const };

    const cliente = await criarCliente(ctxAdmin, {
      razaoSocial: "Ambiental Smoke Ltda",
      cnpj: "11.222.333/0001-81",
      segmento: "Industrial",
      origemContato: "Site",
      responsavelLegal: {
        nome: "Responsável Smoke",
        endereco: "Rua Smoke, 1",
        rg: "1234567",
        cpf: "111.444.777-35",
        telefone: "11988887777",
        email: "responsavel.smoke@teste.local",
      },
      pontoContato: {
        nome: "Contato Smoke",
        endereco: "Rua Smoke, 1",
        rg: "1234567",
        cpf: "111.444.777-35",
        telefone: "11988886666",
        email: "contato.smoke@teste.local",
        cargo: "Gerente de Meio Ambiente",
      },
      pessoasOperacional: [{ nome: "Operacional Smoke", cargo: "Técnico" }],
    });

    expect(cliente.pontoContato?.email).toBe("contato.smoke@teste.local");
    expect(cliente.pessoasOperacional).toHaveLength(1);

    // RF-031: cria o acesso do cliente a partir do Ponto de Contato.
    const resultadoAcesso = await criarAcessoCliente(cliente.id);
    expect(resultadoAcesso).toEqual({ sucesso: true });

    const emailEnviado = vi.mocked(enviarEmail).mock.calls[0]?.[0];
    expect(emailEnviado?.to).toBe("contato.smoke@teste.local");

    // RF-030 (fluxo de onboarding reaproveitado): define a senha pelo link recebido.
    const token = extrairTokenDoEmail(emailEnviado!.html);
    const validacao = await validarTokenAcesso(token);
    expect(validacao.valido).toBe(true);
    if (!validacao.valido) throw new Error("token deveria ser válido");

    await ownerDb.usuario.update({
      where: { id: validacao.usuarioId },
      data: { senhaHash: await hashSenha("SenhaClienteSmoke123") },
    });
    await consumirTokenAcesso(validacao.tokenId);

    // RF-014: login do cliente com a senha recém-definida.
    const autenticado = await autenticarComCredenciais({
      email: "contato.smoke@teste.local",
      senha: "SenhaClienteSmoke123",
    });
    expect(autenticado?.perfil).toBe("CLIENTE");
    expect(autenticado?.clienteId).toBe(cliente.id);

    // RF-020: como ADMIN, a leitura segura devolve o telefone normalmente.
    const detalhe = await buscarClienteDetalheSeguro(ctxAdmin, cliente.id);
    expect(detalhe?.responsavelLegal?.telefone).toBe("11988887777");
  });
});
