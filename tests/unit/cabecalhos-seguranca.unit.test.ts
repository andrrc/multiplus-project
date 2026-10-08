/** RF-014 / RF-043 — política de cabeçalhos HTTP aplicada pelo proxy de borda. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const caddyfile = readFileSync(resolve(process.cwd(), "Caddyfile"), "utf8");

describe("cabeçalhos de segurança no Caddy", () => {
  it("envia CSP com fontes locais e sem eval, mantendo compatibilidade com scripts Next inline", () => {
    expect(caddyfile).toContain("Content-Security-Policy");
    expect(caddyfile).toContain("default-src 'self'");
    expect(caddyfile).toContain("script-src 'self' 'unsafe-inline'");
    expect(caddyfile).not.toContain("unsafe-eval");
    expect(caddyfile).toContain("object-src 'none'");
    expect(caddyfile).toContain("base-uri 'self'");
    expect(caddyfile).toContain("frame-ancestors 'none'");
  });

  it("sobrescreve X-Real-IP no Caddy para impedir falsificação pelo cliente", () => {
    expect(caddyfile).toContain("header_up X-Real-IP {http.request.remote.host}");
  });
});
