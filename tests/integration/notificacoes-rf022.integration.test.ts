/** RF-022/RF-023 — preferências por canal, menções e evento de atribuição recebida. */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventoNotificacao } from "@prisma/client";

vi.mock("@/lib/email", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/email")>();
  return { ...mod, enviarEmail: vi.fn(async () => {}) };
});

import { enviarEmail } from "@/lib/email";
import { adicionarAtribuicao } from "@/lib/usuarios";
import { criarSubtarefa, criarTarefa } from "@/lib/projetos-tarefas";
import { listarUsuariosMencionaveis } from "@/lib/comentarios";
import { atualizarPreferenciaNotificacao, dispararEventoNotificacao, dispararNotificacaoAtribuicaoRecebida, dispararNotificacoesMencaoComentario, dispararPrazoProximo, listarAdministradoresAtivos } from "@/lib/notificacoes";
import { fecharConexoes, limparFixtures, ownerDb } from "./setup/helpers";

let adminId = "";
let externoId = "";
let tarefaId = "";
let clienteId = "";

async function preferencia(perfil: "ADMIN" | "ADMIN_EXTERNO" | "CLIENTE", evento: EventoNotificacao, email: boolean, inApp: boolean) {
  await ownerDb.preferenciaNotificacao.update({ where: { perfil_evento: { perfil, evento } }, data: { email, inApp } });
}

beforeEach(async () => {
  await ownerDb.notificacao.deleteMany();
  await limparFixtures();
  vi.clearAllMocks();
  const admin = await ownerDb.usuario.create({ data: { nome: "Talita RF022", email: "talita.rf022@teste.local", perfil: "ADMIN" } });
  const externo = await ownerDb.usuario.create({ data: { nome: "Externo RF022", email: "externo.rf022@teste.local", perfil: "ADMIN_EXTERNO" } });
  const cliente = await ownerDb.cliente.create({ data: { razaoSocial: "Cliente RF022 Ltda", cnpj: "22333444000192", segmento: "Indústria", origemContato: "Indicação" } });
  const projeto = await ownerDb.projeto.create({ data: { clienteId: cliente.id, nome: "Projeto RF022" } });
  const tarefa = await ownerDb.tarefa.create({ data: { projetoId: projeto.id, nome: "Tarefa RF022" } });
  adminId = admin.id;
  externoId = externo.id;
  tarefaId = tarefa.id;
  clienteId = cliente.id;
});

afterAll(async () => {
  await ownerDb.notificacao.deleteMany();
  await limparFixtures();
  await fecharConexoes();
});

afterEach(async () => {
  await ownerDb.notificacao.deleteMany();
  await Promise.all([
    preferencia("ADMIN", "NOVO_COMENTARIO", true, true),
    preferencia("ADMIN", "PRAZO_PROXIMO", true, true),
    preferencia("ADMIN_EXTERNO", "PRAZO_PROXIMO", true, true),
    preferencia("ADMIN_EXTERNO", "NOVO_COMENTARIO", true, true),
    preferencia("ADMIN_EXTERNO", "ATRIBUICAO_RECEBIDA", true, true),
  ]);
  vi.clearAllMocks();
});

