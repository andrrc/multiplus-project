/**
 * RF-026/RF-027 (herança de dados PJ) + validação de CPF/CNPJ usada no cadastro de
 * clientes (RF-001, RF-026, RF-027). Módulo SRS: Cadastro de Clientes (Seção 3.1, 3.12).
 */
import { describe, expect, it } from "vitest";
import { heredarDadosPontoContato, type DadosPessoa } from "@/lib/heranca-pessoa";
import { validarCpf } from "@/lib/cpf";
import { validarCnpj } from "@/lib/cnpj";

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
