/** RF-031 e RF-039 — reenvio do convite do cliente: permissão, vínculo, estados e token. */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  usuarioId: "",
  perfil: "ADMIN" as "ADMIN" | "ADMIN_INTERNO" | "ADMIN_EXTERNO" | "CLIENTE",
}));

vi.mock("@/server/auth/contexto", () => ({
  obterContexto: async () => ({ usuarioId: authState.usuarioId, perfil: authState.perfil }),
  exigirAdmin: async () => {
    if (authState.perfil !== "ADMIN") throw new Error("Ação restrita ao Administrador.");
    return { usuarioId: authState.usuarioId, perfil: authState.perfil };
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/email", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/email")>();
  return { ...mod, enviarEmail: vi.fn(async () => {}) };
});

import { createHash } from "node:crypto";
import { ownerDb, limparFixtures, fecharConexoes } from "./setup/helpers";
import { reenviarConviteClienteAction } from "@/app/(painel)/clientes/[id]/actions";
import { buscarClienteDetalheSeguro, reenviarConviteAcessoCliente } from "@/lib/clientes";
import { enviarEmail } from "@/lib/email";
import { criarTokenAcesso, validarTokenAcesso } from "@/lib/tokens";

const emailMock = vi.mocked(enviarEmail);

async function criarClienteEConta() {
  const cliente = await ownerDb.cliente.create({
    data: {
      razaoSocial: "Cliente Convite Teste",
      segmento: "Indústria",
      origemContato: "Indicação",
    },
  });
  const usuario = await ownerDb.usuario.create({
    data: {
      nome: "Contato Convite",
      email: "convite.cliente@teste.local",
      perfil: "CLIENTE",
      clienteId: cliente.id,
    },
  });
  return { cliente, usuario };
}

let ctxAdmin: { usuarioId: string; perfil: "ADMIN" };
let ctxInterno: { usuarioId: string; perfil: "ADMIN_INTERNO" };

beforeEach(async () => {
  await limparFixtures();
  emailMock.mockReset();
  emailMock.mockImplementation(async () => {});
  const admin = await ownerDb.usuario.create({
    data: { nome: "Talita", email: "talita.reenvio-cliente@teste.local", perfil: "ADMIN" },
  });
  const interno = await ownerDb.usuario.create({
    data: { nome: "Colaborador", email: "interno.reenvio-cliente@teste.local", perfil: "ADMIN_INTERNO" },
  });
  ctxAdmin = { usuarioId: admin.id, perfil: "ADMIN" };
  ctxInterno = { usuarioId: interno.id, perfil: "ADMIN_INTERNO" };
  authState.usuarioId = admin.id;
  authState.perfil = "ADMIN";
});

afterEach(async () => {
  await limparFixtures();
  emailMock.mockReset();
  emailMock.mockImplementation(async () => {});
});

afterAll(async () => {
  await fecharConexoes();
});

describe("RF-031 — reenvio do convite de acesso do cliente", () => {
  it("gera novo link, invalida o anterior e envia para o e-mail da conta", async () => {
    const { cliente, usuario } = await criarClienteEConta();
    const anterior = await criarTokenAcesso(usuario.id, "DEFINIR_SENHA");

    const resultado = await reenviarConviteAcessoCliente(ctxAdmin, cliente.id);

    expect(resultado).toMatchObject({
      sucesso: true,
      convite: "enviado",
      destinatario: usuario.email,
    });
    if (!resultado.sucesso) return;

    expect(resultado.link).toContain("/definir-senha?token=");
    expect(emailMock).toHaveBeenCalledTimes(1);
    expect(emailMock.mock.calls[0][0]).toMatchObject({ to: usuario.email });
    expect(emailMock.mock.calls[0][0].html).toContain(resultado.link);

    const tokenNovo = new URL(resultado.link).searchParams.get("token");
    expect(tokenNovo).toBeTruthy();
    expect(await validarTokenAcesso(anterior)).toEqual({ valido: false, motivo: "ja_usado" });
    expect(await validarTokenAcesso(tokenNovo!)).toMatchObject({ valido: true, usuarioId: usuario.id });

    const persistido = await ownerDb.tokenAcesso.findUniqueOrThrow({
      where: { tokenHash: createHash("sha256").update(tokenNovo!).digest("hex") },
    });
    expect(persistido.tokenHash).not.toBe(tokenNovo);
    const validadeHoras = (persistido.expiraEm.getTime() - Date.now()) / (60 * 60 * 1000);
    expect(validadeHoras).toBeGreaterThan(167.9);
    expect(validadeHoras).toBeLessThanOrEqual(168);

    const detalhe = await buscarClienteDetalheSeguro(ctxAdmin, cliente.id);
    expect(detalhe?.usuarioAcesso?.email).toBe(usuario.email);
    expect(JSON.stringify(detalhe)).not.toContain(tokenNovo);
  });

  it("entrega link manual novo mesmo se o Resend falhar", async () => {
    const { cliente } = await criarClienteEConta();
    emailMock.mockRejectedValueOnce(new Error("Resend indisponível"));

    const resultado = await reenviarConviteAcessoCliente(ctxAdmin, cliente.id);

    expect(resultado).toMatchObject({
      sucesso: true,
      convite: "falha_no_envio",
      destinatario: "convite.cliente@teste.local",
    });
    if (resultado.sucesso) {
      expect(await validarTokenAcesso(new URL(resultado.link).searchParams.get("token")!))
        .toMatchObject({ valido: true });
    }
  });

  it("recusa a chamada direta do serviço por perfil sem permissão, sem criar token ou enviar e-mail", async () => {
    const { cliente, usuario } = await criarClienteEConta();

    expect(await reenviarConviteAcessoCliente(ctxInterno, cliente.id)).toEqual({
      sucesso: false,
      motivo: "sem_permissao",
    });
    expect(emailMock).not.toHaveBeenCalled();
    expect(await ownerDb.tokenAcesso.count({ where: { usuarioId: usuario.id } })).toBe(0);
  });

  it("a Server Action exige ADMIN", async () => {
    const { cliente, usuario } = await criarClienteEConta();
    authState.usuarioId = ctxInterno.usuarioId;
    authState.perfil = "ADMIN_INTERNO";

    await expect(reenviarConviteClienteAction(cliente.id)).rejects.toThrow(/Ação restrita ao Administrador/);
    expect(emailMock).not.toHaveBeenCalled();
    expect(await ownerDb.tokenAcesso.count({ where: { usuarioId: usuario.id } })).toBe(0);
  });

  it.each([
    ["cadastro desativado", "cliente_desativado"],
    ["acesso bloqueado", "acesso_bloqueado"],
    ["conta ativada", "ja_ativado"],
  ] as const)("recusa reenvio quando o %s", async (estado, motivo) => {
    const { cliente, usuario } = await criarClienteEConta();
    if (estado === "cadastro desativado") {
      await ownerDb.cliente.update({ where: { id: cliente.id }, data: { ativo: false } });
    } else if (estado === "acesso bloqueado") {
      await ownerDb.usuario.update({ where: { id: usuario.id }, data: { ativo: false } });
    } else {
      await ownerDb.usuario.update({ where: { id: usuario.id }, data: { senhaHash: "hash-de-teste" } });
    }

    expect(await reenviarConviteAcessoCliente(ctxAdmin, cliente.id)).toEqual({ sucesso: false, motivo });
    expect(emailMock).not.toHaveBeenCalled();
    expect(await ownerDb.tokenAcesso.count({ where: { usuarioId: usuario.id } })).toBe(0);
  });

  it("não usa uma conta CLIENTE de outro cadastro se o alvo não tiver acesso", async () => {
    const clienteAlvo = await ownerDb.cliente.create({
      data: { razaoSocial: "Cliente Sem Acesso", segmento: "Indústria", origemContato: "Indicação" },
    });
    const { usuario } = await criarClienteEConta();

    expect(await reenviarConviteAcessoCliente(ctxAdmin, clienteAlvo.id)).toEqual({
      sucesso: false,
      motivo: "acesso_nao_encontrado",
    });
    expect(emailMock).not.toHaveBeenCalled();
    expect(await ownerDb.tokenAcesso.count({ where: { usuarioId: usuario.id } })).toBe(0);
  });
});
