/** Deploy em proxy externo: a rede validada deve ser a rede declarada pelo Compose. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const deploy = readFileSync("ops/deploy.sh", "utf8");
const compose = readFileSync("docker-compose.proxy.yml", "utf8");

describe("deploy com proxy externo", () => {
  it("verifica a mesma rede externa declarada pelo Compose antes de subir os serviços", () => {
    const rede = compose.match(/networks:\s*\n  ([a-z0-9_-]+):\s*\n    external: true/i)?.[1];
    expect(rede).toBe("caddy_proxy");
    const verificacao = `docker network inspect ${rede}`;
    expect(deploy).toContain(verificacao);
    expect(deploy.indexOf(verificacao)).toBeLessThan(deploy.indexOf("compose up -d postgres minio"));
    expect(deploy).toContain(`rede Docker externa ${rede} não existe`);
  });
});
