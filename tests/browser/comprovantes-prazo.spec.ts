/**
 * Jornada da etapa 2 dos comprovantes: o prazo para de contar enquanto o envio aguarda conferência. O externo tem uma tarefa
 * com o prazo vencido e envio pendente com arquivo (em conferência) e outra vencida sem envio. Em conferência ela não é
 * atrasada e mostra "Enviado em dd/mm"; quando o interno devolve com motivo, o prazo volta a contar e ela passa a atrasada.
 * O envio já nasce no banco (sem passar pelo storage, que o CI não tem); a regra em si é coberta pelos testes unitários e
 * de integração. Análise aprovada: docs/analises/comprovantes-etapa2-prazo.md.
 */
import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { validarDestinosDeTeste } from "../integration/setup/banco-teste-seguro";

validarDestinosDeTeste(process.env.TEST_DATABASE_URL, process.env.TEST_APP_DATABASE_URL);
const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
const sufixo = randomBytes(6).toString("hex");
const senha = "SenhaForte123!";
const tokenExterno = randomBytes(32).toString("hex");
const tokenInterno = randomBytes(32).toString("hex");
const nomeEmConferencia = `Inventário enviado ${sufixo}`;
const nomeNormal = `Relatório sem envio ${sufixo}`;
let clienteId: string | undefined;
let tarefaEmConferenciaId = "";
let tarefaNormalId = "";

