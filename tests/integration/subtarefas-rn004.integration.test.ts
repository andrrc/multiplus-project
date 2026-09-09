/**
 * RF-021 / RN-004 — "Apenas a pessoa atribuída a uma subtarefa específica,
 * ou o Administrador (Talita), pode marcá-la como concluída — mesmo que
 * outra pessoa tenha acesso à tarefa/projeto".
 * Módulo SRS: Projetos e Tarefas (extensão) — Seção 3.9.
 *
 * Cobre os dois mecanismos que aplicam a regra: a política de RLS de UPDATE
 * (quem chega a enxergar a linha pra tentar alterar) e a trigger
 * `subtarefas_enforce_rn004` (quem, mesmo enxergando a linha, pode de fato
 * mudar o campo "concluida"). Ver prisma/migrations/*_rls_policies e
 * *_fix_rn004_concluida_check.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ownerDb, comoUsuario, limparFixtures, fecharConexoes } from "./setup/helpers";

let tarefaX: { id: string };

let usuarioAdmin: { id: string };
let usuarioResponsavel: { id: string };
let usuarioAdminInternoDono: { id: string };
let usuarioAdminExternoMesmaTarefa: { id: string };

async function criarSubtarefaAtribuida() {
  return ownerDb.subtarefa.create({
    data: {
      tarefaId: tarefaX.id,
      etiqueta: "Enviar documento X",
      atribuidoAId: usuarioResponsavel.id,
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
  const projetoX = await ownerDb.projeto.create({
    data: { clienteId: cliente.id, nome: "Projeto RN-004" },
  });
  tarefaX = await ownerDb.tarefa.create({
    data: { projetoId: projetoX.id, nome: "Tarefa RN-004" },
  });

  usuarioAdmin = await ownerDb.usuario.create({
    data: { nome: "Talita", email: "talita.rn004@teste.local", perfil: "ADMIN" },
  });
  usuarioResponsavel = await ownerDb.usuario.create({
    data: { nome: "Responsável pela subtarefa", email: "responsavel.rn004@teste.local", perfil: "ADMIN_EXTERNO" },
  });
  usuarioAdminInternoDono = await ownerDb.usuario.create({
    data: { nome: "Dono do projeto", email: "dono-projeto.rn004@teste.local", perfil: "ADMIN_INTERNO" },
  });
  usuarioAdminExternoMesmaTarefa = await ownerDb.usuario.create({
    data: { nome: "Colega na mesma tarefa", email: "colega-tarefa.rn004@teste.local", perfil: "ADMIN_EXTERNO" },
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

it("a pessoa atribuída à subtarefa consegue marcar concluida=true", async () => {
  const subtarefa = await criarSubtarefaAtribuida();

  const atualizada = await comoUsuario(
    { usuarioId: usuarioResponsavel.id, perfil: "ADMIN_EXTERNO" },
    (tx) => tx.subtarefa.update({ where: { id: subtarefa.id }, data: { concluida: true } }),
  );

  expect(atualizada.concluida).toBe(true);
});

it("o Administrador (Talita) consegue marcar qualquer subtarefa como concluída", async () => {
  const subtarefa = await criarSubtarefaAtribuida();

  const atualizada = await comoUsuario(
    { usuarioId: usuarioAdmin.id, perfil: "ADMIN" },
    (tx) => tx.subtarefa.update({ where: { id: subtarefa.id }, data: { concluida: true } }),
  );

  expect(atualizada.concluida).toBe(true);
});

describe("bloqueado: acesso à tarefa/projeto não é suficiente sem ser o atribuído", () => {
  it("ADMIN_INTERNO dono do projeto (acesso à tarefa via RF-018) é barrado pela trigger", async () => {
    const subtarefa = await criarSubtarefaAtribuida();

    await expect(
      comoUsuario(
        { usuarioId: usuarioAdminInternoDono.id, perfil: "ADMIN_INTERNO" },
        (tx) => tx.subtarefa.update({ where: { id: subtarefa.id }, data: { concluida: true } }),
      ),
    ).rejects.toThrow(/RN-004/);

    const inalterada = await ownerDb.subtarefa.findUniqueOrThrow({ where: { id: subtarefa.id } });
    expect(inalterada.concluida).toBe(false);
  });

  it("ADMIN_EXTERNO com acesso à mesma tarefa (RF-019), mas não à subtarefa, nem enxerga a linha pra alterar", async () => {
    const subtarefa = await criarSubtarefaAtribuida();

    await expect(
      comoUsuario(
        { usuarioId: usuarioAdminExternoMesmaTarefa.id, perfil: "ADMIN_EXTERNO" },
        (tx) => tx.subtarefa.update({ where: { id: subtarefa.id }, data: { concluida: true } }),
      ),
    ).rejects.toThrow();

    const inalterada = await ownerDb.subtarefa.findUniqueOrThrow({ where: { id: subtarefa.id } });
    expect(inalterada.concluida).toBe(false);
  });
});

it("mesmo o ADMIN_INTERNO dono do projeto, que não pode concluir, continua podendo gerir o checklist (etiqueta)", async () => {
  const subtarefa = await criarSubtarefaAtribuida();

  const atualizada = await comoUsuario(
    { usuarioId: usuarioAdminInternoDono.id, perfil: "ADMIN_INTERNO" },
    (tx) => tx.subtarefa.update({ where: { id: subtarefa.id }, data: { etiqueta: "Enviar documento X (revisado)" } }),
  );

  expect(atualizada.etiqueta).toBe("Enviar documento X (revisado)");
});
