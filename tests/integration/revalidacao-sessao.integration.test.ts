/** RF-039/RF-043, RN-007 — sessão existente respeita ativo e perfil atuais do banco. */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn((destino: string): never => {
    throw new Error(`REDIRECT:${destino}`);
  }),
}));

vi.mock("@/server/auth/index", () => ({ auth: authMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import { obterContexto, exigirAcessoARota } from "@/server/auth/contexto";
import { prismaApp } from "@/lib/prisma-app";
import { ownerDb, limparFixtures, fecharConexoes } from "./setup/helpers";

let usuarioId: string;

beforeEach(async () => {
  await limparFixtures();
  const usuario = await ownerDb.usuario.create({
    data: { nome: "Pessoa da sessão", email: "sessao.revalidada@teste.local", perfil: "ADMIN" },
  });
  usuarioId = usuario.id;
  authMock.mockResolvedValue({ user: { id: usuario.id, perfil: "ADMIN", clienteId: null } });
  redirectMock.mockClear();
});

afterEach(async () => {
  await limparFixtures();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

afterAll(async () => {
  await fecharConexoes();
});

describe("RF-039 — revalidação de usuário em sessão existente", () => {
  it("recusa a sessão no próximo request após desativação", async () => {
    await ownerDb.usuario.update({ where: { id: usuarioId }, data: { ativo: false } });

    await expect(obterContexto()).rejects.toThrow("REDIRECT:/login?motivo=sessao-invalidada");
    expect(redirectMock).toHaveBeenCalledWith("/login?motivo=sessao-invalidada");
  });

  it("recusa usuário removido e não usa os claims antigos como fallback", async () => {
    await ownerDb.usuario.delete({ where: { id: usuarioId } });

    await expect(obterContexto()).rejects.toThrow("REDIRECT:/login?motivo=sessao-invalidada");
  });

  it("usa o perfil atual e barra uma rota permitida pelo perfil antigo", async () => {
    await ownerDb.usuario.update({ where: { id: usuarioId }, data: { perfil: "ADMIN_INTERNO" } });

    await expect(exigirAcessoARota("/usuarios")).rejects.toThrow("REDIRECT:/minhas-tarefas");
    expect(redirectMock).toHaveBeenCalledWith("/minhas-tarefas");
  });

  it("aplica permissões recém-concedidas sem exigir uma nova sessão", async () => {
    authMock.mockResolvedValue({ user: { id: usuarioId, perfil: "ADMIN_INTERNO", clienteId: null } });

    await expect(exigirAcessoARota("/usuarios")).resolves.toEqual({ usuarioId, perfil: "ADMIN" });
  });

  it("mantém o acesso normal de usuário ativo sem mudança de perfil", async () => {
    await expect(obterContexto()).resolves.toEqual({ usuarioId, perfil: "ADMIN" });
  });

  it("falha fechado quando a consulta de revalidação não está disponível", async () => {
    vi.spyOn(prismaApp, "$transaction").mockRejectedValueOnce(new Error("Banco indisponível"));

    await expect(obterContexto()).rejects.toThrow("Banco indisponível");
  });
});
