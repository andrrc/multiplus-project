import { afterAll, beforeAll, expect, it } from "vitest";
import { duplicarProjeto } from "@/lib/duplicar-projeto";
import { prismaApp } from "@/lib/prisma-app";
import { comoUsuario, fecharConexoes, ownerDb } from "./setup/helpers";

const perfis = ["ADMIN", "ADMIN_INTERNO", "ADMIN_EXTERNO", "CLIENTE"] as const;
const usuarios = new Map<(typeof perfis)[number], string>();
const sufixo = Date.now();
const nomeAdmin = "Admin da duplicação";
const prazo = new Date("2030-04-08T00:00:00Z");
const comprovante = {
  comprovanteExigido: true,
  comprovanteQuantidade: 1,
  comprovanteInstrucoes: ["Foto da placa"],
};
let clienteId: string;
let outroClienteId: string;
let projetoId: string;
let inativoId: string;

const relacoes = {
  documentos: true,
  comentarios: true,
  valorContratado: true,
  tarefas: {
    orderBy: { numeroLocal: "asc" as const },
    include: {
      arquivosComprovante: true, solicitacoesConclusao: true, comentarios: true,
      subtarefas: { orderBy: { numeroLocal: "asc" as const } },
    },
  },
};

const contexto = (perfil: (typeof perfis)[number]) => ({ perfil, usuarioId: usuarios.get(perfil)! });
const buscar = (id: string) => ownerDb.projeto.findUniqueOrThrow({ where: { id }, include: relacoes });

beforeAll(async () => {
  for (const perfil of perfis) {
    const usuario = await ownerDb.usuario.create({
      data: { perfil, nome: perfil === "ADMIN" ? nomeAdmin : perfil, email: `duplicar-${perfil}-${sufixo}@teste.local` },
    });
    usuarios.set(perfil, usuario.id);
  }
  const cliente = await ownerDb.cliente.create({
    data: { razaoSocial: "Cliente da duplicação", segmento: "Teste", origemContato: "Teste" },
  });
  clienteId = cliente.id;
  outroClienteId = (await ownerDb.cliente.create({
    data: { razaoSocial: "Outro cliente", segmento: "Teste", origemContato: "Teste" },
  })).id;
  const projeto = await ownerDb.projeto.create({
    data: {
      clienteId, nome: "Licenciamento", descricao: "Descrição do projeto", status: "CONCLUIDO",
      dataInicio: prazo, dataPrevistaConclusao: prazo, numeroProposta: "12/2030",
      valorContratado: { create: { valorContratado: 500 } },
      comentarios: { create: { autorId: contexto("ADMIN").usuarioId, texto: "Comentário interno" } },
    },
  });
  projetoId = projeto.id;
  inativoId = (await ownerDb.projeto.create({ data: { clienteId, nome: "Arquivado", ativo: false } })).id;
  await ownerDb.documento.create({ data: { clienteId, projetoId, nome: "Documento", link: "https://example.test/documento" } });

  const responsavelUsuarioId = contexto("ADMIN_EXTERNO").usuarioId;
  const tarefa = await ownerDb.tarefa.create({
    data: {
      projetoId, nome: "Vistoria", descricao: "Descrição da tarefa", status: "CONCLUIDO",
      prazo, periodicidade: "SEMANAL", diaSemana: 1, serieId: "série de vistoria",
      prazoOriginal: prazo, serieEncerradaEm: prazo, diasAntecedencia: 3,
      responsavelUsuarioId, colaboradorPodeCriarSubtarefas: true, ...comprovante,
      subtarefas: { create: [
        { titulo: "Fotografar", descricao: "Fachada", prazo, status: "CONCLUIDO", etiquetas: ["Visita"], atribuidoAUsuarioId: responsavelUsuarioId, ...comprovante },
        { titulo: "Subtarefa desativada", ativo: false },
      ] },
      comentarios: { create: { autorId: responsavelUsuarioId, texto: "Comentário da tarefa" } },
    },
  });
  await ownerDb.tarefa.create({ data: { projetoId, nome: "Tarefa desativada", ativo: false } });
  await ownerDb.tarefa.create({
    data: { projetoId, nome: "Revisão", subtarefas: { create: { titulo: "Conferir" } } },
  });
  const pedido = await ownerDb.solicitacaoConclusao.create({
    data: { tarefaId: tarefa.id, solicitadoPorNome: "Colaborador", statusAnterior: "A_INICIAR" },
  });
  await ownerDb.arquivoComprovante.create({
    data: { tarefaId: tarefa.id, solicitacaoId: pedido.id, chave: `duplicar/${sufixo}`, nomeOriginal: "foto.png", tipo: "image/png", tamanhoBytes: 1024, enviadoPorNome: "Colaborador" },
  });
});

