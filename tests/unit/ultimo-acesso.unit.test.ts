/**
 * Texto da coluna "Último acesso": data no horário de Brasília ou o motivo de não haver data.
 */
import { describe, expect, it, vi } from "vitest";

// O módulo importa o cliente Prisma só para gravar o login; aqui interessa apenas o texto.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { descreverUltimoAcesso } from "@/lib/ultimo-acesso";

describe("descreverUltimoAcesso", () => {
  it("mostra data e hora no horário de Brasília", () => {
    // 17/11/2026 22:30 UTC = 19:30 em Brasília (UTC-3).
    expect(descreverUltimoAcesso({ ultimoAcessoEm: new Date("2026-11-17T22:30:00Z"), temSenha: true })).toBe("17/11/2026, 19:30");
  });

  it("vira o dia pelo fuso de Brasília, não pelo UTC", () => {
    // 18/11/2026 01:15 UTC ainda é 17/11 22:15 em Brasília.
    expect(descreverUltimoAcesso({ ultimoAcessoEm: new Date("2026-11-18T01:15:00Z"), temSenha: true })).toBe("17/11/2026, 22:15");
  });

  it("quem ainda não definiu a senha nunca acessou", () => {
    expect(descreverUltimoAcesso({ ultimoAcessoEm: null, temSenha: false })).toBe("Ainda não acessou");
  });

  it("quem já tem senha e não tem data entrou antes de o registro existir", () => {
    expect(descreverUltimoAcesso({ ultimoAcessoEm: null, temSenha: true })).toBe("Sem registro");
  });
});
