/**
 * Lista de Clientes da administração: busca por ID, segmento, projetos ativos e situação do portal. Roda contra o
 * Postgres de verdade, pela role RLS-restrita.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listarClientes, listarSegmentosComCliente } from "@/lib/clientes";
import { ownerDb, limparFixtures, fecharConexoes } from "./setup/helpers";

let admin: { id: string };
let alfa: { id: string; numeroIdentificacao: number };
let beta: { id: string; numeroIdentificacao: number };
let gama: { id: string; numeroIdentificacao: number };

const ctxAdmin = () => ({ usuarioId: admin.id, perfil: "ADMIN" as const });

beforeAll(async () => {
  await limparFixtures();
  admin = await ownerDb.usuario.create({ data: { nome: "Talita lista", email: "talita.lista@teste.local", perfil: "ADMIN" } });
  alfa = await ownerDb.cliente.create({ data: { razaoSocial: "Alfa Lista Ltda", cnpj: "11222333000144", segmento: "Indústria", municipio: "Tatuí", origemContato: "Indicação" } });
  beta = await ownerDb.cliente.create({ data: { razaoSocial: "Beta Lista Ltda", cnpj: "22333444000155", segmento: "Posto de combustível", municipio: "Sorocaba", origemContato: "Indicação" } });
  gama = await ownerDb.cliente.create({ data: { razaoSocial: "Gama Lista Ltda", cnpj: "33444555000166", segmento: "Indústria", municipio: "Tatuí", origemContato: "Indicação" } });
  await ownerDb.projeto.create({ data: { clienteId: alfa.id, nome: "Projeto A1" } });
  await ownerDb.projeto.create({ data: { clienteId: alfa.id, nome: "Projeto A2" } });
  await ownerDb.projeto.create({ data: { clienteId: alfa.id, nome: "Projeto A3 desativado", ativo: false } });
  await ownerDb.projeto.create({ data: { clienteId: gama.id, nome: "Projeto G1 desativado", ativo: false } });
  // Portal: Alfa com acesso ativo, Beta com convite pendente, Gama sem usuário.
  await ownerDb.usuario.create({ data: { nome: "Cliente Alfa", email: "cliente.alfa.lista@teste.local", perfil: "CLIENTE", clienteId: alfa.id, senhaHash: "hash-qualquer" } });
  await ownerDb.usuario.create({ data: { nome: "Cliente Beta", email: "cliente.beta.lista@teste.local", perfil: "CLIENTE", clienteId: beta.id } });
});

afterAll(async () => {
  await limparFixtures();
  await fecharConexoes();
});

describe("lista de clientes", () => {
  it("conta só os projetos ativos e deriva a situação do portal", async () => {
    const lista = await listarClientes(ctxAdmin());
    const por = Object.fromEntries(lista.map((c) => [c.razaoSocial, c]));
    expect(por["Alfa Lista Ltda"]).toMatchObject({ projetosAtivos: 2, portal: "ATIVO" });
    expect(por["Beta Lista Ltda"]).toMatchObject({ projetosAtivos: 0, portal: "PENDENTE" });
    expect(por["Gama Lista Ltda"]).toMatchObject({ projetosAtivos: 0, portal: "SEM_ACESSO" });
  });

  it("não deixa o hash da senha nem os usuários na resposta", async () => {
    const [primeiro] = await listarClientes(ctxAdmin());
    expect(primeiro).not.toHaveProperty("usuarios");
    expect(JSON.stringify(primeiro)).not.toContain("hash-qualquer");
  });

  it("busca pelo nome sem trazer clientes que só têm documento", async () => {
    const lista = await listarClientes(ctxAdmin(), "Beta");
    expect(lista.map((c) => c.razaoSocial)).toEqual(["Beta Lista Ltda"]);
  });

  it("busca pelo ID do cliente quando só há números, e ainda pelo CNPJ", async () => {
    const porId = await listarClientes(ctxAdmin(), String(beta.numeroIdentificacao));
    expect(porId.map((c) => c.id)).toContain(beta.id);
    const porCnpj = await listarClientes(ctxAdmin(), "33.444.555/0001-66");
    expect(porCnpj.map((c) => c.razaoSocial)).toEqual(["Gama Lista Ltda"]);
  });

  it("filtra por segmento e lista os segmentos existentes", async () => {
    const industrias = await listarClientes(ctxAdmin(), undefined, undefined, false, undefined, "Indústria");
    expect(industrias.map((c) => c.razaoSocial).sort()).toEqual(["Alfa Lista Ltda", "Gama Lista Ltda"]);
    expect(await listarSegmentosComCliente(ctxAdmin())).toEqual(["Indústria", "Posto de combustível"]);
  });
});
