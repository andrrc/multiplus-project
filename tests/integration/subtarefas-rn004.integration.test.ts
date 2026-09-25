/**
 * RF-021 / RN-004 — "Apenas a pessoa atribuída a uma subtarefa específica,
 * ou o Administrador (Talita), pode marcá-la como concluída — mesmo que
 * outra pessoa tenha acesso à tarefa/projeto".
 * Módulo SRS: Projetos e Tarefas (extensão) — Seção 3.9.
 *
 * Pós-ADR-007: `Subtarefa.atribuidoAId` referencia `PessoaEnvolvida`, não mais `Usuario`
 * direto. A verificação de RLS/trigger agora precisa do salto adicional Usuario ->
 * usuarios.pessoaEnvolvidaId (reverso) -> comparar com atribuidoAId — exatamente o tipo de
 * bug fácil de quebrar silenciosamente que o RF-021 da Sprint 1 já teve (memória do
 * projeto). Cobre os dois mecanismos que aplicam a regra: a política de RLS de UPDATE
 * (quem chega a enxergar a linha pra tentar alterar) e a trigger
 * `subtarefas_enforce_rn004` (quem, mesmo enxergando a linha, pode de fato mudar o campo
 * "concluida"). Ver prisma/migrations/20260910191124_pessoas_envolvidas_adr007.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { StatusSubtarefa, StatusTarefa } from "@prisma/client";
import { ownerDb, comoUsuario, limparFixtures, fecharConexoes } from "./setup/helpers";

let tarefaX: { id: string };
let projetoX: { id: string; clienteId: string };
let pessoaEnvolvidaResponsavel: { id: string };

let usuarioAdmin: { id: string };
let usuarioResponsavel: { id: string };
let usuarioAdminInternoDono: { id: string };
let usuarioAdminExternoMesmaTarefa: { id: string };
let usuarioEquipeResponsavel: { id: string };

async function criarSubtarefaAtribuida() {
  return ownerDb.subtarefa.create({
    data: {
      tarefaId: tarefaX.id,
      titulo: "Enviar documento X",
      atribuidoAId: pessoaEnvolvidaResponsavel.id,
    },
  });
}

async function criarSubtarefaAtribuidaAEquipe() {
  return ownerDb.subtarefa.create({
    data: {
      tarefaId: tarefaX.id,
      titulo: "Revisar parecer técnico",
      atribuidoAUsuarioId: usuarioEquipeResponsavel.id,
    },
  });
}

beforeAll(async () => {
  await limparFixtures();

  const cliente = await ownerDb.cliente.create({
    data: {
      razaoSocial: "Cliente RN004 Ltda",
      cnpj: "33333333000103",
      segmento: "Industrial",
      origemContato: "Indicação",
    },
  });
  projetoX = await ownerDb.projeto.create({
    data: { clienteId: cliente.id, nome: "Projeto RN-004" },
  });
  tarefaX = await ownerDb.tarefa.create({
    data: { projetoId: projetoX.id, nome: "Tarefa RN-004" },
  });

  usuarioAdmin = await ownerDb.usuario.create({
    data: { nome: "Talita", email: "talita.rn004@teste.local", perfil: "ADMIN" },
  });

  // Pessoa Envolvida com acesso (ADR-007): o Usuario vinculado é quem loga; a subtarefa é
  // atribuída à PessoaEnvolvida, não direto ao Usuario.
  pessoaEnvolvidaResponsavel = await ownerDb.pessoaEnvolvida.create({
    data: { clienteId: cliente.id, tipo: "PESSOA", nome: "Responsável pela subtarefa", temAcesso: true },
  });
  usuarioResponsavel = await ownerDb.usuario.create({
    data: {
      nome: "Responsável pela subtarefa",
      email: "responsavel.rn004@teste.local",
      perfil: "ADMIN_EXTERNO",
      pessoaEnvolvidaId: pessoaEnvolvidaResponsavel.id,
    },
  });

  usuarioAdminInternoDono = await ownerDb.usuario.create({
    data: { nome: "Dono do projeto", email: "dono-projeto.rn004@teste.local", perfil: "ADMIN_INTERNO" },
  });
  usuarioAdminExternoMesmaTarefa = await ownerDb.usuario.create({
    data: { nome: "Colega na mesma tarefa", email: "colega-tarefa.rn004@teste.local", perfil: "ADMIN_EXTERNO" },
  });
  usuarioEquipeResponsavel = await ownerDb.usuario.create({
    data: { nome: "Técnica responsável", email: "tecnica.rn004@teste.local", perfil: "ADMIN_INTERNO" },
  });

  // usuarioAdminInternoDono tem acesso à tarefa via atribuição de PROJETO (RF-018) —
  // mas não é o atribuído da subtarefa.
  await ownerDb.atribuicao.create({
    data: { usuarioId: usuarioAdminInternoDono.id, entidadeTipo: "PROJETO", entidadeId: projetoX.id },
  });

  // usuarioAdminExternoMesmaTarefa tem acesso à MESMA tarefa (RF-019) — mas também
  // não é o atribuído da subtarefa.
  await ownerDb.atribuicao.create({
    data: { usuarioId: usuarioAdminExternoMesmaTarefa.id, entidadeTipo: "TAREFA", entidadeId: tarefaX.id },
  });
});

afterAll(async () => {
  await limparFixtures();
  await fecharConexoes();
});

it("a pessoa atribuída à subtarefa (via PessoaEnvolvida) consegue marcar concluida=true", async () => {
  const subtarefa = await criarSubtarefaAtribuida();

  const atualizada = await comoUsuario(
    { usuarioId: usuarioResponsavel.id, perfil: "ADMIN_EXTERNO" },
    (tx) => tx.subtarefa.update({ where: { id: subtarefa.id }, data: { status: StatusSubtarefa.CONCLUIDO } }),
  );

  expect(atualizada.status).toBe(StatusSubtarefa.CONCLUIDO);
});

it("integrante da equipe atribuído diretamente também consegue concluir a própria subtarefa", async () => {
  const subtarefa = await criarSubtarefaAtribuidaAEquipe();

  const atualizada = await comoUsuario(
    { usuarioId: usuarioEquipeResponsavel.id, perfil: "ADMIN_INTERNO" },
    (tx) => tx.subtarefa.update({ where: { id: subtarefa.id }, data: { status: StatusSubtarefa.CONCLUIDO } }),
  );

  expect(atualizada.status).toBe(StatusSubtarefa.CONCLUIDO);
});

it("integrante da equipe responsável não consegue editar a subtarefa nem reabri-la", async () => {
  const subtarefa = await criarSubtarefaAtribuidaAEquipe();
  const ctx = { usuarioId: usuarioEquipeResponsavel.id, perfil: "ADMIN_INTERNO" as const };

  await expect(
    comoUsuario(ctx, (tx) => tx.subtarefa.update({ where: { id: subtarefa.id }, data: { titulo: "Alteração indevida" } })),
  ).rejects.toThrow(/RN-004/);

  await comoUsuario(ctx, (tx) => tx.subtarefa.update({ where: { id: subtarefa.id }, data: { status: StatusSubtarefa.CONCLUIDO } }));
  await expect(
    comoUsuario(ctx, (tx) => tx.subtarefa.update({ where: { id: subtarefa.id }, data: { status: StatusSubtarefa.EM_ANDAMENTO } })),
  ).rejects.toThrow(/RN-004/);
});

it("colaboradores só podem concluir a tarefa dentro do próprio escopo, sem alterar o prazo", async () => {
  await expect(
    comoUsuario(
      { usuarioId: usuarioAdminInternoDono.id, perfil: "ADMIN_INTERNO" },
      (tx) => tx.tarefa.update({ where: { id: tarefaX.id }, data: { prazo: new Date("2030-01-01") } }),
    ),
  ).rejects.toThrow(/RN-007/);

  const concluida = await comoUsuario(
    { usuarioId: usuarioAdminInternoDono.id, perfil: "ADMIN_INTERNO" },
    (tx) => tx.tarefa.update({ where: { id: tarefaX.id }, data: { status: StatusTarefa.CONCLUIDO } }),
  );
  expect(concluida.status).toBe(StatusTarefa.CONCLUIDO);
});

it("Colaborador Interno e Externo não criam nem removem entidades do núcleo", async () => {
  for (const ctx of [
    { usuarioId: usuarioAdminInternoDono.id, perfil: "ADMIN_INTERNO" as const },
    { usuarioId: usuarioAdminExternoMesmaTarefa.id, perfil: "ADMIN_EXTERNO" as const },
  ]) {
    await expect(
      comoUsuario(ctx, (tx) => tx.projeto.create({ data: { clienteId: projetoX.clienteId, nome: "Projeto proibido" } })),
    ).rejects.toThrow();
    await expect(
      comoUsuario(ctx, (tx) => tx.tarefa.create({ data: { projetoId: projetoX.id, nome: "Tarefa proibida" } })),
    ).rejects.toThrow();
    await expect(
      comoUsuario(ctx, (tx) => tx.subtarefa.create({ data: { tarefaId: tarefaX.id, titulo: "Subtarefa proibida" } })),
    ).rejects.toThrow();
    await expect(
      comoUsuario(ctx, (tx) => tx.projeto.delete({ where: { id: projetoX.id } })),
    ).rejects.toThrow();
  }
});

it("o Administrador (Talita) consegue marcar qualquer subtarefa como concluída", async () => {
  const subtarefa = await criarSubtarefaAtribuida();

  const atualizada = await comoUsuario(
    { usuarioId: usuarioAdmin.id, perfil: "ADMIN" },
    (tx) => tx.subtarefa.update({ where: { id: subtarefa.id }, data: { status: StatusSubtarefa.CONCLUIDO } }),
  );

  expect(atualizada.status).toBe(StatusSubtarefa.CONCLUIDO);
});

describe("bloqueado: acesso à tarefa/projeto não é suficiente sem ser o atribuído", () => {
  it("ADMIN_INTERNO dono do projeto (acesso à tarefa via RF-018) é barrado pela trigger", async () => {
    const subtarefa = await criarSubtarefaAtribuida();

    await expect(
      comoUsuario(
        { usuarioId: usuarioAdminInternoDono.id, perfil: "ADMIN_INTERNO" },
        (tx) => tx.subtarefa.update({ where: { id: subtarefa.id }, data: { status: StatusSubtarefa.CONCLUIDO } }),
      ),
    ).rejects.toThrow();

    const inalterada = await ownerDb.subtarefa.findUniqueOrThrow({ where: { id: subtarefa.id } });
    expect(inalterada.status).toBe(StatusSubtarefa.EM_ANDAMENTO);
  });

  it("ADMIN_EXTERNO com acesso à mesma tarefa (RF-019), mas não à subtarefa, nem enxerga a linha pra alterar", async () => {
    const subtarefa = await criarSubtarefaAtribuida();

    await expect(
      comoUsuario(
        { usuarioId: usuarioAdminExternoMesmaTarefa.id, perfil: "ADMIN_EXTERNO" },
        (tx) => tx.subtarefa.update({ where: { id: subtarefa.id }, data: { status: StatusSubtarefa.CONCLUIDO } }),
      ),
    ).rejects.toThrow();

    const inalterada = await ownerDb.subtarefa.findUniqueOrThrow({ where: { id: subtarefa.id } });
    expect(inalterada.status).toBe(StatusSubtarefa.EM_ANDAMENTO);
  });

  it("ADMIN (sem Pessoa Envolvida vinculada, caso do próprio Administrador — ADR-007) não é confundido com o atribuído", async () => {
    // Regressão específica do salto adicional via pessoaEnvolvidaId: usuarioAdmin não tem
    // pessoaEnvolvidaId (é null), então a comparação não deve casar acidentalmente com uma
    // subtarefa cujo atribuidoAId também seja null.
    const subtarefaSemAtribuido = await ownerDb.subtarefa.create({
      data: { tarefaId: tarefaX.id, titulo: "Sem atribuído ainda" },
    });

    await expect(
      comoUsuario(
        { usuarioId: usuarioAdminInternoDono.id, perfil: "ADMIN_INTERNO" },
        (tx) => tx.subtarefa.update({ where: { id: subtarefaSemAtribuido.id }, data: { status: StatusSubtarefa.CONCLUIDO } }),
      ),
    ).rejects.toThrow();
  });
});

it("mesmo o ADMIN_INTERNO dono do projeto não pode editar o checklist", async () => {
  const subtarefa = await criarSubtarefaAtribuida();

  await expect(
    comoUsuario(
      { usuarioId: usuarioAdminInternoDono.id, perfil: "ADMIN_INTERNO" },
      (tx) => tx.subtarefa.update({ where: { id: subtarefa.id }, data: { titulo: "Tentativa indevida" } }),
    ),
  ).rejects.toThrow();
});
