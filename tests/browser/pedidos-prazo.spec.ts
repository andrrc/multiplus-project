import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { validarDestinosDeTeste } from "../integration/setup/banco-teste-seguro";

validarDestinosDeTeste(process.env.TEST_DATABASE_URL, process.env.TEST_APP_DATABASE_URL);
const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
const sufixo = randomBytes(6).toString("hex");
const tokens = [randomBytes(32).toString("hex"), randomBytes(32).toString("hex")];
const senha = "SenhaForte123!";
const nomeTarefa = `Vistoria de campo ${sufixo}`;
const ano = new Date().getUTCFullYear() + 1;
const novaData = `${ano}-02-01`;
const resposta = "A nova data foi confirmada com a equipe.";
let tarefaId: string;
let clienteId: string;

async function entrar(page: Page, token: string) {
  await page.goto(`/definir-senha?token=${token}`);
  await page.getByLabel("Nova senha").fill(senha);
  await page.getByLabel("Confirmar senha").fill(senha);
  await page.getByRole("button", { name: "Definir senha e entrar" }).click();
}

async function conferirRolagem(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

test.beforeAll(async () => {
  const [externo, interno] = await Promise.all([
    db.usuario.create({ data: { nome: "Carlos Prazo", email: `externo-pedido-${sufixo}@teste.local`, perfil: "ADMIN_EXTERNO" } }),
    db.usuario.create({ data: { nome: "Ivone Prazo", email: `interno-pedido-${sufixo}@teste.local`, perfil: "ADMIN_INTERNO" } }),
  ]);
  for (const [i, usuario] of [externo, interno].entries()) {
    await db.tokenAcesso.create({ data: {
      usuarioId: usuario.id, tokenHash: createHash("sha256").update(tokens[i]).digest("hex"),
      tipo: "DEFINIR_SENHA", expiraEm: new Date(Date.now() + 3_600_000),
    } });
  }
  clienteId = (await db.cliente.create({ data: { razaoSocial: `Cliente ${sufixo}`, segmento: "Teste", origemContato: "Teste" } })).id;
  const projeto = await db.projeto.create({ data: { clienteId, nome: `Projeto ${sufixo}` } });
  tarefaId = (await db.tarefa.create({ data: {
    nome: nomeTarefa, projetoId: projeto.id, prazo: new Date(`${ano}-01-31T00:00:00Z`),
    responsavelUsuarioId: externo.id, status: "EM_ANDAMENTO",
  } })).id;
  await db.atribuicao.createMany({ data: [
    { usuarioId: externo.id, entidadeTipo: "TAREFA", entidadeId: tarefaId },
    { usuarioId: interno.id, entidadeTipo: "PROJETO", entidadeId: projeto.id },
  ] });
});

test.afterAll(async () => {
  if (tarefaId) await db.pedidoPrazo.deleteMany({ where: { tarefaId } });
  await db.usuario.deleteMany({ where: { email: { contains: sufixo } } });
  if (clienteId) await db.cliente.delete({ where: { id: clienteId } });
  await db.$disconnect();
});

test("o externo pede pelo celular, o coordenador aprova no desktop e o externo vê o novo prazo", async ({ page, browser, baseURL }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await entrar(page, tokens[0]);
  await expect(page.getByRole("heading", { name: "Olá, Carlos", level: 1 })).toBeVisible();
  await page.getByRole("link", { name: nomeTarefa, exact: false }).click();
  await expect(page.getByRole("heading", { name: nomeTarefa, level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Não consigo cumprir este prazo" }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo).toBeVisible();
  await dialogo.getByLabel("Nova data").fill(novaData);
  await dialogo.getByLabel("Motivo").fill("A equipe precisa de mais um dia para realizar a vistoria.");
  await conferirRolagem(page);
  await dialogo.getByRole("button", { name: "Enviar pedido" }).click();
  await expect(page.getByRole("heading", { name: "Pedido de prazo: aguardando decisão" })).toBeVisible();
  await expect(dialogo).toBeHidden();
  await expect.poll(() => db.notificacao.count({
    where: { evento: "PEDIDO_PRAZO_RECEBIDO", usuario: { email: `interno-pedido-${sufixo}@teste.local` } },
  })).toBe(1);
  await conferirRolagem(page);

  const sessao = await browser.newContext({ baseURL, viewport: { width: 1280, height: 800 } });
  try {
    const coordenador = await sessao.newPage();
    await entrar(coordenador, tokens[1]);
    await expect(coordenador.getByRole("heading", { name: "Aguardando sua decisão" })).toBeVisible();
    await coordenador.getByRole("link", { name: nomeTarefa, exact: true }).first().click();
    await expect(coordenador.getByRole("heading", { name: "Pedido de prazo: aguardando decisão" })).toBeVisible();
    await coordenador.getByLabel("Resposta").fill(resposta);
    await coordenador.getByRole("button", { name: "Aprovar", exact: true }).click();
    await expect(coordenador.getByRole("heading", { name: "Pedido de prazo: aprovado" })).toBeVisible();
    await conferirRolagem(coordenador);
  } finally {
    await sessao.close();
  }

  await page.reload();
  await expect(page.getByRole("heading", { name: "Pedido de prazo: aprovado" })).toBeVisible();
  await expect(page.getByText(resposta, { exact: false })).toBeVisible();
  await expect.poll(() => db.notificacao.count({
    where: {
      evento: "PEDIDO_PRAZO_RESPONDIDO", mensagem: { contains: resposta },
      usuario: { email: `externo-pedido-${sufixo}@teste.local` },
    },
  })).toBe(1);
  await expect(page.getByText(`01/02/${ano}`, { exact: true }).first()).toBeVisible();
  await conferirRolagem(page);
});
