/** RF-021 / RN-004 / RN-007 — solicitações, decisões, RLS e bloqueio da conclusão. */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { StatusSolicitacaoConclusao, StatusSubtarefa, StatusTarefa } from "@prisma/client";
import {
  cancelarSolicitacaoConclusao,
  decidirSolicitacaoConclusao,
  listarSolicitacoesConclusaoPendentes,
  solicitarConclusao,
  atualizarStatusTarefa,
} from "@/lib/projetos-tarefas";
import { comoUsuario, ownerDb, limparFixtures, fecharConexoes } from "./setup/helpers";

let admin: { id: string };
let interno: { id: string };
let externo: { id: string };
let colega: { id: string };
let projeto: { id: string };
let tarefaInterna: { id: string };
let tarefaExterna: { id: string };
let subtarefaExterna: { id: string };

const ctxAdmin = () => ({ usuarioId: admin.id, perfil: "ADMIN" as const });
const ctxInterno = () => ({ usuarioId: interno.id, perfil: "ADMIN_INTERNO" as const });
const ctxExterno = () => ({ usuarioId: externo.id, perfil: "ADMIN_EXTERNO" as const });

beforeAll(async () => {
  await limparFixtures();
  admin = await ownerDb.usuario.create({ data: { nome: "Talita Aprovação", email: "talita.aprovacao@teste.local", perfil: "ADMIN" } });
  interno = await ownerDb.usuario.create({ data: { nome: "Interno Aprovação", email: "interno.aprovacao@teste.local", perfil: "ADMIN_INTERNO" } });
  const cliente = await ownerDb.cliente.create({ data: { razaoSocial: "Cliente Aprovação Ltda", cnpj: "44777777000106", segmento: "Industrial", origemContato: "Indicação" } });
  const pessoa = await ownerDb.pessoaEnvolvida.create({ data: { clienteId: cliente.id, nome: "Externo Aprovação", temAcesso: true } });
  externo = await ownerDb.usuario.create({ data: { nome: "Externo Aprovação", email: "externo.aprovacao@teste.local", perfil: "ADMIN_EXTERNO", pessoaEnvolvidaId: pessoa.id } });
  colega = await ownerDb.usuario.create({ data: { nome: "Colega Aprovação", email: "colega.aprovacao@teste.local", perfil: "ADMIN_INTERNO" } });
  projeto = await ownerDb.projeto.create({ data: { clienteId: cliente.id, nome: "Projeto Aprovação" } });
  tarefaInterna = await ownerDb.tarefa.create({ data: { projetoId: projeto.id, nome: "Tarefa interna", responsavelUsuarioId: interno.id } });
  tarefaExterna = await ownerDb.tarefa.create({ data: { projetoId: projeto.id, nome: "Tarefa externa", responsavelId: pessoa.id } });
  await ownerDb.atribuicao.create({ data: { usuarioId: interno.id, entidadeTipo: "PROJETO", entidadeId: projeto.id } });
  await ownerDb.atribuicao.create({ data: { usuarioId: colega.id, entidadeTipo: "PROJETO", entidadeId: projeto.id } });
  subtarefaExterna = await ownerDb.subtarefa.create({ data: { tarefaId: tarefaExterna.id, titulo: "Subtarefa externa", atribuidoAId: pessoa.id } });
});

afterAll(async () => {
  await limparFixtures();
  await fecharConexoes();
});

afterEach(async () => {
  await ownerDb.solicitacaoConclusao.deleteMany();
});

