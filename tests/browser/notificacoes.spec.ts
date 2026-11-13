/** RF-022/RF-023/RF-043 — resumo, toasts realtime e central de notificações em desktop e celular. */
import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { validarDestinosDeTeste } from "../integration/setup/banco-teste-seguro";

validarDestinosDeTeste(process.env.TEST_DATABASE_URL, process.env.TEST_APP_DATABASE_URL);
const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
const token = randomBytes(32).toString("hex");
const email = `browser-sino-admin-${randomBytes(8).toString("hex")}@teste.local`;
const senha = "SenhaForte123!";
let usuarioId = "";

test.beforeAll(async () => {
  const usuario = await db.usuario.create({ data: { nome: "Talita sino", email, perfil: "ADMIN" } });
  usuarioId = usuario.id;
  await db.tokenAcesso.create({ data: {
    usuarioId,
    tipo: "DEFINIR_SENHA",
    tokenHash: createHash("sha256").update(token).digest("hex"),
    expiraEm: new Date(Date.now() + 3_600_000),
  } });
  await db.notificacao.create({ data: {
    usuarioId,
    evento: "CONCLUSAO_SOLICITADA",
    titulo: "Conclusão aguardando confirmação",
    mensagem: "Um colaborador solicitou a conclusão de uma tarefa de teste.",
    url: "/subtarefas",
  } });
});

test.afterAll(async () => {
  if (usuarioId) {
    await db.notificacao.deleteMany({ where: { usuarioId } });
    await db.usuario.delete({ where: { id: usuarioId } });
  }
  await db.$disconnect();
});

test("Talita recebe resumo inicial, toasts em tempo real e pode abrir a central", async ({ page }) => {
  const streamConectado = page.waitForResponse((resposta) => resposta.url().includes("/api/notificacoes/stream"));
  await page.goto(`/definir-senha?token=${token}`);
  await page.getByLabel("Nova senha").fill(senha);
  await page.getByLabel("Confirmar senha").fill(senha);
  await page.getByRole("button", { name: "Definir senha e entrar" }).click();
  await expect(page.getByRole("heading", { name: "Painel", exact: true })).toBeVisible();
  expect((await streamConectado).status()).toBe(200);

  const resumo = page.getByRole("link", { name: /Você tem 1 notificação nova/ });
  await expect(resumo).toBeVisible();
  await resumo.click();
  await expect(page).toHaveURL(/\/notificacoes$/);
  await expect(page.getByText("Conclusão aguardando confirmação")).toBeVisible();
  await expect.poll(async () => (await db.notificacao.findFirst({ where: { usuarioId, titulo: "Conclusão aguardando confirmação" } }))?.lida).toBe(true);

  const totalAntesDaDemonstracao = await db.notificacao.count({ where: { usuarioId } });
  const gerarToasts = page.getByRole("button", { name: "Gerar toasts de demonstração" });
  await expect(gerarToasts).toBeVisible();
  await gerarToasts.click();
  const cartoes = page.getByRole("status");
  await expect(cartoes).toHaveCount(3);
  const fecharDemonstracao = async (nome: RegExp) => {
    const link = page.getByRole("link", { name: nome });
    await link.locator("xpath=ancestor::article").getByRole("button", { name: "Fechar notificação" }).click();
    await expect(link).toHaveCount(0);
  };
  await expect(page.getByRole("link", { name: /Sucesso: Demonstração · Sucesso/ })).toBeVisible();
  expect(await db.notificacao.count({ where: { usuarioId } })).toBe(totalAntesDaDemonstracao);
  await fecharDemonstracao(/Sucesso: Demonstração · Sucesso/);
  await expect(page.getByRole("link", { name: /Erro: Demonstração · Erro/ })).toBeVisible();
  await fecharDemonstracao(/Atenção: Demonstração · Atenção/);
  await fecharDemonstracao(/Informação: Demonstração · Informação/);
  await fecharDemonstracao(/Erro: Demonstração · Erro/);
  await expect(cartoes).toHaveCount(0);

  await db.notificacao.create({ data: {
    usuarioId,
    evento: "TAREFA_CONCLUIDA",
    titulo: "Tarefa concluída em tempo real",
    mensagem: "A tarefa de teste foi confirmada.",
    url: "/subtarefas",
  } });
  const toast = page.getByRole("link", { name: /Tarefa concluída em tempo real/ });
  await expect(toast).toBeVisible();
  // O mouse sai da área antes: se ele já estivesse sobre o ponto onde o toast aparece (onde o toast anterior foi fechado),
  // o hover não geraria `pointerenter` e o toast não pausaria.
  await page.mouse.move(0, 0);
  await toast.hover({ force: true });
  await expect(toast.locator("xpath=ancestor::article")).toHaveAttribute("data-pausado", "true");
  await page.waitForTimeout(6200);
  await expect(toast).toBeVisible();
  await toast.click({ force: true });
  await expect(page).toHaveURL(/\/subtarefas$/);
  await expect.poll(async () => (await db.notificacao.findFirst({ where: { usuarioId, titulo: "Tarefa concluída em tempo real" } }))?.lida).toBe(true);

  const sinoDesktop = page.getByRole("link", { name: /Notificações/ });
  await expect(sinoDesktop).toBeVisible();

  await page.setViewportSize({ width: 375, height: 812 });
  await db.notificacao.create({ data: {
    usuarioId,
    evento: "NOVO_COMENTARIO",
    titulo: "Toast em tela estreita",
    mensagem: "O cartão permanece dentro da largura do celular.",
    url: null,
  } });
  const toastMobile = page.getByRole("link", { name: /Toast em tela estreita/ });
  await expect(toastMobile).toBeVisible();
  expect(await toastMobile.evaluate((element) => element.getBoundingClientRect().width)).toBeLessThanOrEqual(343);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await expect(toastMobile).toHaveCount(0, { timeout: 7000 });

  await page.getByRole("button", { name: "Abrir menu" }).click();
  const sinoMobile = page.getByRole("link", { name: /Notificações/ });
  await expect(sinoMobile).toBeVisible();
  await sinoMobile.click();
  await expect(page).toHaveURL(/\/notificacoes$/);
  await expect(page.getByRole("button", { name: "Gerar toasts de demonstração" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await expect(page.getByText("Um colaborador solicitou a conclusão de uma tarefa de teste.")).toBeVisible();
  await expect.poll(async () => db.notificacao.count({ where: { usuarioId, lida: false } })).toBe(0);
});
