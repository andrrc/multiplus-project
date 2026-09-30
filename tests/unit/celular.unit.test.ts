/** RF-002d, RF-028 e RF-030 — máscara e validação dos campos de celular. */
import { describe, expect, it } from "vitest";
import { formatarTelefone, mascararTelefone, validarTelefoneCelular } from "@/lib/formatacao";
import { validarPessoaEnvolvida } from "@/lib/pessoas-envolvidas";

describe("formatação de celular", () => {
  it("aplica a máscara progressivamente e limita entradas maiores que 11 dígitos", () => {
    expect(mascararTelefone("1")).toBe("(1");
    expect(mascararTelefone("119")).toBe("(11) 9");
    expect(mascararTelefone("11987654321")).toBe("(11) 98765-4321");
    expect(mascararTelefone("119876543210")).toBe("119876543210");
  });

  it("aceita colagem com +55 e formata números antigos com ou sem pontuação", () => {
    expect(mascararTelefone("+55 (11) 98765-4321")).toBe("(11) 98765-4321");
    expect(formatarTelefone("11987654321")).toBe("(11) 98765-4321");
    expect(formatarTelefone("+55 11 98765-4321")).toBe("(11) 98765-4321");
    expect(formatarTelefone("(11) 98765-4321")).toBe("(11) 98765-4321");
  });

  it("valida apenas celular nacional com DDD e nove dígitos", () => {
    expect(validarTelefoneCelular("(11) 98765-4321")).toBe(true);
    expect(validarTelefoneCelular("+55 11 98765-4321")).toBe(true);
    expect(validarTelefoneCelular("(11) 8765-4321")).toBe(false);
    expect(validarTelefoneCelular("119876543210")).toBe(false);
  });

  it("exige celular válido para pessoa envolvida, inclusive empresa", () => {
    const pessoa = {
      tipo: "EMPRESA" as const,
      nome: "Empresa de apoio",
      telefone: "(11) 98765-4321",
      email: "contato@example.com",
      temAcesso: false,
    };
    expect(validarPessoaEnvolvida(pessoa)).toBeNull();
    expect(validarPessoaEnvolvida({ ...pessoa, telefone: "(11) 8765-4321" })).toBe(
      "O celular deve ter DDD e 9 dígitos.",
    );
  });
});
