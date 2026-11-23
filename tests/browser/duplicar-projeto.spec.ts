import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { validarDestinosDeTeste } from "../integration/setup/banco-teste-seguro";

validarDestinosDeTeste(process.env.TEST_DATABASE_URL, process.env.TEST_APP_DATABASE_URL);
const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
const sufixo = randomBytes(6).toString("hex");
const token = randomBytes(32).toString("hex");
const nome = `Licenciamento ${sufixo}`;
let usuarioId: string | undefined;
let clienteId: string | undefined;
let projetoId: string;

test.beforeAll(async () => {
  const usuario = await db.usuario.create({
    data: { nome: "Admin da duplicação", perfil: "ADMIN", email: `duplicar-${sufixo}@teste.local` },
  });
  usuarioId = usuario.id;
  await db.tokenAcesso.create({
    data: {
      usuarioId, tipo: "DEFINIR_SENHA", tokenHash: createHash("sha256").update(token).digest("hex"),
      expiraEm: new Date(Date.now() + 3_600_000),
    },
  });
  clienteId = (await db.cliente.create({
    data: { razaoSocial: `Cliente ${sufixo}`, segmento: "Teste", origemContato: "Teste" },
  })).id;
  projetoId = (await db.projeto.create({
    data: { clienteId, nome, tarefas: { create: { nome: "Vistoria", subtarefas: { create: { titulo: "Fotografar" } } } } },
  })).id;
});

test.afterAll(async () => {
  if (clienteId) await db.cliente.delete({ where: { id: clienteId } });
  if (usuarioId) await db.usuario.delete({ where: { id: usuarioId } });
  await db.$disconnect();
});

test("confirma a duplicação e abre o novo projeto, sem rolagem horizontal", async ({ page }) => {
  await page.goto(`/definir-senha?token=${token}`);
  await page.getByLabel("Nova senha").fill("SenhaForte123!");
  await page.getByLabel("Confirmar senha").fill("SenhaForte123!");
  await page.getByRole("button", { name: "Definir senha e entrar" }).click();
  await expect(page.getByRole("heading", { name: "Painel", exact: true })).toBeVisible();

  const origem = `/projetos/${projetoId}`;
  const semRolagemLateral = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(origem);
  await page.getByRole("link", { name: "Duplicar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Duplicar projeto" })).toBeVisible();
  expect(await semRolagemLateral()).toBe(true);
  await page.getByRole("link", { name: "Cancelar", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${origem}$`));
  expect(await db.projeto.count({ where: { clienteId } })).toBe(1);

  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole("link", { name: "Duplicar", exact: true }).click();
  await expect(page.getByText(/a cópia inclui.*tarefas e subtarefas ativas/i)).toBeVisible();
  expect(await semRolagemLateral()).toBe(true);
  await page.getByRole("button", { name: "Duplicar projeto", exact: true }).click();
  await expect(page.getByRole("heading", { name: `Cópia de ${nome}`, exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Vistoria", exact: true })).toBeVisible();
  const copia = await db.projeto.findFirstOrThrow({ where: { clienteId, nome: `Cópia de ${nome}` } });
  await expect(page).toHaveURL(new RegExp(`/projetos/${copia.id}$`));
  expect(await semRolagemLateral()).toBe(true);
});