describe("aprovação de conclusão", () => {
  it("permite pedido nos vínculos válidos, mantém status e impede duplicidade", async () => {
    const tarefa = await solicitarConclusao(ctxInterno(), "TAREFA", tarefaInterna.id);
    expect(tarefa.solicitacao.status).toBe(StatusSolicitacaoConclusao.PENDENTE);
    expect((await ownerDb.tarefa.findUniqueOrThrow({ where: { id: tarefaInterna.id } })).status).toBe(StatusTarefa.A_INICIAR);
    await expect(solicitarConclusao(ctxInterno(), "TAREFA", tarefaInterna.id)).rejects.toThrow(/já existe.*pendente/i);

    const subtarefa = await solicitarConclusao(ctxExterno(), "SUBTAREFA", subtarefaExterna.id);
    expect(subtarefa.solicitacao.status).toBe(StatusSolicitacaoConclusao.PENDENTE);
    expect((await ownerDb.subtarefa.findUniqueOrThrow({ where: { id: subtarefaExterna.id } })).status).toBe(StatusSubtarefa.EM_ANDAMENTO);
  });

  it("mantém conclusões anteriores válidas e fora da fila de pedidos", async () => {
    const anterior = await ownerDb.tarefa.create({ data: { projetoId: projeto.id, nome: "Tarefa concluída antes da mudança", status: StatusTarefa.CONCLUIDO } });
    const fila = await listarSolicitacoesConclusaoPendentes(ctxAdmin());
    expect(fila.some((pedido) => pedido.tarefaId === anterior.id)).toBe(false);
    expect((await ownerDb.tarefa.findUniqueOrThrow({ where: { id: anterior.id } })).status).toBe(StatusTarefa.CONCLUIDO);
  });

  it("concorre em dois pedidos para o mesmo item e mantém somente um pendente", async () => {
    const tarefa = await ownerDb.tarefa.create({ data: { projetoId: projeto.id, nome: "Tarefa com pedidos concorrentes", responsavelUsuarioId: interno.id } });
    const resultados = await Promise.allSettled([
      solicitarConclusao(ctxInterno(), "TAREFA", tarefa.id),
      solicitarConclusao(ctxInterno(), "TAREFA", tarefa.id),
    ]);
    expect(resultados.filter((resultado) => resultado.status === "fulfilled")).toHaveLength(1);
    expect(resultados.filter((resultado) => resultado.status === "rejected")).toHaveLength(1);
    expect(await ownerDb.solicitacaoConclusao.count({ where: { tarefaId: tarefa.id, status: StatusSolicitacaoConclusao.PENDENTE } })).toBe(1);
  });

  it("nega pedido sem vínculo e retirada por pessoa diferente do solicitante", async () => {
    const clienteId = (await ownerDb.projeto.findUniqueOrThrow({ where: { id: projeto.id }, select: { clienteId: true } })).clienteId;
    const projetoSemVinculo = await ownerDb.projeto.create({ data: { clienteId, nome: "Projeto sem vínculo" } });
    const tarefaSemVinculo = await ownerDb.tarefa.create({ data: { projetoId: projetoSemVinculo.id, nome: "Tarefa sem vínculo" } });
    await expect(solicitarConclusao(ctxInterno(), "TAREFA", tarefaSemVinculo.id)).rejects.toThrow(/RN-007/);
    const pedido = await solicitarConclusao(ctxInterno(), "TAREFA", tarefaInterna.id);
    expect(await comoUsuario({ usuarioId: colega.id, perfil: "ADMIN_INTERNO" }, (tx) => tx.solicitacaoConclusao.findMany({ where: { id: pedido.solicitacao.id } }))).toHaveLength(1);
    await expect(cancelarSolicitacaoConclusao({ usuarioId: colega.id, perfil: "ADMIN_INTERNO" }, pedido.solicitacao.id)).rejects.toThrow(/somente quem solicitou/);
    await cancelarSolicitacaoConclusao(ctxInterno(), pedido.solicitacao.id);
    expect((await ownerDb.solicitacaoConclusao.findUniqueOrThrow({ where: { id: pedido.solicitacao.id } })).status).toBe(StatusSolicitacaoConclusao.CANCELADA);
  });

  it("não confirma pedido enquanto o projeto ou cliente estiver inativo", async () => {
    const pedido = await solicitarConclusao(ctxInterno(), "TAREFA", tarefaInterna.id);
    await ownerDb.projeto.update({ where: { id: projeto.id }, data: { ativo: false } });
    await expect(decidirSolicitacaoConclusao(ctxAdmin(), pedido.solicitacao.id, true)).rejects.toThrow(/projeto ou cliente inativo/);
    await ownerDb.projeto.update({ where: { id: projeto.id }, data: { ativo: true } });
    await decidirSolicitacaoConclusao(ctxAdmin(), pedido.solicitacao.id, false);
  });

  it("somente ADMIN aprova; rejeição preserva status e registra comentário", async () => {
    const pedido = await solicitarConclusao(ctxInterno(), "TAREFA", tarefaInterna.id);
    await expect(decidirSolicitacaoConclusao(ctxInterno(), pedido.solicitacao.id, true)).rejects.toThrow(/Administrador/);
    await atualizarStatusTarefa(ctxAdmin(), tarefaInterna.id, StatusTarefa.EM_ANDAMENTO);
    const rejeitada = await decidirSolicitacaoConclusao(ctxAdmin(), pedido.solicitacao.id, false, "Revisar o documento antes.");
    expect(rejeitada.aprovada).toBe(false);
    expect(await ownerDb.tarefa.findUniqueOrThrow({ where: { id: tarefaInterna.id } })).toMatchObject({ status: StatusTarefa.A_INICIAR });
    expect(await ownerDb.solicitacaoConclusao.findUniqueOrThrow({ where: { id: pedido.solicitacao.id } })).toMatchObject({
      status: StatusSolicitacaoConclusao.REJEITADA,
      decididoPorId: admin.id,
      comentarioDecisao: "Revisar o documento antes.",
    });
  });

  it("aprovação conclui a subtarefa e RLS bloqueia alterações posteriores do colaborador", async () => {
    const pedido = await solicitarConclusao(ctxExterno(), "SUBTAREFA", subtarefaExterna.id);
    const resultado = await decidirSolicitacaoConclusao(ctxAdmin(), pedido.solicitacao.id, true);
    expect(resultado.aprovada).toBe(true);
    expect((await ownerDb.subtarefa.findUniqueOrThrow({ where: { id: subtarefaExterna.id } })).status).toBe(StatusSubtarefa.CONCLUIDO);
    const atualizacao = await comoUsuario(ctxExterno(), (tx) => tx.subtarefa.updateMany({ where: { id: subtarefaExterna.id }, data: { titulo: "Alteração após aprovação" } }));
    expect(atualizacao.count).toBe(0);
    await expect(decidirSolicitacaoConclusao(ctxAdmin(), pedido.solicitacao.id, true)).rejects.toThrow(/já foi decidida/);
    expect(await comoUsuario(ctxExterno(), (tx) => tx.solicitacaoConclusao.findMany())).toMatchObject([
      { id: pedido.solicitacao.id, status: StatusSolicitacaoConclusao.APROVADA, solicitadoPorId: externo.id },
    ]);
  });
});
