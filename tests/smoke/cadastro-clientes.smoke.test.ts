/**
 * RF-001/RF-002 (cadastro via CNPJ + dados complementares), RF-026/RF-027 (Responsável
 * Legal / Ponto de Contato), RF-028/RF-033 (Pessoa Envolvida, com/sem acesso, ADR-007),
 * RF-031 (criar acesso do cliente, reaproveitando o onboarding RF-030) e RF-014 (login).
 * Módulo SRS: Cadastro de Clientes.
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
import { adicionarPessoaEnvolvida, criarAcessoPessoaEnvolvida } from "@/lib/pessoas-envolvidas";
import { enviarEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

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
      tipo: "PESSOA_JURIDICA",
      razaoSocial: "Ambiental Smoke Ltda",
      cnpj: "11.222.333/0001-81",
      segmento: "Indústria",
      origemContato: "Google",
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
      pessoasEnvolvidas: [
        {
          tipo: "PESSOA",
          nome: "Operacional Smoke",
          telefone: "11977776666",
          email: "operacional.smoke@teste.local",
          temAcesso: false,
        },
      ],
    });

    expect(cliente.pontoContato?.email).toBe("contato.smoke@teste.local");
    expect(cliente.pessoasEnvolvidas).toHaveLength(1);

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

describe("cadastro de cliente Pessoa Física (RF-034/RF-035) → criar acesso → login", () => {
  it("cadastra cliente PF sem Responsável Legal/Ponto de Contato, cria o acesso direto pra própria pessoa e ela loga", async () => {
    const admin = await ownerDb.usuario.create({
      data: { nome: "Talita", email: "talita.smoke-cadastro-pf@teste.local", perfil: "ADMIN" },
    });
    const ctxAdmin = { usuarioId: admin.id, perfil: "ADMIN" as const };

    const cliente = await criarCliente(ctxAdmin, {
      tipo: "PESSOA_FISICA",
      nome: "Maria Proprietária Smoke",
      cpf: "111.444.777-35",
      rg: "9876543",
      endereco: "Sítio Smoke, s/n",
      cep: "18000-000",
      municipio: "Votorantim",
      email: "maria.smoke-pf@teste.local",
      segmento: "Proprietário rural",
      origemContato: "Indicação",
      pessoasEnvolvidas: [],
    });

    expect(cliente.tipo).toBe("PESSOA_FISICA");
    expect(cliente.responsavelLegal).toBeNull();
    expect(cliente.pontoContato).toBeNull();

    // RF-031: para PF, o acesso vai direto pra própria pessoa, sem Ponto de Contato.
    const resultadoAcesso = await criarAcessoCliente(cliente.id);
    expect(resultadoAcesso).toEqual({ sucesso: true });

    const emailEnviado = vi.mocked(enviarEmail).mock.calls[0]?.[0];
    expect(emailEnviado?.to).toBe("maria.smoke-pf@teste.local");

    const token = extrairTokenDoEmail(emailEnviado!.html);
    const validacao = await validarTokenAcesso(token);
    expect(validacao.valido).toBe(true);
    if (!validacao.valido) throw new Error("token deveria ser válido");

    await ownerDb.usuario.update({
      where: { id: validacao.usuarioId },
      data: { senhaHash: await hashSenha("SenhaClienteSmokePf123") },
    });
    await consumirTokenAcesso(validacao.tokenId);

    const autenticado = await autenticarComCredenciais({
      email: "maria.smoke-pf@teste.local",
      senha: "SenhaClienteSmokePf123",
    });
    expect(autenticado?.perfil).toBe("CLIENTE");
    expect(autenticado?.clienteId).toBe(cliente.id);
  });
});

describe("Pessoa Envolvida — colaborador com acesso, e promoção posterior (RF-028/RF-033, ADR-007)", () => {
  it("pessoa envolvida cadastrada com tem_acesso=sim recebe Usuario Colaborador Externo e loga", async () => {
    const admin = await ownerDb.usuario.create({
      data: { nome: "Talita", email: "talita.smoke-pessoa-envolvida@teste.local", perfil: "ADMIN" },
    });
    const ctxAdmin = { usuarioId: admin.id, perfil: "ADMIN" as const };

    const cliente = await criarCliente(ctxAdmin, {
      tipo: "PESSOA_JURIDICA",
      razaoSocial: "Ambiental Pessoa Envolvida Ltda",
      cnpj: "22.333.444/0001-72",
      segmento: "Indústria",
      origemContato: "Google",
      responsavelLegal: { nome: "", endereco: "", rg: "", cpf: "", telefone: "", email: "" },
      pontoContato: { nome: "", endereco: "", rg: "", cpf: "", telefone: "", email: "", cargo: "" },
      pessoasEnvolvidas: [
        {
          tipo: "PESSOA",
          nome: "José Colaborador",
          telefone: "11966665555",
          email: "jose.colaborador@teste.local",
          temAcesso: false, // criado sem acesso — promovido depois via RF-033
        },
      ],
    });

    const pessoa = cliente.pessoasEnvolvidas[0];
    expect(pessoa.temAcesso).toBe(false);

    const resultado = await criarAcessoPessoaEnvolvida(pessoa.id);
    expect(resultado).toEqual({ sucesso: true });

    const pessoaAtualizada = await prisma.pessoaEnvolvida.findUniqueOrThrow({ where: { id: pessoa.id } });
    expect(pessoaAtualizada.temAcesso).toBe(true);

    const emailEnviado = vi.mocked(enviarEmail).mock.calls[0]?.[0];
    expect(emailEnviado?.to).toBe("jose.colaborador@teste.local");

    const token = extrairTokenDoEmail(emailEnviado!.html);
    const validacao = await validarTokenAcesso(token);
    expect(validacao.valido).toBe(true);
    if (!validacao.valido) throw new Error("token deveria ser válido");

    await ownerDb.usuario.update({
      where: { id: validacao.usuarioId },
      data: { senhaHash: await hashSenha("SenhaColaboradorSmoke123") },
    });
    await consumirTokenAcesso(validacao.tokenId);

    const autenticado = await autenticarComCredenciais({
      email: "jose.colaborador@teste.local",
      senha: "SenhaColaboradorSmoke123",
    });
    expect(autenticado?.perfil).toBe("ADMIN_EXTERNO");

    const usuarioColaborador = await prisma.usuario.findUniqueOrThrow({
      where: { email: "jose.colaborador@teste.local" },
    });
    expect(usuarioColaborador.pessoaEnvolvidaId).toBe(pessoa.id);
  });

  it("checkbox 'é um colaborador?' marcado já no cadastro inicial cria o Usuario automaticamente (sem precisar do passo separado de RF-033)", async () => {
    const admin = await ownerDb.usuario.create({
      data: { nome: "Talita", email: "talita.smoke-pessoa-envolvida-inline@teste.local", perfil: "ADMIN" },
    });
    const ctxAdmin = { usuarioId: admin.id, perfil: "ADMIN" as const };

    const cliente = await criarCliente(ctxAdmin, {
      tipo: "PESSOA_JURIDICA",
      razaoSocial: "Ambiental Colaborador Inline Ltda",
      cnpj: "33.444.555/0001-63",
      segmento: "Indústria",
      origemContato: "Google",
      responsavelLegal: { nome: "", endereco: "", rg: "", cpf: "", telefone: "", email: "" },
      pontoContato: { nome: "", endereco: "", rg: "", cpf: "", telefone: "", email: "", cargo: "" },
      pessoasEnvolvidas: [
        {
          tipo: "PESSOA",
          nome: "Ana Colaboradora Inline",
          telefone: "11955554444",
          email: "ana.inline@teste.local",
          temAcesso: true, // marcado já no cadastro — não é o fluxo de "criar depois" (RF-033)
        },
      ],
    });

    const pessoaCriada = cliente.pessoasEnvolvidas[0];

    // RF-028: o Usuario e o e-mail de definição de senha devem existir sem nenhum passo
    // manual adicional — antes dessa correção, o checkbox marcado no cadastro inicial não
    // disparava a criação do acesso (só funcionava via "criar acesso depois").
    const pessoaAtualizada = await prisma.pessoaEnvolvida.findUniqueOrThrow({ where: { id: pessoaCriada.id } });
    expect(pessoaAtualizada.temAcesso).toBe(true);

    const usuarioColaborador = await prisma.usuario.findUnique({ where: { email: "ana.inline@teste.local" } });
    expect(usuarioColaborador?.perfil).toBe("ADMIN_EXTERNO");
    expect(usuarioColaborador?.pessoaEnvolvidaId).toBe(pessoaCriada.id);

    const emailEnviado = vi.mocked(enviarEmail).mock.calls.find((c) => c[0].to === "ana.inline@teste.local")?.[0];
    expect(emailEnviado).toBeDefined();

    const token = extrairTokenDoEmail(emailEnviado!.html);
    const validacao = await validarTokenAcesso(token);
    expect(validacao.valido).toBe(true);
  });

  it("'+ Adicionar pessoa envolvida' na tela de detalhe, com checkbox marcado, também cria o Usuario (mesmo padrão do action)", async () => {
    const admin = await ownerDb.usuario.create({
      data: { nome: "Talita", email: "talita.smoke-add-pessoa@teste.local", perfil: "ADMIN" },
    });
    const ctxAdmin = { usuarioId: admin.id, perfil: "ADMIN" as const };

    const cliente = await criarCliente(ctxAdmin, {
      tipo: "PESSOA_JURIDICA",
      razaoSocial: "Ambiental Add Pessoa Ltda",
      cnpj: "44.555.666/0001-54",
      segmento: "Indústria",
      origemContato: "Google",
      responsavelLegal: { nome: "", endereco: "", rg: "", cpf: "", telefone: "", email: "" },
      pontoContato: { nome: "", endereco: "", rg: "", cpf: "", telefone: "", email: "", cargo: "" },
      pessoasEnvolvidas: [],
    });

    // Mesma sequência que `adicionarPessoaEnvolvidaAction` executa: criar o registro e,
    // se o checkbox veio marcado, disparar a criação do acesso em seguida.
    const pessoa = await adicionarPessoaEnvolvida(ctxAdmin, cliente.id, {
      tipo: "PESSOA",
      nome: "Carlos Adicionado Depois",
      telefone: "11944443333",
      email: "carlos.add@teste.local",
      temAcesso: true,
    });
    const resultado = await criarAcessoPessoaEnvolvida(pessoa.id);
    expect(resultado).toEqual({ sucesso: true });

    const usuarioColaborador = await prisma.usuario.findUnique({ where: { email: "carlos.add@teste.local" } });
    expect(usuarioColaborador?.perfil).toBe("ADMIN_EXTERNO");
  });
});
