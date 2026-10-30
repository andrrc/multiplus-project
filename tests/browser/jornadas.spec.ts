/** RF-014/RF-030/RF-031 e listagem de subtarefas: jornadas reais de navegador. */
import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { validarDestinosDeTeste } from "../integration/setup/banco-teste-seguro";

validarDestinosDeTeste(process.env.TEST_DATABASE_URL, process.env.TEST_APP_DATABASE_URL);
const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
const sufixo = randomBytes(8).toString("hex");
const email = `browser-${sufixo}@teste.local`;
const senha = "SenhaForte123!";
const token = randomBytes(32).toString("hex");
let usuarioId: string | undefined;
let clienteId: string | undefined;

test.beforeAll(async () => {
  const usuario = await db.usuario.create({ data: { nome: "Admin de teste", email, perfil: "ADMIN" } });
  usuarioId = usuario.id;
  await db.tokenAcesso.create({ data: {
    usuarioId, tipo: "DEFINIR_SENHA", tokenHash: createHash("sha256").update(token).digest("hex"),
    expiraEm: new Date(Date.now() + 3_600_000),
  } });
  const cliente = await db.cliente.create({ data: { razaoSocial: `Cliente teste ${sufixo}`, segmento: "Teste", origemContato: "Teste" } });
  clienteId = cliente.id;
  const projeto = await db.projeto.create({ data: { clienteId, nome: "Projeto teste" } });
  const tarefa = await db.tarefa.create({ data: { projetoId: projeto.id, nome: "Tarefa teste" } });
  await db.subtarefa.create({ data: { tarefaId: tarefa.id, titulo: "Subtarefa teste do navegador" } });
});

test.afterAll(async () => {
  if (clienteId) await db.cliente.delete({ where: { id: clienteId } });
  if (usuarioId) await db.usuario.delete({ where: { id: usuarioId } });
  await db.$disconnect();
});

test("convite, login e lista responsiva preservam a orientação", async ({ page }) => {
  await page.goto(`/definir-senha?token=${token}`);
  await page.getByLabel("Nova senha").fill(senha);
  await page.getByLabel("Confirmar senha").fill(senha);
  await page.getByRole("button", { name: "Definir senha e entrar" }).click();
  await expect(page.getByRole("heading", { name: "Subtarefas", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sair" }).click();
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("SenhaErrada123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText("E-mail ou senha inválidos.")).toBeVisible();
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Subtarefas", exact: true })).toBeVisible();

  await page.setViewportSize({ width: 1024, height: 800 });
  const tabela = page.getByRole("region", { name: "Tabela de subtarefas" });
  const aviso = page.getByText("Deslize para ver as demais colunas");
  await expect(aviso).toBeVisible();
  const antes = await tabela.boundingBox();
  await tabela.evaluate((el) => { el.scrollLeft = el.scrollWidth; });
  await expect.poll(() => tabela.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  await expect(aviso).toBeVisible();
  const depois = await tabela.boundingBox();
  expect(depois?.y).toBe(antes?.y);

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByRole("link", { name: "Abrir subtarefa Subtarefa teste do navegador" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
