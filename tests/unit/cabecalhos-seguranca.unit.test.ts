/** RF-014 / RF-043 — política de cabeçalhos HTTP aplicada pelo proxy de borda. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const caddyfile = readFileSync(resolve(process.cwd(), "Caddyfile"), "utf8");

describe("cabeçalhos de segurança no Caddy", () => {
  it("deixa a CSP por nonce para a aplicação e preserva os demais cabeçalhos", () => {
    expect(caddyfile).not.toContain("Content-Security-Policy");
    expect(caddyfile).toContain('X-Content-Type-Options "nosniff"');
    expect(caddyfile).toContain('X-Frame-Options "DENY"');
  });

  it("sobrescreve X-Real-IP no Caddy para impedir falsificação pelo cliente", () => {
    expect(caddyfile).toContain("header_up X-Real-IP {http.request.remote.host}");
  });
});
