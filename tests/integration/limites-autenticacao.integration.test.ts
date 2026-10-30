/** RF-014/RF-032 — limites compartilhados e proteção dos contadores de autenticação. */
import { afterAll, afterEach, beforeEach, expect, it } from "vitest";
import { reservarLimites, finalizarLimites } from "@/lib/rate-limit-banco";
import { ownerDb, appDb, fecharConexoes } from "./setup/helpers";

beforeEach(async () => { await ownerDb.limiteAutenticacao.deleteMany(); });
afterEach(async () => { await ownerDb.limiteAutenticacao.deleteMany(); });
afterAll(async () => { await fecharConexoes(); });

it("não grava endereços em texto e bloqueia acesso direto pela role restrita", async () => {
  await reservarLimites([{ chave: "login:email:pessoa@teste.local", limite: 5 }], true);
  const linhas = await ownerDb.limiteAutenticacao.findMany();
  expect(linhas).toHaveLength(1);
  expect(linhas[0].chave).not.toContain("pessoa@teste.local");
  await expect(appDb.limiteAutenticacao.findMany()).rejects.toThrow(/permission denied/i);
});

it("não apaga falhas concorrentes quando uma reserva termina com sucesso", async () => {
  const limite = [{ chave: "login:email:concorrente@teste.local", limite: 5 }];
  const sucesso = await reservarLimites(limite, true);
  const falha = await reservarLimites(limite, true);
  if (!sucesso || !falha) throw new Error("Reservas deveriam ser aceitas");
  await finalizarLimites(falha, false);
  await finalizarLimites(sucesso, true);
  const registro = await ownerDb.limiteAutenticacao.findFirstOrThrow();
  expect(registro.falhas).toBe(1);
  expect(registro.pendentes).toBe(0);
});
