/**
 * Jornada do comprovante: o colaborador externo envia, o interno do projeto devolve com motivo e o externo vê a devolução.
 * Os arquivos já nascem como rascunho no banco (sem passar pelo storage, que o CI não tem); a subida real de arquivo para o
 * MinIO e a conferência do conteúdo são cobertas pelos testes de integração e unitários.
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
const nomeTarefa = `Fotos mensais ${sufixo}`;
let clienteId: string | undefined;
let externoId = "";
let tarefaId = "";

const semRolagemLateral = (page: import("@playwright/test").Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test.beforeAll(async () => {
  const cliente = await db.cliente.create({ data: { razaoSocial: `Cliente comprovantes ${sufixo}`, segmento: "Teste", origemContato: "Teste" } });
  clienteId = cliente.id;
  const projeto = await db.projeto.create({ data: { clienteId, nome: `Projeto comprovantes ${sufixo}`, status: "EM_ANDAMENTO" } });
  const externo = await db.usuario.create({ data: { nome: "Carlos Comprovante", email: `externo-comprovante-${sufixo}@teste.local`, perfil: "ADMIN_EXTERNO" } });
  externoId = externo.id;
  const interno = await db.usuario.create({ data: { nome: "Ivone Interna", email: `interno-comprovante-${sufixo}@teste.local`, perfil: "ADMIN_INTERNO" } });
  for (const [usuarioId, token] of [[externo.id, tokenExterno], [interno.id, tokenInterno]] as const) {
    await db.tokenAcesso.create({ data: { usuarioId, tipo: "DEFINIR_SENHA", tokenHash: createHash("sha256").update(token).digest("hex"), expiraEm: new Date(Date.now() + 3_600_000) } });
  }
  await db.atribuicao.create({ data: { usuarioId: interno.id, entidadeTipo: "PROJETO", entidadeId: projeto.id } });
  const tarefa = await db.tarefa.create({
    data: {
      projetoId: projeto.id,
      nome: nomeTarefa,
      prazo: new Date("2031-05-10T00:00:00.000Z"),
      periodicidade: "MENSAL",
      comprovanteExigido: true,
      comprovanteQuantidade: 2,
      comprovanteInstrucoes: ["Plaqueta do equipamento visível", "Painel de controle aceso"],
    },
  });
  tarefaId = tarefa.id;
  await db.atribuicao.create({ data: { usuarioId: externo.id, entidadeTipo: "TAREFA", entidadeId: tarefa.id } });
  await db.tarefa.update({ where: { id: tarefa.id }, data: { responsavelUsuarioId: externo.id } });
  // Três arquivos anexados e ainda não enviados: o teste remove um e envia os dois restantes.
  for (let i = 1; i <= 3; i += 1) {
    await db.arquivoComprovante.create({ data: { tarefaId: tarefa.id, chave: `comprovantes/browser-${sufixo}-${i}.pdf`, nomeOriginal: `caldeira-${i}.pdf`, tipo: "application/pdf", tamanhoBytes: 2048 * i, enviadoPorId: externo.id, enviadoPorNome: "Carlos Comprovante" } });
  }
});

test.afterAll(async () => {
  // O histórico de pedidos é imutável (inclusive pela chave estrangeira do autor): os pedidos saem antes dos usuários.
  await db.solicitacaoConclusao.deleteMany({ where: { tarefaId } });
  await db.usuario.deleteMany({ where: { email: { contains: sufixo } } });
  if (clienteId) await db.cliente.deleteMany({ where: { id: clienteId } });
  await db.$disconnect();
});

test("o externo envia o comprovante, o interno devolve com motivo e o externo vê a devolução", async ({ page, browser }) => {
  // ---- colaborador externo, no celular
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/definir-senha?token=${tokenExterno}`);
  await page.getByLabel("Nova senha").fill(senha);
  await page.getByLabel("Confirmar senha").fill(senha);
  await page.getByRole("button", { name: "Definir senha e entrar" }).click();
  await expect(page.getByRole("heading", { name: "Olá, Carlos", level: 1 })).toBeVisible();
  const cartao = page.getByRole("link", { name: new RegExp(nomeTarefa) });
  await expect(cartao).toContainText("2 fotos ou arquivos");
  await cartao.click();

  await expect(page.getByRole("heading", { name: "Enviar comprovante", level: 2 })).toBeVisible();
  await expect(page.getByText("Plaqueta do equipamento visível")).toBeVisible();
  await expect(page.getByText(/Evite fotografar pessoas, placas de veículos/)).toBeVisible();
  await expect(page.getByText("3 de 2 arquivos exigidos")).toBeVisible();
  expect(await semRolagemLateral(page)).toBe(true);

  // Remover um arquivo mantém a contagem e o botão de enviar depende da quantidade exigida.
  await page.getByRole("button", { name: "Remover caldeira-3.pdf" }).click();
  await expect(page.getByText("2 de 2 arquivos exigidos")).toBeVisible();
  await page.getByRole("button", { name: "Remover caldeira-2.pdf" }).click();
  await expect(page.getByText("1 de 2 arquivos exigidos")).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar comprovante" })).toBeDisabled();
  // O rascunho removido continua removido ao recarregar (a remoção chegou ao banco).
  await page.reload();
  await expect(page.getByText("1 de 2 arquivos exigidos")).toBeVisible();
  await db.arquivoComprovante.create({ data: { tarefaId, chave: `comprovantes/browser-${sufixo}-4.pdf`, nomeOriginal: "caldeira-4.pdf", tipo: "application/pdf", tamanhoBytes: 4096, enviadoPorId: externoId, enviadoPorNome: "Carlos Comprovante" } });
  await page.reload();
  await expect(page.getByText("2 de 2 arquivos exigidos")).toBeVisible();

  await page.getByLabel("Observação (opcional)").fill("A caldeira estava em manutenção preventiva.");
  await page.getByRole("button", { name: "Enviar comprovante" }).click();
  await expect(page.getByRole("heading", { name: "Comprovantes da tarefa", level: 3 })).toBeVisible();
  await expect(page.getByText("Aguardando conferência").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Enviar comprovante", level: 2 })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /caldeira-1\.pdf/ })).toBeVisible();
  expect(await db.arquivoComprovante.count({ where: { tarefaId, solicitacaoId: { not: null } } })).toBe(2);
  expect(await db.arquivoComprovante.count({ where: { tarefaId, solicitacaoId: null } })).toBe(0);

  // Na lista, a tarefa passa para "Aguardando conferência".
  await page.goto("/minhas-tarefas");
  await expect(page.getByRole("region", { name: "Aguardando conferência" })).toContainText(nomeTarefa);

  // ---- colaborador interno do projeto, em outra sessão
  const contexto = await browser.newContext({ baseURL: "http://localhost:3105" });
  const paginaInterno = await contexto.newPage();
  await paginaInterno.setViewportSize({ width: 1024, height: 800 });
  await paginaInterno.goto(`/definir-senha?token=${tokenInterno}`);
  await paginaInterno.getByLabel("Nova senha").fill(senha);
  await paginaInterno.getByLabel("Confirmar senha").fill(senha);
  await paginaInterno.getByRole("button", { name: "Definir senha e entrar" }).click();
  await expect(paginaInterno.getByRole("heading", { name: /^(Bom dia|Boa tarde|Boa noite), Ivone$/, level: 1 })).toBeVisible();
  await paginaInterno.goto(`/minhas-tarefas/${tarefaId}`);
  await expect(paginaInterno.getByRole("heading", { name: "Comprovantes da tarefa", level: 3 })).toBeVisible();
  await expect(paginaInterno.getByText("A caldeira estava em manutenção preventiva.")).toBeVisible();
  await expect(paginaInterno.getByRole("link", { name: /caldeira-1\.pdf/ })).toBeVisible();

  // Devolver exige o motivo: sem ele, o formulário não segue.
  await paginaInterno.getByRole("button", { name: "Devolver para correção" }).click();
  await expect(paginaInterno.getByText("Aguardando conferência").first()).toBeVisible();
  await paginaInterno.getByLabel(/Motivo \(obrigatório para devolver\)/).fill("A plaqueta não aparece nos arquivos.");
  await paginaInterno.getByRole("button", { name: "Devolver para correção" }).click();
  await expect(paginaInterno.getByText("Devolvido para correção", { exact: true })).toBeVisible();
  await expect(paginaInterno.getByText("A plaqueta não aparece nos arquivos.").first()).toBeVisible();
  await contexto.close();

  // ---- o externo vê a devolução na lista e no item, com o motivo, e pode enviar de novo
  await page.goto("/minhas-tarefas");
  const devolvidas = page.getByRole("region", { name: "Devolvidas para correção" });
  await expect(devolvidas).toContainText(nomeTarefa);
  await expect(devolvidas).toContainText("A plaqueta não aparece nos arquivos.");
  expect(await semRolagemLateral(page)).toBe(true);
  await devolvidas.getByRole("link", { name: new RegExp(nomeTarefa) }).click();
  await expect(page.getByRole("heading", { name: "Enviar comprovante", level: 2 })).toBeVisible();
  await expect(page.getByText("Devolvido para correção:").first()).toBeVisible();
  await expect(page.getByText("0 de 2 arquivos exigidos")).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar comprovante" })).toBeDisabled();
  expect(await semRolagemLateral(page)).toBe(true);
});
