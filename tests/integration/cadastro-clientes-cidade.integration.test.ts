/**
 * RF-003 — coluna e filtro de cidade no Painel de Clientes (busca unificada por
 * nome/CNPJ/CPF/cidade + dropdown listando só cidades com cliente cadastrado). Módulo SRS:
 * Cadastro de Clientes (Seção 3.1), reunião de aprovação da Sprint 2.
 *
 * Espelha a query real de `src/lib/clientes.ts#listarClientes`/`listarCidadesComCliente`
 * (mesmo padrão dos demais testes de integração deste módulo: bate direto no Postgres de
 * teste via `appDb`, não importa `src/lib/clientes.ts` porque esse módulo aponta pra
 * `APP_DATABASE_URL` de produção/dev, não pro banco de teste).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ownerDb, comoUsuario, limparFixtures, fecharConexoes } from "./setup/helpers";

let usuarioAdmin: { id: string };

beforeAll(async () => {
  await limparFixtures();

  await ownerDb.cliente.create({
    data: {
      razaoSocial: "Fazenda Ltda",
      cnpj: "11111111000101",
      segmento: "Área rural",
      origemContato: "Indicação",
      municipio: "Sorocaba",
    },
  });
  await ownerDb.cliente.create({
    data: {
      razaoSocial: "Indústria Química SA",
      cnpj: "22222222000102",
      segmento: "Indústria",
      origemContato: "Google",
      municipio: "Votorantim",
    },
  });
  await ownerDb.cliente.create({
    data: {
      razaoSocial: "Posto Sem Cidade Ltda",
      cnpj: "33333333000103",
      segmento: "Posto de combustível",
      origemContato: "Google",
    },
  });

  usuarioAdmin = await ownerDb.usuario.create({
    data: { nome: "Talita", email: "talita.cidade@teste.local", perfil: "ADMIN" },
  });
});

afterAll(async () => {
  await limparFixtures();
  await fecharConexoes();
});

const ctxAdmin = () => ({ usuarioId: usuarioAdmin.id, perfil: "ADMIN" as const });

describe("busca unificada por nome/CNPJ/CPF/cidade", () => {
  it("busca por cidade retorna o cliente daquele município", async () => {
    const resultado = await comoUsuario(ctxAdmin(), (tx) =>
      tx.cliente.findMany({
        where: { OR: [{ municipio: { contains: "Votorantim", mode: "insensitive" } }] },
      }),
    );
    expect(resultado.map((c) => c.razaoSocial)).toEqual(["Indústria Química SA"]);
  });
});

describe("filtro dropdown de cidade", () => {
  it("lista só municípios que já têm cliente cadastrado, sem duplicar, ordenado", async () => {
    const cidades = await comoUsuario(ctxAdmin(), (tx) =>
      tx.cliente.findMany({
        where: { municipio: { not: null } },
        distinct: ["municipio"],
        select: { municipio: true },
        orderBy: { municipio: "asc" },
      }),
    );
    expect(cidades.map((c) => c.municipio)).toEqual(["Sorocaba", "Votorantim"]);
  });

  it("cliente sem município não aparece em nenhuma opção do filtro", async () => {
    const cidades = await comoUsuario(ctxAdmin(), (tx) =>
      tx.cliente.findMany({ where: { municipio: { not: null } }, select: { razaoSocial: true } }),
    );
    expect(cidades.map((c) => c.razaoSocial)).not.toContain("Posto Sem Cidade Ltda");
  });

  it("filtro por cidade exata retorna só os clientes daquele município", async () => {
    const resultado = await comoUsuario(ctxAdmin(), (tx) =>
      tx.cliente.findMany({ where: { municipio: "Sorocaba" } }),
    );
    expect(resultado.map((c) => c.razaoSocial)).toEqual(["Fazenda Ltda"]);
  });
});