const semRolagemLateral = (page: import("@playwright/test").Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test.beforeAll(async () => {
  const cliente = await db.cliente.create({ data: { razaoSocial: `Cliente prazo ${sufixo}`, segmento: "Teste", origemContato: "Teste" } });
  clienteId = cliente.id;
  const projeto = await db.projeto.create({ data: { clienteId, nome: `Projeto prazo ${sufixo}`, status: "EM_ANDAMENTO" } });
  const externo = await db.usuario.create({ data: { nome: "Carlos Prazo", email: `externo-prazo-${sufixo}@teste.local`, perfil: "ADMIN_EXTERNO" } });
  const interno = await db.usuario.create({ data: { nome: "Ivone Prazo", email: `interno-prazo-${sufixo}@teste.local`, perfil: "ADMIN_INTERNO" } });
  for (const [usuarioId, token] of [[externo.id, tokenExterno], [interno.id, tokenInterno]] as const) {
    await db.tokenAcesso.create({ data: { usuarioId, tipo: "DEFINIR_SENHA", tokenHash: createHash("sha256").update(token).digest("hex"), expiraEm: new Date(Date.now() + 3_600_000) } });
  }
  await db.atribuicao.create({ data: { usuarioId: interno.id, entidadeTipo: "PROJETO", entidadeId: projeto.id } });

  const vencido = new Date("2020-01-10T00:00:00.000Z");
  const emConferencia = await db.tarefa.create({
    data: { projetoId: projeto.id, nome: nomeEmConferencia, prazo: vencido, status: "EM_ANDAMENTO", comprovanteExigido: true, comprovanteQuantidade: 1, responsavelUsuarioId: externo.id },
  });
  const normal = await db.tarefa.create({
    data: { projetoId: projeto.id, nome: nomeNormal, prazo: vencido, status: "EM_ANDAMENTO", responsavelUsuarioId: externo.id },
  });
  tarefaEmConferenciaId = emConferencia.id;
  tarefaNormalId = normal.id;
  for (const tarefa of [emConferencia, normal]) {
    await db.atribuicao.create({ data: { usuarioId: externo.id, entidadeTipo: "TAREFA", entidadeId: tarefa.id } });
  }
  // Envio com um comprovante, já pendente de conferência.
  const pedido = await db.solicitacaoConclusao.create({
    data: { tarefaId: emConferencia.id, solicitadoPorId: externo.id, solicitadoPorNome: "Carlos Prazo", statusAnterior: "EM_ANDAMENTO" },
  });
  await db.arquivoComprovante.create({
    data: { tarefaId: emConferencia.id, solicitacaoId: pedido.id, chave: `comprovantes/browser-prazo-${sufixo}.pdf`, nomeOriginal: "inventario.pdf", tipo: "application/pdf", tamanhoBytes: 2048, enviadoPorId: externo.id, enviadoPorNome: "Carlos Prazo" },
  });
});

test.afterAll(async () => {
  // O histórico de pedidos é imutável (inclusive pela chave estrangeira do autor): os pedidos saem antes dos usuários.
  await db.solicitacaoConclusao.deleteMany({ where: { tarefaId: { in: [tarefaEmConferenciaId, tarefaNormalId] } } });
  await db.usuario.deleteMany({ where: { email: { contains: sufixo } } });
  if (clienteId) await db.cliente.deleteMany({ where: { id: clienteId } });
  await db.$disconnect();
});

test("em conferência a tarefa vencida não é atrasada; devolvida, volta a contar", async ({ page, browser }) => {
  // ---- colaborador externo, no celular
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/definir-senha?token=${tokenExterno}`);
  await page.getByLabel("Nova senha").fill(senha);
  await page.getByLabel("Confirmar senha").fill(senha);
  await page.getByRole("button", { name: "Definir senha e entrar" }).click();
  await expect(page.getByRole("heading", { name: "Olá, Carlos", level: 1 })).toBeVisible();

  // Só a tarefa sem envio conta como atrasada; a que aguarda conferência mostra o dia do envio.
  const resumo = page.getByLabel("Resumo das tarefas");
  await expect(resumo).toContainText("1 atrasada");
  await expect(resumo).not.toContainText("2 atrasadas");
  await expect(resumo).toContainText("1 aguardando conferência");
  const aguardando = page.getByRole("region", { name: "Aguardando conferência" });
  await expect(aguardando).toContainText(nomeEmConferencia);
  await expect(aguardando).toContainText(/Enviado em \d{2}\/\d{2}/);
  await expect(aguardando).not.toContainText("Atrasado");
  const paraFazer = page.getByRole("region", { name: "Para fazer" });
  await expect(paraFazer).toContainText(nomeNormal);
  await expect(paraFazer).toContainText(/Atrasado \d+ dias/);
  expect(await semRolagemLateral(page)).toBe(true);

  // ---- colaborador interno do projeto, em outra sessão, devolve com motivo
  const contexto = await browser.newContext({ baseURL: "http://localhost:3105" });
  const paginaInterno = await contexto.newPage();
  await paginaInterno.setViewportSize({ width: 1024, height: 800 });
  await paginaInterno.goto(`/definir-senha?token=${tokenInterno}`);
  await paginaInterno.getByLabel("Nova senha").fill(senha);
  await paginaInterno.getByLabel("Confirmar senha").fill(senha);
  await paginaInterno.getByRole("button", { name: "Definir senha e entrar" }).click();
  await expect(paginaInterno.getByRole("heading", { name: /^(Bom dia|Boa tarde|Boa noite), Ivone$/, level: 1 })).toBeVisible();
  await paginaInterno.goto(`/minhas-tarefas/${tarefaEmConferenciaId}`);
  // Na página do item o prazo também mostra o envio, e não o atraso.
  await expect(paginaInterno.getByText(/Enviado em \d{2}\/\d{2}/).first()).toBeVisible();
  await paginaInterno.getByRole("button", { name: "Devolver para correção" }).click();
  await paginaInterno.getByLabel(/Motivo \(obrigatório para devolver\)/).fill("O inventário está sem a assinatura.");
  await paginaInterno.getByRole("button", { name: "Devolver para correção" }).click();
  await expect(paginaInterno.getByText("Devolvido para correção", { exact: true })).toBeVisible();
  await contexto.close();

  // ---- devolvida, o prazo volta a contar: as duas tarefas vencidas são atrasadas
  await page.goto("/minhas-tarefas");
  await expect(page.getByLabel("Resumo das tarefas")).toContainText("2 atrasadas");
  const devolvidas = page.getByRole("region", { name: "Devolvidas para correção" });
  await expect(devolvidas).toContainText(nomeEmConferencia);
  await expect(devolvidas).toContainText(/Atrasado \d+ dias/);
  await expect(devolvidas).not.toContainText("Enviado em");
  expect(await semRolagemLateral(page)).toBe(true);
});
