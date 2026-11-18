/**
 * Último acesso do usuário: gravado só no login bem-sucedido e visível só à administração. Roda contra o
 * Postgres de verdade; a leitura por outros perfis passa pela role RLS-restrita.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { hashSenha } from "@/lib/senha";
import { prisma } from "@/lib/prisma";
import { autenticarComCredenciais } from "@/server/auth/credentials";
import { listarUsuarios } from "@/lib/usuarios";
import { comoUsuario, fecharConexoes, limparFixtures, ownerDb } from "./setup/helpers";

const SENHA = "SenhaForte123";
let admin: { id: string };
let interno: { id: string; email: string };
let outro: { id: string; email: string };

const ultimoAcessoDe = async (id: string) => (await ownerDb.usuario.findUniqueOrThrow({ where: { id }, select: { ultimoAcessoEm: true } })).ultimoAcessoEm;

beforeAll(async () => {
  await limparFixtures();
  const senhaHash = await hashSenha(SENHA);
  admin = await ownerDb.usuario.create({ data: { nome: "Talita acesso", email: "talita.acesso@teste.local", perfil: "ADMIN", senhaHash } });
  interno = await ownerDb.usuario.create({ data: { nome: "Interno acesso", email: "interno.acesso@teste.local", perfil: "ADMIN_INTERNO", senhaHash } });
  outro = await ownerDb.usuario.create({ data: { nome: "Convite acesso", email: "convite.acesso@teste.local", perfil: "ADMIN_EXTERNO" } });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await ownerDb.limiteAutenticacao.deleteMany();
  await ownerDb.usuario.updateMany({ data: { ultimoAcessoEm: null } });
});

afterAll(async () => {
  await ownerDb.limiteAutenticacao.deleteMany();
  await limparFixtures();
  await fecharConexoes();
});

describe("registro do último acesso no login", () => {
  it("grava o instante do login bem-sucedido, sem mexer no resto da conta", async () => {
    const antes = await ownerDb.usuario.findUniqueOrThrow({ where: { id: interno.id } });
    expect(antes.ultimoAcessoEm).toBeNull();

    const inicio = Date.now();
    const autenticado = await autenticarComCredenciais({ email: interno.email, senha: SENHA });
    expect(autenticado?.id).toBe(interno.id);

    const depois = await ownerDb.usuario.findUniqueOrThrow({ where: { id: interno.id } });
    expect(depois.ultimoAcessoEm).not.toBeNull();
    expect(depois.ultimoAcessoEm!.getTime()).toBeGreaterThanOrEqual(inicio - 5000);
    expect(depois.ultimoAcessoEm!.getTime()).toBeLessThanOrEqual(Date.now() + 5000);
    expect(depois.versaoSessao).toBe(antes.versaoSessao);
    expect(depois.atualizadoEm.getTime()).toBe(antes.atualizadoEm.getTime());
  });

  it("senha errada não grava", async () => {
    expect(await autenticarComCredenciais({ email: interno.email, senha: "senha-errada" })).toBeNull();
    expect(await ultimoAcessoDe(interno.id)).toBeNull();
  });

  it("conta desativada não grava", async () => {
    await ownerDb.usuario.update({ where: { id: interno.id }, data: { ativo: false } });
    try {
      expect(await autenticarComCredenciais({ email: interno.email, senha: SENHA })).toBeNull();
      expect(await ultimoAcessoDe(interno.id)).toBeNull();
    } finally {
      await ownerDb.usuario.update({ where: { id: interno.id }, data: { ativo: true } });
    }
  });

  it("conta sem senha definida não grava", async () => {
    expect(await autenticarComCredenciais({ email: outro.email, senha: SENHA })).toBeNull();
    expect(await ultimoAcessoDe(outro.id)).toBeNull();
  });

  it("falha ao gravar não derruba o login", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    // Só a gravação do último acesso falha; o controle de tentativas de login usa o mesmo método e segue normal.
    const original = prisma.$executeRaw.bind(prisma) as (...args: unknown[]) => unknown;
    vi.spyOn(prisma, "$executeRaw").mockImplementation(((strings: TemplateStringsArray, ...valores: unknown[]) =>
      strings.join("").includes("ultimoAcessoEm") ? Promise.reject(new Error("banco indisponível")) : original(strings, ...valores)) as never);
    const autenticado = await autenticarComCredenciais({ email: interno.email, senha: SENHA });
    expect(autenticado?.id).toBe(interno.id);
    expect(erro).toHaveBeenCalled();
    expect(await ultimoAcessoDe(interno.id)).toBeNull();
  });
});

describe("quem vê o último acesso", () => {
  it("a administração recebe a data e se a pessoa já tem senha", async () => {
    await autenticarComCredenciais({ email: interno.email, senha: SENHA });
    const lista = await listarUsuarios({ usuarioId: admin.id, perfil: "ADMIN" });
    const por = Object.fromEntries(lista.map((u) => [u.nome, u]));
    expect(por["Interno acesso"].ultimoAcessoEm).toBeInstanceOf(Date);
    expect(por["Interno acesso"].temSenha).toBe(true);
    expect(por["Convite acesso"].ultimoAcessoEm).toBeNull();
    expect(por["Convite acesso"].temSenha).toBe(false);
  });

  it("outros perfis não listam usuários e, pela role restrita, só leem a própria linha", async () => {
    await autenticarComCredenciais({ email: interno.email, senha: SENHA });
    expect(await listarUsuarios({ usuarioId: interno.id, perfil: "ADMIN_INTERNO" }, { incluirClientes: true })).toEqual([]);

    const visiveis = await comoUsuario({ usuarioId: outro.id, perfil: "ADMIN_EXTERNO" }, (tx) =>
      tx.usuario.findMany({ select: { id: true, ultimoAcessoEm: true } }),
    );
    expect(visiveis.map((u) => u.id)).toEqual([outro.id]);
  });
});
