/**
 * RF-026/RF-027 (herança de dados PJ) + validação de CPF/CNPJ usada no cadastro de
 * clientes (RF-001, RF-026, RF-027) + comportamento de falha da consulta de CNPJ
 * (SRS Seção 6.1 documenta essa integração externa como sujeita a instabilidade —
 * confirmado na prática: BrasilAPI devolve 403 sem header User-Agent). Módulo SRS:
 * Cadastro de Clientes (Seção 3.1, 3.12).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { heredarDadosPontoContato, type DadosPessoa } from "@/lib/heranca-pessoa";
import { validarCpf } from "@/lib/cpf";
import { validarCnpj, consultarCnpj } from "@/lib/cnpj";

describe("heredarDadosPontoContato (RF-027)", () => {
  it("copia todos os dados do Responsável Legal e usa o cargo informado", () => {
    const responsavelLegal: DadosPessoa = {
      nome: "Maria Silva",
      endereco: "Rua das Flores, 100",
      rg: "12.345.678-9",
      cpf: "111.444.777-35",
      telefone: "11999998888",
      email: "maria@empresa.com",
    };

    const pontoContato = heredarDadosPontoContato(responsavelLegal, "Diretora Financeira");

    expect(pontoContato).toEqual({ ...responsavelLegal, cargo: "Diretora Financeira" });
  });
});

describe("validarCpf (RN — dígito verificador)", () => {
  it("aceita um CPF válido, com ou sem máscara", () => {
    expect(validarCpf("111.444.777-35")).toBe(true);
    expect(validarCpf("11144477735")).toBe(true);
  });

  it("rejeita CPF com dígito verificador incorreto", () => {
    expect(validarCpf("111.444.777-36")).toBe(false);
  });

  it("rejeita sequência de dígitos repetidos e tamanho inválido", () => {
    expect(validarCpf("111.111.111-11")).toBe(false);
    expect(validarCpf("123")).toBe(false);
  });
});

describe("validarCnpj (RF-001 — critério de aceite 'CNPJ válido')", () => {
  it("aceita um CNPJ válido, com ou sem máscara", () => {
    expect(validarCnpj("11.222.333/0001-81")).toBe(true);
    expect(validarCnpj("11222333000181")).toBe(true);
  });

  it("rejeita CNPJ com dígito verificador incorreto", () => {
    expect(validarCnpj("11.222.333/0001-82")).toBe(false);
  });

  it("rejeita sequência de dígitos repetidos e tamanho inválido", () => {
    expect(validarCnpj("11.111.111/1111-11")).toBe(false);
    expect(validarCnpj("123")).toBe(false);
  });
});

describe("consultarCnpj — comportamento de falha (SRS 6.1, PDD Fluxo A)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("manda um header User-Agent — sem ele a BrasilAPI bloqueia com 403 (bug real já visto)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await consultarCnpj("11222333000181");

    const [, opcoes] = fetchMock.mock.calls[0];
    expect((opcoes.headers as Record<string, string>)["User-Agent"]).toBeTruthy();
  });

  it("retorna null (não 'não encontrado') quando o serviço está indisponível ou cai a conexão", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network error")),
    );

    const resultado = await consultarCnpj("11222333000181");
    expect(resultado).toBeNull();
  });

  it("retorna null quando a resposta não é ok mas também não é 404 (ex.: 403 do WAF, 500)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Forbidden", { status: 403 })));

    const resultado = await consultarCnpj("11222333000181");
    expect(resultado).toBeNull();
  });

  it("retorna 'encontrado: false' (não null) quando o CNPJ não existe na Receita — 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Not Found", { status: 404 })));

    const resultado = await consultarCnpj("11222333000181");
    expect(resultado).toEqual({ encontrado: false });
  });

  it("retorna os dados quando a consulta funciona", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            razao_social: "EMPRESA TESTE LTDA",
            logradouro: "Rua Teste",
            numero: "123",
            bairro: "Centro",
            municipio: "Sao Paulo",
            uf: "SP",
          }),
          { status: 200 },
        ),
      ),
    );

    const resultado = await consultarCnpj("11222333000181");
    expect(resultado).toEqual({
      encontrado: true,
      razaoSocial: "EMPRESA TESTE LTDA",
      endereco: "Rua Teste, 123, Centro, Sao Paulo, SP",
    });
  });
});
