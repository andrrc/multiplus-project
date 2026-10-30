/** RF-043 — política CSP deve autorizar scripts por nonce, sem liberar scripts inline. */
import { expect, it } from "vitest";
import { montarCsp } from "@/lib/csp";

it("exige nonce para scripts em produção", () => {
  const politica = montarCsp("nonce-teste", false);
  expect(politica).toContain("'nonce-nonce-teste'");
  expect(politica.match(/script-src[^;]*/)?.[0]).not.toContain("'unsafe-inline'");
  expect(politica).toContain("frame-ancestors 'none'");
});
