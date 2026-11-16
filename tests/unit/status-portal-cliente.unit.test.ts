/** Situação do portal na lista de Clientes: derivada dos usuários CLIENTE ligados ao cadastro. */
import { describe, expect, it } from "vitest";
import { statusPortalDoCliente } from "@/lib/status-portal-cliente";

describe("situação do portal do cliente", () => {
  it("sem usuário, é sem acesso", () => {
    expect(statusPortalDoCliente([])).toBe("SEM_ACESSO");
  });

  it("convite sem senha definida é pendente", () => {
    expect(statusPortalDoCliente([{ ativo: true, senhaHash: null }])).toBe("PENDENTE");
  });

  it("basta um usuário ativo com senha para o acesso estar ativo", () => {
    expect(statusPortalDoCliente([{ ativo: true, senhaHash: null }, { ativo: true, senhaHash: "x" }])).toBe("ATIVO");
  });

  it("usuário desativado não conta como acesso", () => {
    expect(statusPortalDoCliente([{ ativo: false, senhaHash: "x" }])).toBe("SEM_ACESSO");
    expect(statusPortalDoCliente([{ ativo: false, senhaHash: "x" }, { ativo: true, senhaHash: null }])).toBe("PENDENTE");
  });
});