afterAll(async () => {
  try {
    if (clienteId) await ownerDb.cliente.delete({ where: { id: clienteId } });
    if (outroClienteId) await ownerDb.cliente.delete({ where: { id: outroClienteId } });
    await ownerDb.usuario.deleteMany({ where: { id: { in: [...usuarios.values()] } } });
  } finally {
    await prismaApp.$disconnect();
    await fecharConexoes();
  }
});

it("duplica só os itens ativos com nova numeração e preserva o original", async () => {
  const original = await buscar(projetoId);
  const novo = await duplicarProjeto(contexto("ADMIN"), projetoId, clienteId);
  const copia = await buscar(novo.id);
  expect(copia).toMatchObject({
    clienteId, nome: "Cópia de Licenciamento", descricao: "Descrição do projeto",
    numeroLocal: 3, ativo: true, status: "A_INICIAR", numeroProposta: null,
    dataInicio: null, dataPrevistaConclusao: null, valorContratado: null,
    documentos: [], comentarios: [],
  });
  expect(copia.tarefas.map(({ nome, numeroLocal }) => [nome, numeroLocal])).toEqual([["Vistoria", 1], ["Revisão", 2]]);
  const tarefa = copia.tarefas[0];
  expect(tarefa).toMatchObject({
    descricao: "Descrição da tarefa", ativo: true, status: "A_INICIAR", prazo: null,
    periodicidade: null, diaSemana: null, serieId: null, prazoOriginal: null, serieEncerradaEm: null,
    responsavelId: null, responsavelUsuarioId: null, diasAntecedencia: 3,
    colaboradorPodeCriarSubtarefas: true, ...comprovante, criadoPorNome: nomeAdmin,
    criadoPorId: contexto("ADMIN").usuarioId, arquivosComprovante: [], solicitacoesConclusao: [], comentarios: [],
  });
  expect(tarefa.subtarefas).toHaveLength(1);
  expect(tarefa.subtarefas[0]).toMatchObject({
    titulo: "Fotografar", descricao: "Fachada", ativo: true, numeroLocal: 1, etiquetas: ["Visita"],
    prazo: null, status: "EM_ANDAMENTO", atribuidoAId: null, atribuidoAUsuarioId: null,
    ...comprovante, criadoPorNome: nomeAdmin, criadoPorId: contexto("ADMIN").usuarioId,
  });
  expect(copia.tarefas[1].subtarefas.map(({ titulo, numeroLocal }) => [titulo, numeroLocal])).toEqual([["Conferir", 1]]);
  expect(await buscar(projetoId)).toEqual(original);
});

it.each(perfis.slice(1))("recusa %s no domínio e na política de criação do projeto", async (perfil) => {
  const ctx = contexto(perfil);
  await expect(duplicarProjeto(ctx, projetoId, clienteId)).rejects.toThrow("Ação restrita ao Administrador.");
  await expect(comoUsuario(ctx, (tx) => tx.projeto.create({ data: { clienteId, nome: "Cópia indevida" } })))
    .rejects.toThrow(/row-level security policy/i);
});

it("recusa projeto desativado, inexistente ou de outro cliente", async () => {
  const ctx = contexto("ADMIN");
  for (const [id, cliente] of [[inativoId, clienteId], ["inexistente", clienteId], [projetoId, outroClienteId]]) {
    await expect(duplicarProjeto(ctx, id, cliente)).rejects.toThrow("Projeto ativo não encontrado neste cliente.");
  }
});

it("reverte o projeto e as tarefas se a gravação de uma subtarefa falhar", async () => {
  const antes = await ownerDb.projeto.findMany({ where: { clienteId }, select: { id: true }, orderBy: { id: "asc" } });
  // NOT VALID preserva a subtarefa original e força o erro somente ao tentar gravar a cópia.
  await ownerDb.$executeRaw`ALTER TABLE "subtarefas" ADD CONSTRAINT "teste_falha_duplicacao" CHECK ("titulo" <> 'Conferir') NOT VALID`;
  try {
    await expect(duplicarProjeto(contexto("ADMIN"), projetoId, clienteId)).rejects.toThrow(/teste_falha_duplicacao/);
    expect(await ownerDb.projeto.findMany({ where: { clienteId }, select: { id: true }, orderBy: { id: "asc" } })).toEqual(antes);
  } finally {
    await ownerDb.$executeRaw`ALTER TABLE "subtarefas" DROP CONSTRAINT "teste_falha_duplicacao"`;
  }
});
