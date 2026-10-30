/** Segurança da suíte: impedir preparação ou limpeza em banco não descartável. */
import { describe, expect, it } from "vitest";
import { validarDestinosDeTeste, validarIdentidadesDeTeste, validarSeparacaoDeBancos } from "../integration/setup/banco-teste-seguro";

const owner = "postgresql://owner:senha@127.0.0.1:5434/multiplus_test";
const app = "postgresql://multiplus_app:senha@127.0.0.1:5434/multiplus_test";

describe("destinos do banco de teste", () => {
  it("aceita as duas roles no mesmo banco local descartável", () => {
    expect(() => validarDestinosDeTeste(owner, app)).not.toThrow();
  });
  it.each([
    [undefined, app], [owner, undefined], ["inválido", app],
    [owner.replace("multiplus_test", "multiplus"), app],
    [owner, app.replace("multiplus_test", "postgres")],
    [owner.replace("127.0.0.1", "exemplo.com"), app],
    [owner, app.replace("127.0.0.1", "localhost")],
    [owner, app.replace("5434", "5432")],
    [owner + "?host=exemplo.com", app],
    [owner.replace("multiplus_test", "multiplus_test_e2e"), app],
    [owner, app.replace("multiplus_app", "owner")],
  ])("rejeita configurações inseguras sem revelar credenciais", (a, b) => {
    expect(() => validarDestinosDeTeste(a, b)).toThrow(/banco de teste/i);
  });
});

describe("separação do banco de aplicação", () => {
  it("recusa aliases locais apontando ao mesmo banco", () => {
    expect(() => validarSeparacaoDeBancos(owner, ["postgresql://outro:senha@localhost:5434/multiplus_test"])).toThrow(/banco de teste/i);
  });
  it("aceita outro banco na mesma instância", () => {
    expect(() => validarSeparacaoDeBancos(owner, ["postgresql://outro:senha@localhost:5434/multiplus"])).not.toThrow();
  });
});

describe("identidade efetiva das conexões", () => {
  const owner = { banco: "multiplus_test", servidor: "127.0.0.1/32", porta: 5432, usuario: "owner" };
  const app = { ...owner, usuario: "multiplus_app" };
  it("aceita conexões ao mesmo servidor e banco com roles diferentes", () => {
    expect(() => validarIdentidadesDeTeste(owner, app, "multiplus_test")).not.toThrow();
  });
  it.each([
    { ...app, banco: "multiplus" }, { ...app, servidor: "::1/128" },
    { ...app, porta: 5433 }, { ...app, usuario: "owner" },
  ])("recusa identidade divergente", (invalida) => {
    expect(() => validarIdentidadesDeTeste(owner, invalida, "multiplus_test")).toThrow(/banco de teste/i);
  });
});