describe("RF-022 — canais independentes por perfil e evento", () => {
  it("permite alterar preferências só ao ADMIN", async () => {
    await atualizarPreferenciaNotificacao(
      { usuarioId: adminId, perfil: "ADMIN" },
      "ADMIN_EXTERNO",
      EventoNotificacao.PRAZO_PROXIMO,
      { email: false, inApp: true },
    );
    expect(await ownerDb.preferenciaNotificacao.findUniqueOrThrow({ where: { perfil_evento: { perfil: "ADMIN_EXTERNO", evento: "PRAZO_PROXIMO" } } })).toMatchObject({ email: false, inApp: true });
    await expect(atualizarPreferenciaNotificacao(
      { usuarioId: externoId, perfil: "ADMIN_EXTERNO" },
      "ADMIN_EXTERNO",
      EventoNotificacao.PRAZO_PROXIMO,
      { email: true, inApp: true },
    )).rejects.toThrow("Ação restrita ao Administrador.");
  });

  it("envia somente os canais ligados e respeita a opção de desligar ambos", async () => {
    await preferencia("ADMIN_EXTERNO", "PRAZO_PROXIMO", true, false);
    await dispararEventoNotificacao(EventoNotificacao.PRAZO_PROXIMO, { titulo: "Prazo", mensagem: "Aviso", usuarioIds: [externoId] });
    expect(vi.mocked(enviarEmail)).toHaveBeenCalledTimes(1);
    expect(await ownerDb.notificacao.count({ where: { usuarioId: externoId } })).toBe(0);

    vi.clearAllMocks();
    await preferencia("ADMIN_EXTERNO", "PRAZO_PROXIMO", false, true);
    await dispararEventoNotificacao(EventoNotificacao.PRAZO_PROXIMO, { titulo: "Prazo", mensagem: "Aviso", usuarioIds: [externoId] });
    expect(enviarEmail).not.toHaveBeenCalled();
    expect(await ownerDb.notificacao.count({ where: { usuarioId: externoId } })).toBe(1);

    await preferencia("ADMIN_EXTERNO", "PRAZO_PROXIMO", false, false);
    await dispararEventoNotificacao(EventoNotificacao.PRAZO_PROXIMO, { titulo: "Prazo", mensagem: "Aviso", usuarioIds: [externoId] });
    expect(enviarEmail).not.toHaveBeenCalled();
    expect(await ownerDb.notificacao.count({ where: { usuarioId: externoId } })).toBe(1);
  });

  it("limita e-mail e in-app à lista explícita de destinatários", async () => {
    await preferencia("ADMIN", EventoNotificacao.NOVO_COMENTARIO, true, true);
    await preferencia("ADMIN_EXTERNO", EventoNotificacao.NOVO_COMENTARIO, true, true);

    await dispararEventoNotificacao(EventoNotificacao.NOVO_COMENTARIO, {
      titulo: "Novo comentário",
      mensagem: "Aviso restrito",
      usuarioIds: [externoId],
    });

    expect(await ownerDb.notificacao.count({ where: { usuarioId: adminId, evento: "NOVO_COMENTARIO" } })).toBe(0);
    expect(await ownerDb.notificacao.count({ where: { usuarioId: externoId, evento: "NOVO_COMENTARIO" } })).toBe(1);
    expect(enviarEmail).toHaveBeenCalledTimes(1);
    expect(enviarEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "externo.rf022@teste.local" }));

    await dispararEventoNotificacao(EventoNotificacao.NOVO_COMENTARIO, {
      titulo: "Novo comentário",
      mensagem: "Audiência vazia",
      usuarioIds: [],
    });
    expect(enviarEmail).toHaveBeenCalledTimes(1);
    expect(await ownerDb.notificacao.count({ where: { evento: "NOVO_COMENTARIO" } })).toBe(1);
  });

  it("usa somente usuários ativos com acesso ao alvo no aviso geral de comentário", async () => {
    const clienteUsuario = await ownerDb.usuario.create({
      data: { nome: "Cliente RF022", email: "cliente.rf022@teste.local", perfil: "CLIENTE", clienteId },
    });
    const externoSemAcesso = await ownerDb.usuario.create({
      data: { nome: "Externo sem acesso RF022", email: "sem-acesso.rf022@teste.local", perfil: "ADMIN_EXTERNO" },
    });
    await ownerDb.atribuicao.create({ data: { usuarioId: externoId, entidadeTipo: "TAREFA", entidadeId: tarefaId } });
    await Promise.all([
      preferencia("ADMIN", EventoNotificacao.NOVO_COMENTARIO, false, true),
      preferencia("ADMIN_EXTERNO", EventoNotificacao.NOVO_COMENTARIO, false, true),
      preferencia("CLIENTE", EventoNotificacao.NOVO_COMENTARIO, false, true),
    ]);

    const destinatarios = await listarUsuariosMencionaveis({ usuarioId: adminId, perfil: "ADMIN" }, { tarefaId });
    const ids = destinatarios.map(({ id }) => id);
    expect(ids).toEqual(expect.arrayContaining([externoId, clienteUsuario.id]));
    expect(ids).not.toContain(externoSemAcesso.id);
    expect(ids).not.toContain(adminId);

    await dispararEventoNotificacao(EventoNotificacao.NOVO_COMENTARIO, {
      titulo: "Novo comentário",
      mensagem: "Aviso de comentário",
      usuarioIds: ids,
    });

    expect(await ownerDb.notificacao.count({ where: { usuarioId: externoId, evento: "NOVO_COMENTARIO" } })).toBe(1);
    expect(await ownerDb.notificacao.count({ where: { usuarioId: clienteUsuario.id, evento: "NOVO_COMENTARIO" } })).toBe(1);
    expect(await ownerDb.notificacao.count({ where: { usuarioId: externoSemAcesso.id, evento: "NOVO_COMENTARIO" } })).toBe(0);
    expect(await listarAdministradoresAtivos()).toEqual([adminId]);

    await ownerDb.cliente.update({ where: { id: clienteId }, data: { ativo: false } });
    const destinatariosAposDesativacao = await listarUsuariosMencionaveis({ usuarioId: adminId, perfil: "ADMIN" }, { tarefaId });
    expect(destinatariosAposDesativacao.map(({ id }) => id)).not.toEqual(expect.arrayContaining([externoId, clienteUsuario.id]));
  });

  it("não dispara prazo próximo para tarefa cancelada", async () => {
    await preferencia("ADMIN", EventoNotificacao.PRAZO_PROXIMO, false, true);
    const prazo = new Date("2026-10-04T00:00:00.000Z");
    const tarefaElegivel = await ownerDb.tarefa.update({
      where: { id: tarefaId },
      data: { prazo, status: "EM_ANDAMENTO" },
    });
    const projetoId = (await ownerDb.tarefa.findUniqueOrThrow({ where: { id: tarefaId }, select: { projetoId: true } })).projetoId;
    const tarefaCancelada = await ownerDb.tarefa.create({
      data: { projetoId, nome: "Tarefa cancelada RF022", prazo, status: "CANCELADO" },
    });

    const resultado = await dispararPrazoProximo(7, new Date("2026-10-01T00:00:00.000Z"));

    expect(resultado.encontradas).toBe(1);
    expect(await ownerDb.notificacao.count({ where: { usuarioId: adminId, evento: "PRAZO_PROXIMO", entidadeId: tarefaElegivel.id } })).toBe(1);
    expect(await ownerDb.notificacao.count({ where: { usuarioId: adminId, evento: "PRAZO_PROXIMO", entidadeId: tarefaCancelada.id } })).toBe(0);
  });

  it("aplica NOVO_COMENTARIO aos canais da pessoa mencionada e à confirmação do autor", async () => {
    await preferencia("ADMIN", "NOVO_COMENTARIO", false, true);
    await preferencia("ADMIN_EXTERNO", "NOVO_COMENTARIO", true, false);
    await dispararNotificacoesMencaoComentario({
      destinatarioIds: [adminId, externoId],
      autorId: adminId,
      comentario: "Comentário de teste",
      url: `/minhas-tarefas/${tarefaId}`,
      entidadeId: "comentario-rf022",
    });

    expect(enviarEmail).toHaveBeenCalledTimes(1);
    expect(enviarEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "externo.rf022@teste.local" }));
    expect(await ownerDb.notificacao.count({ where: { usuarioId: adminId, evento: "NOVO_COMENTARIO" } })).toBe(1);
    expect(await ownerDb.notificacao.count({ where: { usuarioId: externoId, evento: "NOVO_COMENTARIO" } })).toBe(0);
  });

  it("dispara ATRIBUICAO_RECEBIDA quando o ADMIN atribui uma tarefa", async () => {
    await preferencia("ADMIN_EXTERNO", "ATRIBUICAO_RECEBIDA", false, true);
    const resultado = await adicionarAtribuicao({ usuarioId: adminId, perfil: "ADMIN" }, externoId, { entidadeTipo: "TAREFA", entidadeId: tarefaId });
    expect(resultado).toEqual({ sucesso: true });
    await vi.waitFor(async () => {
      expect(await ownerDb.notificacao.count({ where: { usuarioId: externoId, evento: "ATRIBUICAO_RECEBIDA" } })).toBe(1);
    });
    expect(enviarEmail).not.toHaveBeenCalled();
  });

  it("avisa também quando uma tarefa ou subtarefa nasce atribuída", async () => {
    await preferencia("ADMIN_EXTERNO", "ATRIBUICAO_RECEBIDA", false, true);
    const contexto = { usuarioId: adminId, perfil: "ADMIN" as const };
    const tarefa = await criarTarefa(contexto, {
      projetoId: (await ownerDb.tarefa.findUniqueOrThrow({ where: { id: tarefaId }, select: { projetoId: true } })).projetoId,
      nome: "Tarefa atribuída",
      prazo: new Date("2026-10-01T00:00:00.000Z"),
      responsavelUsuarioId: externoId,
    });
    const subtarefa = await criarSubtarefa(contexto, {
      tarefaId,
      titulo: "Subtarefa atribuída",
      atribuidoAUsuarioId: externoId,
    });

    await vi.waitFor(async () => {
      expect(await ownerDb.notificacao.count({ where: { usuarioId: externoId, evento: "ATRIBUICAO_RECEBIDA" } })).toBe(2);
    });
    const avisos = await ownerDb.notificacao.findMany({ where: { usuarioId: externoId, evento: "ATRIBUICAO_RECEBIDA" } });
    expect(avisos.map((aviso) => aviso.entidadeId)).toEqual(expect.arrayContaining([tarefa.id, subtarefa.id]));
    expect(avisos.find((aviso) => aviso.entidadeId === subtarefa.id)?.url).toBe(`/minhas-tarefas/${tarefaId}`);
    expect(enviarEmail).not.toHaveBeenCalled();
  });

  it("respeita a preferência de canal no evento de atribuição", async () => {
    await preferencia("ADMIN_EXTERNO", "ATRIBUICAO_RECEBIDA", true, false);
    await dispararNotificacaoAtribuicaoRecebida(externoId, "TAREFA", tarefaId);
    expect(enviarEmail).toHaveBeenCalledTimes(1);
    expect(await ownerDb.notificacao.count({ where: { usuarioId: externoId, evento: "ATRIBUICAO_RECEBIDA" } })).toBe(0);
  });
});
