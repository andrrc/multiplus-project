import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarSubtarefa, criarTarefa } from "@/lib/projetos-tarefas";
import { ownerDb, limparFixtures, fecharConexoes } from "./setup/helpers";

const admin = { usuarioId: "", perfil: "ADMIN" as const };
const responsavel = { usuarioId: "", perfil: "ADMIN_EXTERNO" as const };
const outroColaborador = { usuarioId: "", perfil: "ADMIN_EXTERNO" as const };
let projetoId: string;
let tarefaPermitidaId: string;
let tarefaSemPermissaoId: string;

beforeAll(async () => {
  await limparFixtures();
  const cliente = await ownerDb.cliente.create({
    data: { razaoSocial: "Cliente permissão subtarefas", cnpj: "44444444000100", segmento: "Industrial", origemContato: "Teste" },
  });
  const projeto = await ownerDb.projeto.create({ data: { clienteId: cliente.id, nome: "Projeto permissão subtarefas" } });
  projetoId = projeto.id;

  const [usuarioAdmin, usuarioResponsavel, usuarioOutro] = await Promise.all([
    ownerDb.usuario.create({ data: { nome: "Talita", email: "talita.permissao-subtarefa@teste.local", perfil: "ADMIN" } }),
    ownerDb.usuario.create({ data: { nome: "Colaborador responsável", email: "responsavel.permissao-subtarefa@teste.local", perfil: "ADMIN_EXTERNO" } }),
    ownerDb.usuario.create({ data: { nome: "Outro colaborador", email: "outro.permissao-subtarefa@teste.local", perfil: "ADMIN_EXTERNO" } }),
  ]);
  admin.usuarioId = usuarioAdmin.id;
  responsavel.usuarioId = usuarioResponsavel.id;
  outroColaborador.usuarioId = usuarioOutro.id;

  const prazo = new Date("2026-12-31T12:00:00.000Z");
  const tarefaPermitida = await criarTarefa(admin, {
    projetoId, nome: "Tarefa com permissão", prazo,
    responsavelUsuarioId: responsavel.usuarioId,
    colaboradorPodeCriarSubtarefas: true,
  });
  tarefaPermitidaId = tarefaPermitida.id;
  const tarefaSemPermissao = await criarTarefa(admin, {
    projetoId, nome: "Tarefa sem permissão", prazo,
    responsavelUsuarioId: responsavel.usuarioId,
    colaboradorPodeCriarSubtarefas: false,
  });
  tarefaSemPermissaoId = tarefaSemPermissao.id;
});

afterAll(async () => {
  await limparFixtures();
  await fecharConexoes();
});

describe("permissão e auditoria de subtarefas criadas por colaboradores", () => {
  it("registra administradora, data e hora ao criar a tarefa e persiste a permissão escolhida", async () => {
    const tarefa = await ownerDb.tarefa.findUniqueOrThrow({ where: { id: tarefaPermitidaId } });
    expect(tarefa.colaboradorPodeCriarSubtarefas).toBe(true);
    expect(tarefa.criadoPorId).toBe(admin.usuarioId);
    expect(tarefa.criadoPorNome).toBe("Talita");
    expect(tarefa.criadoEm).toBeInstanceOf(Date);
  });

  it("permite ao responsável criar uma subtarefa e registra o colaborador e o horário", async () => {
    const criadaEmAntes = new Date();
    const subtarefa = await criarSubtarefa(responsavel, {
      tarefaId: tarefaPermitidaId,
      titulo: "Etapa criada pelo colaborador",
    });
    const salva = await ownerDb.subtarefa.findUniqueOrThrow({ where: { id: subtarefa.id } });

    expect(salva.atribuidoAUsuarioId).toBe(responsavel.usuarioId);
    expect(salva.criadoPorId).toBe(responsavel.usuarioId);
    expect(salva.criadoPorNome).toBe("Colaborador responsável");
    expect(salva.criadoEm.getTime()).toBeGreaterThanOrEqual(criadaEmAntes.getTime() - 1000);
  });

  it("nega a criação quando a administradora não habilitou a permissão", async () => {
    await expect(criarSubtarefa(responsavel, {
      tarefaId: tarefaSemPermissaoId,
      titulo: "Não deve ser criada",
    })).rejects.toThrow("Você não tem permissão para criar subtarefas nesta tarefa.");
  });

  it("nega a criação a outro colaborador mesmo com a permissão habilitada", async () => {
    await expect(criarSubtarefa(outroColaborador, {
      tarefaId: tarefaPermitidaId,
      titulo: "Não deve ser criada por outro colaborador",
    })).rejects.toThrow("Você não tem permissão para criar subtarefas nesta tarefa.");
  });
});
