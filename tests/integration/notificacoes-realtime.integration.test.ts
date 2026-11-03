/** RF-023 — publicação transacional de notificações para o canal realtime. */
import { randomBytes } from "node:crypto";
import { Client } from "pg";
import { afterEach, expect, it } from "vitest";
import { ownerDb } from "./setup/helpers";

let usuarioId = "";
let notificacaoId = "";

afterEach(async () => {
  if (notificacaoId) await ownerDb.notificacao.deleteMany({ where: { id: notificacaoId } });
  if (usuarioId) await ownerDb.usuario.deleteMany({ where: { id: usuarioId } });
  usuarioId = "";
  notificacaoId = "";
});

it("publica após o commit apenas os ids mínimos no canal PostgreSQL", async () => {
  const email = `realtime-${randomBytes(8).toString("hex")}@teste.local`;
  const usuario = await ownerDb.usuario.create({ data: { nome: "Conta realtime", email, perfil: "ADMIN" } });
  usuarioId = usuario.id;

  const listener = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  await listener.connect();
  await listener.query("LISTEN notificacoes_novas");
  const aguardarPayload = () => new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("A notificação não chegou ao canal realtime.")), 3000);
    listener.once("notification", (aviso) => {
      clearTimeout(timeout);
      resolve(aviso.payload ?? "");
    });
  });

  try {
    const primeiraEntrega = aguardarPayload();
    const notificacao = await ownerDb.notificacao.create({ data: {
      usuarioId,
      evento: "CONCLUSAO_SOLICITADA",
      titulo: "Título confidencial",
      mensagem: "Mensagem confidencial",
    } });
    notificacaoId = notificacao.id;
    const payloadNova = await primeiraEntrega;
    expect(JSON.parse(payloadNova)).toMatchObject({ id: notificacaoId, usuarioId, lida: false });
    expect(payloadNova).not.toContain("Título confidencial");
    expect(payloadNova).not.toContain("Mensagem confidencial");

    const sinalLeitura = aguardarPayload();
    await ownerDb.notificacao.update({ where: { id: notificacaoId }, data: { lida: true } });
    expect(JSON.parse(await sinalLeitura)).toMatchObject({ id: notificacaoId, usuarioId, lida: true });
  } finally {
    await listener.query("UNLISTEN notificacoes_novas").catch(() => undefined);
    await listener.end();
  }
});
