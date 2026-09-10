/**
 * RN-006/ADR-007 — definir uma Pessoa Envolvida com acesso (`temAcesso = true`) como
 * responsável de uma tarefa cria automaticamente o registro de `Atribuicao` da tarefa pra
 * ela; sem acesso, nenhum registro é criado. Ao TROCAR o responsável, a `Atribuicao` da
 * pessoa anterior é removida (decisão confirmada com a Talita/André após o fechamento da
 * sprint — ela deixa de ver a tarefa assim que perde a responsabilidade). Módulo SRS:
 * Projetos e Tarefas (extensão), Seção 5 (Regras de Negócio).
 *
 * Sem UI própria ainda (módulo de Projetos/Tarefas não tem CRUD/tela — só o esqueleto de
 * RLS da Sprint 1) — ver src/lib/tarefas.ts#definirResponsavelTarefa.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ownerDb, comoUsuario, limparFixtures, fecharConexoes } from "./setup/helpers";
import { definirResponsavelTarefa } from "@/lib/tarefas";

let tarefaY: { id: string };
let clienteId: string;

let usuarioAdmin: { id: string };
let pessoaComAcesso: { id: string };
let usuarioComAcesso: { id: string };
let pessoaSemAcesso: { id: string };

beforeAll(async () => {
  await limparFixtures();

  const cliente = await ownerDb.cliente.create({
    data: {
      razaoSocial: "Cliente RN006 Ltda",
      cnpj: "44444444000104",
      segmento: "Industrial",
      origemContato: "Indicação",
    },
  });
  clienteId = cliente.id;

  const projetoY = await ownerDb.projeto.create({ data: { clienteId, nome: "Projeto RN-006" } });
  tarefaY = await ownerDb.tarefa.create({ data: { projetoId: projetoY.id, nome: "Tarefa RN-006" } });

  usuarioAdmin = await ownerDb.usuario.create({
    data: { nome: "Talita", email: "talita.rn006@teste.local", perfil: "ADMIN" },
  });

  pessoaComAcesso = await ownerDb.pessoaEnvolvida.create({
    data: { clienteId, tipo: "PESSOA", nome: "José Colaborador", temAcesso: true },
  });
  usuarioComAcesso = await ownerDb.usuario.create({
    data: {
      nome: "José Colaborador",
      email: "jose.rn006@teste.local",
      perfil: "ADMIN_EXTERNO",
      pessoaEnvolvidaId: pessoaComAcesso.id,
    },
  });

  pessoaSemAcesso = await ownerDb.pessoaEnvolvida.create({
    data: { clienteId, tipo: "PESSOA", nome: "Maria Sem Acesso", temAcesso: false },
  });
});

afterAll(async () => {
  await limparFixtures();
  await fecharConexoes();
});

const ctxAdmin = () => ({ usuarioId: usuarioAdmin.id, perfil: "ADMIN" as const });

describe("RN-006 — Atribuicao automática ao definir responsável", () => {
  it("Pessoa Envolvida com acesso: define responsável cria a Atribuicao e ela passa a ver a tarefa", async () => {
    await definirResponsavelTarefa(ctxAdmin(), tarefaY.id, pessoaComAcesso.id);

    const tarefa = await ownerDb.tarefa.findUniqueOrThrow({ where: { id: tarefaY.id } });
    expect(tarefa.responsavelId).toBe(pessoaComAcesso.id);

    const atribuicao = await ownerDb.atribuicao.findUnique({
      where: {
        usuarioId_entidadeTipo_entidadeId: {
          usuarioId: usuarioComAcesso.id,
          entidadeTipo: "TAREFA",
          entidadeId: tarefaY.id,
        },
      },
    });
    expect(atribuicao).not.toBeNull();

    // Confirma pela RLS de verdade — não só que a linha existe, que ela realmente enxerga a tarefa.
    const tarefaVisivel = await comoUsuario(
      { usuarioId: usuarioComAcesso.id, perfil: "ADMIN_EXTERNO" },
      (tx) => tx.tarefa.findUnique({ where: { id: tarefaY.id } }),
    );
    expect(tarefaVisivel?.id).toBe(tarefaY.id);
  });

  it("Pessoa Envolvida sem acesso: define responsável não cria nenhuma Atribuicao", async () => {
    // Tarefa própria pro caso, pra não herdar a Atribuicao deixada pelo teste anterior.
    const outraTarefa = await ownerDb.tarefa.create({
      data: { projetoId: (await ownerDb.tarefa.findUniqueOrThrow({ where: { id: tarefaY.id } })).projetoId, nome: "Tarefa RN-006b" },
    });

    await definirResponsavelTarefa(ctxAdmin(), outraTarefa.id, pessoaSemAcesso.id);

    const tarefa = await ownerDb.tarefa.findUniqueOrThrow({ where: { id: outraTarefa.id } });
    expect(tarefa.responsavelId).toBe(pessoaSemAcesso.id);

    const atribuicoes = await ownerDb.atribuicao.findMany({
      where: { entidadeTipo: "TAREFA", entidadeId: outraTarefa.id },
    });
    expect(atribuicoes).toHaveLength(0);
  });

  it("chamar de novo pra mesma pessoa com acesso não duplica a Atribuicao (upsert idempotente)", async () => {
    await definirResponsavelTarefa(ctxAdmin(), tarefaY.id, pessoaComAcesso.id);
    await definirResponsavelTarefa(ctxAdmin(), tarefaY.id, pessoaComAcesso.id);

    const atribuicoes = await ownerDb.atribuicao.findMany({
      where: { usuarioId: usuarioComAcesso.id, entidadeTipo: "TAREFA", entidadeId: tarefaY.id },
    });
    expect(atribuicoes).toHaveLength(1);
  });

  it("trocar o responsável remove a Atribuicao da pessoa anterior — ela deixa de ver a tarefa", async () => {
    const projetoId = (await ownerDb.tarefa.findUniqueOrThrow({ where: { id: tarefaY.id } })).projetoId;
    const tarefaTroca = await ownerDb.tarefa.create({ data: { projetoId, nome: "Tarefa RN-006 troca" } });

    await definirResponsavelTarefa(ctxAdmin(), tarefaTroca.id, pessoaComAcesso.id);

    const outraPessoaComAcesso = await ownerDb.pessoaEnvolvida.create({
      data: { clienteId, tipo: "PESSOA", nome: "Outro Colaborador", temAcesso: true },
    });
    const outroUsuarioComAcesso = await ownerDb.usuario.create({
      data: {
        nome: "Outro Colaborador",
        email: "outro.rn006@teste.local",
        perfil: "ADMIN_EXTERNO",
        pessoaEnvolvidaId: outraPessoaComAcesso.id,
      },
    });

    // Troca o responsável — decisão confirmada: a Atribuicao antiga deve ser removida.
    await definirResponsavelTarefa(ctxAdmin(), tarefaTroca.id, outraPessoaComAcesso.id);

    const atribuicaoNova = await ownerDb.atribuicao.findUnique({
      where: {
        usuarioId_entidadeTipo_entidadeId: {
          usuarioId: outroUsuarioComAcesso.id,
          entidadeTipo: "TAREFA",
          entidadeId: tarefaTroca.id,
        },
      },
    });
    expect(atribuicaoNova).not.toBeNull();

    const atribuicaoAntiga = await ownerDb.atribuicao.findUnique({
      where: {
        usuarioId_entidadeTipo_entidadeId: {
          usuarioId: usuarioComAcesso.id,
          entidadeTipo: "TAREFA",
          entidadeId: tarefaTroca.id,
        },
      },
    });
    expect(atribuicaoAntiga).toBeNull();

    // A pessoa trocada não vê mais a tarefa (confirmado pela RLS de verdade).
    const tarefaNaoVisivel = await comoUsuario(
      { usuarioId: usuarioComAcesso.id, perfil: "ADMIN_EXTERNO" },
      (tx) => tx.tarefa.findUnique({ where: { id: tarefaTroca.id } }),
    );
    expect(tarefaNaoVisivel).toBeNull();
  });

  it("trocar o responsável pra null também remove a Atribuicao da pessoa anterior", async () => {
    const projetoId = (await ownerDb.tarefa.findUniqueOrThrow({ where: { id: tarefaY.id } })).projetoId;
    const tarefaRemove = await ownerDb.tarefa.create({ data: { projetoId, nome: "Tarefa RN-006 remove" } });

    await definirResponsavelTarefa(ctxAdmin(), tarefaRemove.id, pessoaComAcesso.id);
    await definirResponsavelTarefa(ctxAdmin(), tarefaRemove.id, null);

    const tarefa = await ownerDb.tarefa.findUniqueOrThrow({ where: { id: tarefaRemove.id } });
    expect(tarefa.responsavelId).toBeNull();

    const atribuicao = await ownerDb.atribuicao.findUnique({
      where: {
        usuarioId_entidadeTipo_entidadeId: {
          usuarioId: usuarioComAcesso.id,
          entidadeTipo: "TAREFA",
          entidadeId: tarefaRemove.id,
        },
      },
    });
    expect(atribuicao).toBeNull();
  });
});
