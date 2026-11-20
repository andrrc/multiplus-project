/**
 * Papel do responsável na lista de Tarefas (protótipo 03-listas-projetos-tarefas).
 */
import { describe, expect, it } from "vitest";
import { papelDoResponsavel } from "@/lib/papel-responsavel";

describe("papelDoResponsavel", () => {
  it("usa o perfil quando o responsável é da equipe", () => {
    expect(papelDoResponsavel({ responsavelUsuario: { perfil: "ADMIN" } })).toBe("Administração");
    expect(papelDoResponsavel({ responsavelUsuario: { perfil: "ADMIN_INTERNO" } })).toBe("Colaborador interno");
    expect(papelDoResponsavel({ responsavelUsuario: { perfil: "ADMIN_EXTERNO" } })).toBe("Colaborador externo");
  });

  it("pessoa envolvida com acesso é colaborador externo; sem acesso é pessoa do cliente", () => {
    expect(papelDoResponsavel({ responsavel: { temAcesso: true } })).toBe("Colaborador externo");
    expect(papelDoResponsavel({ responsavel: { temAcesso: false } })).toBe("Pessoa do cliente");
  });

  it("sem responsável não há papel", () => {
    expect(papelDoResponsavel({})).toBeNull();
    expect(papelDoResponsavel({ responsavel: null, responsavelUsuario: null })).toBeNull();
  });
});
