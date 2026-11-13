/** Telas do colaborador interno (minhas tarefas, meus projetos, clientes): abrem e cabem no celular. */
import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { validarDestinosDeTeste } from "../integration/setup/banco-teste-seguro";

validarDestinosDeTeste(process.env.TEST_DATABASE_URL, process.env.TEST_APP_DATABASE_URL);
const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
const sufixo = randomBytes(6).toString("hex");
const email = `colab-${sufixo}@teste.local`;
const senha = "SenhaForte123!";
const token = randomBytes(32).toString("hex");
const nomeCliente = `Cliente colaborador ${sufixo}`;
let clienteId: string | undefined;
let usuarioId: string | undefined;
let projetoId: string | undefined;
let tarefaId: string | undefined;
let externoId: string | undefined;
const emailExterno = `externo-${sufixo}@teste.local`;
const tokenExterno = randomBytes(32).toString("hex");

test.beforeAll(async () => {
  const usuario = await db.usuario.create({ data: { nome: "Colaborador de teste", email, perfil: "ADMIN_INTERNO" } });
  usuarioId = usuario.id;
  await db.tokenAcesso.create({ data: {
    usuarioId, tipo: "DEFINIR_SENHA", tokenHash: createHash("sha256").update(token).digest("hex"),
    expiraEm: new Date(Date.now() + 3_600_000),
  } });
  const cliente = await db.cliente.create({ data: { razaoSocial: nomeCliente, segmento: "Teste", origemContato: "Teste" } });
  clienteId = cliente.id;
  const projeto = await db.projeto.create({ data: { clienteId, nome: `Projeto colaborador ${sufixo}`, status: "EM_ANDAMENTO", dataPrevistaConclusao: new Date("2030-01-10T00:00:00.000Z") } });
  projetoId = projeto.id;
  await db.atribuicao.create({ data: { usuarioId, entidadeTipo: "PROJETO", entidadeId: projeto.id } });
  const tarefa = await db.tarefa.create({ data: { projetoId, nome: `Tarefa colaborador ${sufixo}`, prazo: new Date("2030-01-05T00:00:00.000Z"), responsavelUsuarioId: usuarioId } });
  tarefaId = tarefa.id;
  await db.subtarefa.create({ data: { tarefaId, titulo: "Subtarefa do colaborador", atribuidoAUsuarioId: usuarioId } });
  // Colaborador externo: recebe a tarefa por atribuição.
  const externo = await db.usuario.create({ data: { nome: "Carlos de Teste", email: emailExterno, perfil: "ADMIN_EXTERNO" } });
  externoId = externo.id;
  await db.tokenAcesso.create({ data: {
    usuarioId: externoId, tipo: "DEFINIR_SENHA", tokenHash: createHash("sha256").update(tokenExterno).digest("hex"),
    expiraEm: new Date(Date.now() + 3_600_000),
  } });
  await db.atribuicao.create({ data: { usuarioId: externoId, entidadeTipo: "TAREFA", entidadeId: tarefaId } });
});

test.afterAll(async () => {
  if (clienteId) await db.cliente.delete({ where: { id: clienteId } });
  if (usuarioId) await db.usuario.delete({ where: { id: usuarioId } });
  if (externoId) await db.usuario.delete({ where: { id: externoId } });
  await db.$disconnect();
});

const semRolagemLateral = (page: import("@playwright/test").Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test("colaborador interno abre as telas e elas cabem no celular", async ({ page }) => {
  await page.goto(`/definir-senha?token=${token}`);
  await page.getByLabel("Nova senha").fill(senha);
  await page.getByLabel("Confirmar senha").fill(senha);
  await page.getByRole("button", { name: "Definir senha e entrar" }).click();
  await expect(page.getByRole("heading", { name: "Minhas tarefas", level: 1 })).toBeVisible();

  const telas: Array<[string, string]> = [
    ["/minhas-tarefas", "Minhas tarefas"],
    ["/meus-projetos", "Meus projetos"],
    [`/meus-projetos/${projetoId}`, `Projeto colaborador ${sufixo}`],
    [`/minhas-tarefas/${tarefaId}`, `Tarefa colaborador ${sufixo}`],
    ["/meus-clientes", "Clientes"],
    [`/meus-clientes/${clienteId}`, nomeCliente],
  ];
  for (const largura of [1024, 375]) {
    await page.setViewportSize({ width: largura, height: 800 });
    for (const [rota, titulo] of telas) {
      await page.goto(rota);
      await expect(page.getByRole("heading", { name: titulo, level: 1 })).toBeVisible();
      expect(await semRolagemLateral(page), `${rota} a ${largura} px`).toBe(true);
    }
  }

  // A lista de tarefas tem os filtros de situação e abre a tarefa pela linha.
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("/minhas-tarefas");
  await expect(page.getByRole("group", { name: "Situação do prazo" })).toBeVisible();
  await page.getByRole("link", { name: `Tarefa colaborador ${sufixo}` }).click();
  await expect(page.getByRole("region", { name: "Resumo da tarefa" })).toBeVisible();
});

test("colaborador externo vê a tela própria de tarefas e ela cabe no celular", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/definir-senha?token=${tokenExterno}`);
  await page.getByLabel("Nova senha").fill(senha);
  await page.getByLabel("Confirmar senha").fill(senha);
  await page.getByRole("button", { name: "Definir senha e entrar" }).click();
  await expect(page.getByRole("heading", { name: "Olá, Carlos", level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "Para fazer" })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(`Tarefa colaborador ${sufixo}`) })).toBeVisible();
  expect(await semRolagemLateral(page)).toBe(true);
  // Abrir a tarefa continua levando ao detalhe de sempre.
  await page.getByRole("link", { name: new RegExp(`Tarefa colaborador ${sufixo}`) }).click();
  await expect(page.getByRole("heading", { name: `Tarefa colaborador ${sufixo}`, level: 1 })).toBeVisible();
});
