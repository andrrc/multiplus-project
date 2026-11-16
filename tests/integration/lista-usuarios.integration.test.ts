/**
 * Lista de Usuários: empresa de cada pessoa, busca por empresa e acessos de cliente só para leitura. Roda contra o
 * Postgres de verdade, pela role RLS-restrita.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EMPRESA_DA_EQUIPE, listarUsuarios } from "@/lib/usuarios";
import { ownerDb, limparFixtures, fecharConexoes } from "./setup/helpers";

let admin: { id: string };
let interno: { id: string };

const ctxAdmin = () => ({ usuarioId: admin.id, perfil: "ADMIN" as const });

beforeAll(async () => {
  await limparFixtures();
  admin = await ownerDb.usuario.create({ data: { nome: "Talita usuarios", email: "talita.usuarios@teste.local", perfil: "ADMIN" } });
  interno = await ownerDb.usuario.create({ data: { nome: "Interno usuarios", email: "interno.usuarios@teste.local", perfil: "ADMIN_INTERNO" } });
  const cliente = await ownerDb.cliente.create({ data: { razaoSocial: "Empresa Usuarios Ltda", cnpj: "44555666000177", segmento: "Indústria", origemContato: "Indicação" } });
  const pessoa = await ownerDb.pessoaEnvolvida.create({ data: { clienteId: cliente.id, nome: "Pessoa Usuarios", email: "pessoa.usuarios@teste.local", temAcesso: true } });
  await ownerDb.usuario.create({ data: { nome: "Externo com empresa", email: "externo.empresa@teste.local", perfil: "ADMIN_EXTERNO", pessoaEnvolvidaId: pessoa.id } });
  await ownerDb.usuario.create({ data: { nome: "Externo avulso", email: "externo.avulso@teste.local", perfil: "ADMIN_EXTERNO" } });
  await ownerDb.usuario.create({ data: { nome: "Cliente do portal", email: "cliente.portal.usuarios@teste.local", perfil: "CLIENTE", clienteId: cliente.id, senhaHash: "x" } });
});

afterAll(async () => {
  await limparFixtures();
  await fecharConexoes();
});

describe("lista de usuários", () => {
  it("por padrão é só da equipe, sem acessos de cliente", async () => {
    const lista = await listarUsuarios(ctxAdmin());
    expect(lista.map((u) => u.perfil)).not.toContain("CLIENTE");
    expect(await listarUsuarios(ctxAdmin(), { perfil: "CLIENTE" })).toEqual([]);
  });

  it("traz a empresa de cada pessoa e os acessos de cliente quando pedidos", async () => {
    const lista = await listarUsuarios(ctxAdmin(), { incluirClientes: true });
    const por = Object.fromEntries(lista.map((u) => [u.nome, u]));
    expect(por["Interno usuarios"].empresa).toBe(EMPRESA_DA_EQUIPE);
    expect(por["Externo com empresa"].empresa).toBe("Empresa Usuarios Ltda");
    expect(por["Externo avulso"].empresa).toBeNull();
    expect(por["Cliente do portal"]).toMatchObject({ empresa: "Empresa Usuarios Ltda", perfil: "CLIENTE", status: "ATIVO" });
    expect(por["Cliente do portal"].clienteId).toBeTruthy();
  });

  it("filtra pelo perfil de cliente só quando os clientes são incluídos", async () => {
    const lista = await listarUsuarios(ctxAdmin(), { incluirClientes: true, perfil: "CLIENTE" });
    expect(lista.map((u) => u.nome)).toEqual(["Cliente do portal"]);
  });

  it("a busca também procura pelo nome da empresa", async () => {
    const lista = await listarUsuarios(ctxAdmin(), { incluirClientes: true, busca: "Usuarios Ltda" });
    expect(lista.map((u) => u.nome).sort()).toEqual(["Cliente do portal", "Externo com empresa"]);
  });

  it("outro perfil não lista ninguém", async () => {
    expect(await listarUsuarios({ usuarioId: interno.id, perfil: "ADMIN_INTERNO" }, { incluirClientes: true })).toEqual([]);
  });
});
