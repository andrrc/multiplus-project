"use server";
/**
 * Actions do módulo `src/app/(painel)/projetos`. Recebem dados enviados pela interface, obtêm o contexto autenticado, validam as entradas no servidor e encaminham operações às funções de domínio; a interface não é a barreira de autorização.
 */

import { revalidatePath } from "next/cache";
import { EventoNotificacao, Periodicidade, Prisma, StatusProjeto, StatusSubtarefa, StatusTarefa } from "@prisma/client";
import { redirect } from "next/navigation";
import { obterContexto } from "@/server/auth/contexto";
import {
  atualizarProjeto,
  atualizarStatusProjeto,
  atualizarStatusTarefa,
  atualizarSubtarefa,
  atualizarResponsavelSubtarefa,
  atualizarStatusSubtarefa,
  atualizarTarefa,
  buscarSolicitacaoConclusaoPendente,
  cancelarSolicitacaoConclusao,
  concluirTarefa,
  criarDocumentoProjeto,
  criarProjeto,
  criarSubtarefa,
  criarTarefa,
  desativarOuReativar,
  decidirSolicitacaoConclusao,
  solicitarConclusao,
} from "@/lib/projetos-tarefas";
import { criarComentario, listarUsuariosMencionaveis } from "@/lib/comentarios";
import { buscarProjetoAtivoDaTarefa, dispararNotificacoesMencaoComentario, dispararEventoNotificacao, listarAdministradoresAtivos, listarClientesAtivosDoProjeto } from "@/lib/notificacoes";
import { montarNumeroProposta } from "@/lib/numero-proposta";
import type { EtiquetaSelecionada } from "@/lib/etiqueta-colors";

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

function dataOpcional(valor: string): Date | null {
  return valor ? new Date(`${valor}T00:00:00.000Z`) : null;
}

function statusProjeto(valor: string): StatusProjeto | undefined {
  return Object.values(StatusProjeto).includes(valor as StatusProjeto) ? (valor as StatusProjeto) : undefined;
}

function statusTarefa(valor: string): StatusTarefa | undefined {
  return Object.values(StatusTarefa).includes(valor as StatusTarefa) ? (valor as StatusTarefa) : undefined;
}

function statusSubtarefa(valor: string): StatusSubtarefa | undefined {
  return Object.values(StatusSubtarefa).includes(valor as StatusSubtarefa) ? (valor as StatusSubtarefa) : undefined;
}

function periodicidade(valor: string): Periodicidade | null {
  return Object.values(Periodicidade).includes(valor as Periodicidade) ? (valor as Periodicidade) : null;
}

function responsavel(valor: string): { responsavelId: string | null; responsavelUsuarioId: string | null } {
  if (valor.startsWith("usuario:")) return { responsavelId: null, responsavelUsuarioId: valor.slice("usuario:".length) || null };
  return { responsavelId: valor || null, responsavelUsuarioId: null };
}

function responsavelSubtarefa(valor: string): { atribuidoAId: string | null; atribuidoAUsuarioId: string | null } {
  if (valor.startsWith("usuario:")) return { atribuidoAId: null, atribuidoAUsuarioId: valor.slice("usuario:".length) || null };
  return { atribuidoAId: valor || null, atribuidoAUsuarioId: null };
}

function lerNovasEtiquetas(formData: FormData): EtiquetaSelecionada[] {
  const valor = texto(formData, "novasEtiquetas");
  if (!valor) return [];
  try {
    const dados: unknown = JSON.parse(valor);
    if (!Array.isArray(dados) || dados.some((item) => !item || typeof item.nome !== "string" || typeof item.cor !== "string")) {
      throw new Error();
    }
    return dados as EtiquetaSelecionada[];
  } catch {
    throw new Error("Não foi possível ler as novas etiquetas. Tente novamente.");
  }
}

/** Aceita a saída do campo monetário (`1234.56`) e também vírgula em chamadas diretas. */
function valorContratado(valor: string): Prisma.Decimal {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(valor)) {
    throw new Error("Informe o valor contratado com até duas casas decimais.");
  }
  return new Prisma.Decimal(valor.replace(",", "."));
}

export async function criarProjetoAction(formData: FormData) {
  const ctx = await obterContexto();
  const projeto = await criarProjeto(ctx, {
    clienteId: texto(formData, "clienteId"),
    nome: texto(formData, "nome"),
    numeroProposta: montarNumeroProposta(texto(formData, "propostaNumero"), texto(formData, "propostaAno")),
    descricao: texto(formData, "descricao") || null,
    valorContratado: valorContratado(texto(formData, "valorContratado")),
    dataInicio: dataOpcional(texto(formData, "dataInicio")),
    dataPrevistaConclusao: dataOpcional(texto(formData, "dataPrevistaConclusao")),
    status: statusProjeto(texto(formData, "status")),
  });
  revalidatePath("/projetos");
  revalidatePath(`/clientes/${projeto.clienteId}`);
  return projeto;
}

export async function criarProjetoERedirecionarAction(formData: FormData) {
  const projeto = await criarProjetoAction(formData);
  redirect(`/projetos/${projeto.id}`);
}

export async function atualizarProjetoAction(projetoId: string, formData: FormData) {
  const ctx = await obterContexto();
  const projeto = await atualizarProjeto(ctx, projetoId, {
    nome: texto(formData, "nome"),
    numeroProposta: montarNumeroProposta(texto(formData, "propostaNumero"), texto(formData, "propostaAno")),
    descricao: texto(formData, "descricao") || null,
    valorContratado: valorContratado(texto(formData, "valorContratado")),
    dataInicio: dataOpcional(texto(formData, "dataInicio")),
    dataPrevistaConclusao: dataOpcional(texto(formData, "dataPrevistaConclusao")),
    status: statusProjeto(texto(formData, "status")),
  });
  if (projeto.status === "CONCLUIDO") void dispararEventoNotificacao(EventoNotificacao.PROJETO_CONCLUIDO, {
    titulo: `Projeto concluído: ${projeto.nome}`,
    mensagem: `O projeto ${projeto.nome} foi marcado como concluído.`,
    url: `/projetos/${projeto.id}`,
    entidadeId: projeto.id,
    dedupeKey: `projeto-concluido:${projeto.id}:${projeto.atualizadoEm.toISOString()}`,
    usuarioIds: [...(await listarAdministradoresAtivos()).filter((usuarioId) => usuarioId !== ctx.usuarioId), ...await listarClientesAtivosDoProjeto(projeto.id)],
    urlCliente: `/portal/${projeto.id}`,
  });
  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/projetos");
  revalidatePath(`/clientes/${projeto.clienteId}`);
  return projeto;
}

export async function alterarStatusProjetoAction(projetoId: string, formData: FormData) {
  const ctx = await obterContexto();
  const status = statusProjeto(texto(formData, "status"));
  if (!status) throw new Error("Status de projeto inválido.");
  const projeto = await atualizarStatusProjeto(ctx, projetoId, status);
  if (projeto.status === "CONCLUIDO") void dispararEventoNotificacao(EventoNotificacao.PROJETO_CONCLUIDO, {
    titulo: `Projeto concluído: ${projeto.nome}`,
    mensagem: `O projeto ${projeto.nome} foi marcado como concluído.`,
    url: `/projetos/${projeto.id}`,
    entidadeId: projeto.id,
    dedupeKey: `projeto-concluido:${projeto.id}:${projeto.atualizadoEm.toISOString()}`,
    usuarioIds: [...(await listarAdministradoresAtivos()).filter((usuarioId) => usuarioId !== ctx.usuarioId), ...await listarClientesAtivosDoProjeto(projeto.id)],
    urlCliente: `/portal/${projeto.id}`,
  });
  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/projetos");
  revalidatePath(`/clientes/${projeto.clienteId}`);
}

export async function atualizarProjetoERedirecionarAction(projetoId: string, formData: FormData) {
  await atualizarProjetoAction(projetoId, formData);
  redirect(`/projetos/${projetoId}`);
}

export async function criarTarefaAction(formData: FormData) {
  const ctx = await obterContexto();
  const dadosResponsavel = responsavel(texto(formData, "responsavelId"));
  const tarefa = await criarTarefa(ctx, {
    projetoId: texto(formData, "projetoId"),
    nome: texto(formData, "nome"),
    descricao: texto(formData, "descricao") || null,
    prazo: dataOpcional(texto(formData, "prazo")) ?? new Date(NaN),
      ...dadosResponsavel,
      periodicidade: periodicidade(texto(formData, "periodicidade")),
      diaSemana: texto(formData, "diaSemana") ? Number(texto(formData, "diaSemana")) : null,
    diasAntecedencia: texto(formData, "diasAntecedencia") ? Number(texto(formData, "diasAntecedencia")) : null,
    status: statusTarefa(texto(formData, "status")),
    colaboradorPodeCriarSubtarefas: formData.get("colaboradorPodeCriarSubtarefas") === "on",
  });
  revalidatePath(`/projetos/${tarefa.projetoId}`);
  revalidatePath("/subtarefas");
  return tarefa;
}

export async function criarTarefaERedirecionarAction(formData: FormData) {
  const tarefa = await criarTarefaAction(formData);
  redirect(`/tarefas/${tarefa.id}`);
}

export async function atualizarTarefaAction(tarefaId: string, formData: FormData) {
  const ctx = await obterContexto();
  const dadosResponsavel = responsavel(texto(formData, "responsavelId"));
  const statusSolicitado = statusTarefa(texto(formData, "status"));
  const pedidoPendente = statusSolicitado === StatusTarefa.CONCLUIDO
    ? await buscarSolicitacaoConclusaoPendente(ctx, "TAREFA", tarefaId)
    : null;
  const tarefa = await atualizarTarefa(ctx, tarefaId, {
    nome: texto(formData, "nome"),
    descricao: texto(formData, "descricao") || null,
    prazo: dataOpcional(texto(formData, "prazo")) ?? new Date(NaN),
      ...dadosResponsavel,
      periodicidade: periodicidade(texto(formData, "periodicidade")),
      diaSemana: texto(formData, "diaSemana") ? Number(texto(formData, "diaSemana")) : null,
    diasAntecedencia: texto(formData, "diasAntecedencia") ? Number(texto(formData, "diasAntecedencia")) : null,
    status: pedidoPendente ? undefined : statusSolicitado,
  });
  if (pedidoPendente) {
    const decisao = await decidirSolicitacaoConclusao(ctx, pedidoPendente.id, true);
    await avisarResultadoConclusao(decisao, true);
    revalidatePath("/subtarefas");
    revalidatePath("/notificacoes");
  }
  revalidatePath(`/tarefas/${tarefaId}`);
  revalidatePath(`/projetos/${tarefa.projetoId}`);
  return tarefa;
}

export async function alterarStatusTarefaAction(tarefaId: string, formData: FormData) {
  const ctx = await obterContexto();
  const status = statusTarefa(texto(formData, "status"));
  if (!status) throw new Error("Status de tarefa inválido.");
  let tarefa;
  let aprovouPedidoPendente = false;
  if (status === StatusTarefa.CONCLUIDO) {
    const pendente = await buscarSolicitacaoConclusaoPendente(ctx, "TAREFA", tarefaId);
    if (pendente) {
      const decisao = await decidirSolicitacaoConclusao(ctx, pendente.id, true);
      tarefa = { id: tarefaId, nome: decisao.titulo, projetoId: decisao.projetoId, status: StatusTarefa.CONCLUIDO, atualizadoEm: decisao.solicitacao.decididoEm ?? new Date() };
      aprovouPedidoPendente = true;
      await avisarResultadoConclusao(decisao, true);
    } else {
      tarefa = (await concluirTarefa(ctx, tarefaId)).tarefa;
    }
  } else {
    tarefa = await atualizarStatusTarefa(ctx, tarefaId, status);
  }
  if (tarefa.status === "CONCLUIDO" && !aprovouPedidoPendente) void dispararEventoNotificacao(EventoNotificacao.TAREFA_CONCLUIDA, {
    titulo: `Tarefa concluída: ${tarefa.nome}`,
    mensagem: `A tarefa ${tarefa.nome} foi marcada como concluída.`,
    url: `/tarefas/${tarefa.id}`,
    entidadeId: tarefa.id,
    dedupeKey: `tarefa-concluida:${tarefa.id}:${tarefa.atualizadoEm.toISOString()}`,
    usuarioIds: [...(await listarAdministradoresAtivos()).filter((usuarioId) => usuarioId !== ctx.usuarioId), ...await listarClientesAtivosDoProjeto(tarefa.projetoId)],
    urlCliente: `/portal/${tarefa.projetoId}`,
  });
  revalidatePath(`/tarefas/${tarefaId}`);
  revalidatePath(`/projetos/${tarefa.projetoId}`);
  revalidatePath("/tarefas");
  revalidatePath("/subtarefas");
}

export async function atualizarTarefaERedirecionarAction(tarefaId: string, formData: FormData) {
  await atualizarTarefaAction(tarefaId, formData);
  redirect(`/tarefas/${tarefaId}`);
}

export async function criarSubtarefaAction(formData: FormData) {
  const ctx = await obterContexto();
  const dadosResponsavel = responsavelSubtarefa(texto(formData, "responsavelId"));
  const subtarefa = await criarSubtarefa(ctx, {
    tarefaId: texto(formData, "tarefaId"),
    titulo: texto(formData, "titulo"),
    descricao: texto(formData, "descricao") || null,
    prazo: dataOpcional(texto(formData, "prazo")),
    status: statusSubtarefa(texto(formData, "status")),
    etiquetas: formData.getAll("etiquetaNome").map(String),
    novasEtiquetas: lerNovasEtiquetas(formData),
    ...dadosResponsavel,
  });
  revalidatePath(`/tarefas/${subtarefa.tarefaId}`);
  revalidatePath(`/minhas-tarefas/${subtarefa.tarefaId}`);
  revalidatePath("/subtarefas");
  return subtarefa;
}

export async function criarSubtarefaFormAction(formData: FormData): Promise<void> {
  await criarSubtarefaAction(formData);
}

export async function criarSubtarefaERedirecionarAction(formData: FormData): Promise<void> {
  const ctx = await obterContexto();
  const subtarefa = await criarSubtarefaAction(formData);
  if (subtarefa) redirect(ctx.perfil === "ADMIN" ? `/tarefas/${subtarefa.tarefaId}?subtarefa=${subtarefa.id}` : `/minhas-tarefas/${subtarefa.tarefaId}`);
}

export async function criarComentarioAction(formData: FormData): Promise<void> {
  const ctx = await obterContexto();
  const nivel = texto(formData, "nivel");
  const id = texto(formData, "entidadeId");
  const alvo = nivel === "projeto" ? { projetoId: id } : nivel === "tarefa" ? { tarefaId: id } : { subtarefaId: id };
  const imagem = formData.get("imagem");
  const mencoesUsuarioIds = formData.getAll("mencaoUsuarioId").map(String);
  const comentario = await criarComentario(ctx, alvo, texto(formData, "texto"), texto(formData, "link"), imagem instanceof File ? imagem : null, mencoesUsuarioIds);
  const rotaRegistro = nivel === "projeto"
    ? `${ctx.perfil === "ADMIN" ? "/projetos" : "/meus-projetos"}/${id}`
    : `${ctx.perfil === "ADMIN" ? "/tarefas" : "/minhas-tarefas"}/${nivel === "tarefa" ? id : texto(formData, "tarefaId")}`;
  const destinatariosComAcesso = await listarUsuariosMencionaveis(ctx, alvo);
  const projetoIdPortal = nivel === "projeto" ? id : await buscarProjetoAtivoDaTarefa(nivel === "tarefa" ? id : texto(formData, "tarefaId"));
  const clientesDestinatarios = projetoIdPortal ? await listarClientesAtivosDoProjeto(projetoIdPortal) : [];
  const destinatariosDeAviso = [...destinatariosComAcesso.map(({ id: usuarioId }) => usuarioId), ...clientesDestinatarios];
  const urlCliente = projetoIdPortal ? `/portal/${projetoIdPortal}` : undefined;
  if (mencoesUsuarioIds.length) {
    void dispararNotificacoesMencaoComentario({ destinatarioIds: [ctx.usuarioId, ...mencoesUsuarioIds], autorId: ctx.usuarioId, comentario: comentario.texto, url: rotaRegistro, entidadeId: comentario.id });
    void dispararEventoNotificacao(EventoNotificacao.NOVO_COMENTARIO, {
      titulo: "Novo comentário",
      mensagem: "Um novo comentário foi publicado em um registro que você acompanha.",
      url: rotaRegistro,
      entidadeId: comentario.id,
      dedupeKey: `comentario:${comentario.id}`,
      usuarioIds: destinatariosDeAviso.filter((usuarioId) => usuarioId !== ctx.usuarioId && !mencoesUsuarioIds.includes(usuarioId)),
      urlCliente,
    });
  } else void dispararEventoNotificacao(EventoNotificacao.NOVO_COMENTARIO, {
    titulo: "Novo comentário",
    mensagem: "Um novo comentário foi publicado em um registro que você acompanha.",
    url: rotaRegistro,
    entidadeId: comentario.id,
    dedupeKey: `comentario:${comentario.id}`,
    usuarioIds: destinatariosDeAviso.filter((usuarioId) => usuarioId !== ctx.usuarioId),
    urlCliente,
  });
  if (nivel === "projeto") revalidatePath(`/projetos/${id}`);
  if (nivel === "tarefa") revalidatePath(`/tarefas/${id}`);
  if (nivel === "subtarefa") revalidatePath(`/tarefas/${texto(formData, "tarefaId")}`);
}

export async function atualizarSubtarefaAction(subtarefaId: string, formData: FormData) {
  const ctx = await obterContexto();
  const dadosResponsavel = responsavelSubtarefa(texto(formData, "responsavelId"));
  const statusSolicitado = statusSubtarefa(texto(formData, "status"));
  const pedidoPendente = statusSolicitado === StatusSubtarefa.CONCLUIDO
    ? await buscarSolicitacaoConclusaoPendente(ctx, "SUBTAREFA", subtarefaId)
    : null;
  const subtarefa = await atualizarSubtarefa(ctx, subtarefaId, {
    titulo: texto(formData, "titulo"),
    descricao: texto(formData, "descricao") || null,
    prazo: dataOpcional(texto(formData, "prazo")),
    status: pedidoPendente ? undefined : statusSolicitado,
    etiquetas: formData.getAll("etiquetaNome").map(String),
    novasEtiquetas: lerNovasEtiquetas(formData),
    ...dadosResponsavel,
  });
  if (pedidoPendente) {
    const decisao = await decidirSolicitacaoConclusao(ctx, pedidoPendente.id, true);
    await avisarResultadoConclusao(decisao, true);
  }
  revalidatePath(`/tarefas/${subtarefa.tarefaId}`);
  revalidatePath(`/minhas-tarefas/${subtarefa.tarefaId}`);
  revalidatePath("/subtarefas");
  return subtarefa;
}

export async function atualizarSubtarefaFormAction(subtarefaId: string, formData: FormData): Promise<void> {
  await atualizarSubtarefaAction(subtarefaId, formData);
}

export async function atualizarSubtarefaERedirecionarAction(subtarefaId: string, formData: FormData): Promise<void> {
  const subtarefa = await atualizarSubtarefaAction(subtarefaId, formData);
  redirect(`/tarefas/${subtarefa.tarefaId}?subtarefa=${subtarefa.id}#subtarefa-${subtarefa.id}`);
}

export async function atualizarResponsavelSubtarefaFormAction(subtarefaId: string, formData: FormData): Promise<void> {
  const ctx = await obterContexto();
  const dados = responsavelSubtarefa(texto(formData, "responsavelId"));
  const subtarefa = await atualizarResponsavelSubtarefa(ctx, subtarefaId, dados.atribuidoAId, dados.atribuidoAUsuarioId);
  revalidatePath(`/tarefas/${subtarefa.tarefaId}`);
}

export async function criarDocumentoProjetoAction(formData: FormData) {
  const ctx = await obterContexto();
  const documento = await criarDocumentoProjeto(ctx, {
    clienteId: texto(formData, "clienteId"),
    projetoId: texto(formData, "projetoId") || null,
    nome: texto(formData, "nome"),
    link: texto(formData, "link"),
  });
  revalidatePath(`/projetos/${documento.projetoId ?? ""}`);
  void documento;
}

export async function criarDocumentoProjetoFormAction(formData: FormData): Promise<void> {
  await criarDocumentoProjetoAction(formData);
}

export async function concluirTarefaAction(tarefaId: string) {
  const ctx = await obterContexto();
  if (ctx.perfil === "ADMIN") {
    const resultado = await concluirTarefa(ctx, tarefaId);
    void dispararEventoNotificacao(EventoNotificacao.TAREFA_CONCLUIDA, {
      titulo: `Tarefa concluída: ${resultado.tarefa.nome}`,
      mensagem: `A tarefa ${resultado.tarefa.nome} foi marcada como concluída.`,
      url: `/tarefas/${tarefaId}`,
      entidadeId: tarefaId,
      dedupeKey: `tarefa-concluida:${tarefaId}:${resultado.tarefa.atualizadoEm.toISOString()}`,
      usuarioIds: [...(await listarAdministradoresAtivos()).filter((usuarioId) => usuarioId !== ctx.usuarioId), ...await listarClientesAtivosDoProjeto(resultado.tarefa.projetoId)],
      urlCliente: `/portal/${resultado.tarefa.projetoId}`,
    });
    revalidatePath(`/tarefas/${tarefaId}`);
    revalidatePath(`/minhas-tarefas/${tarefaId}`);
    revalidatePath(`/projetos/${resultado.tarefa.projetoId}`);
    revalidatePath("/subtarefas");
    return;
  }

  const resultado = await solicitarConclusao(ctx, "TAREFA", tarefaId);
  void dispararEventoNotificacao(EventoNotificacao.CONCLUSAO_SOLICITADA, {
    titulo: "Conclusão aguardando confirmação",
    mensagem: `Um colaborador solicitou a conclusão da tarefa ${resultado.titulo}.`,
    url: `/subtarefas?conclusao=${resultado.solicitacao.id}#solicitacao-${resultado.solicitacao.id}`,
    entidadeId: resultado.solicitacao.id,
    dedupeKey: `solicitacao-conclusao:${resultado.solicitacao.id}:pendente`,
    usuarioIds: await listarAdministradoresAtivos(),
  });
  revalidatePath(`/tarefas/${tarefaId}`);
  revalidatePath(`/minhas-tarefas/${tarefaId}`);
  revalidatePath("/notificacoes");
  revalidatePath("/subtarefas");
}

export async function concluirTarefaFormAction(tarefaId: string): Promise<void> {
  await concluirTarefaAction(tarefaId);
}

export async function concluirSubtarefaAction(subtarefaId: string) {
  const ctx = await obterContexto();
  const resultado = await solicitarConclusao(ctx, "SUBTAREFA", subtarefaId);
  void dispararEventoNotificacao(EventoNotificacao.CONCLUSAO_SOLICITADA, {
    titulo: "Conclusão aguardando confirmação",
    mensagem: `Um colaborador solicitou a conclusão da subtarefa ${resultado.titulo}.`,
    url: `/subtarefas?conclusao=${resultado.solicitacao.id}#solicitacao-${resultado.solicitacao.id}`,
    entidadeId: resultado.solicitacao.id,
    dedupeKey: `solicitacao-conclusao:${resultado.solicitacao.id}:pendente`,
    usuarioIds: await listarAdministradoresAtivos(),
  });
  revalidatePath(`/tarefas/${resultado.tarefaId}`);
  revalidatePath(`/minhas-tarefas/${resultado.tarefaId}`);
  revalidatePath("/notificacoes");
  revalidatePath("/subtarefas");
}

export async function atualizarStatusSubtarefaAction(subtarefaId: string, formData: FormData) {
  const ctx = await obterContexto();
  const status = statusSubtarefa(texto(formData, "status"));
  if (!status) throw new Error("Status de subtarefa inválido.");
  let subtarefa;
  if (status === StatusSubtarefa.CONCLUIDO) {
    const pendente = await buscarSolicitacaoConclusaoPendente(ctx, "SUBTAREFA", subtarefaId);
    if (pendente) {
      const decisao = await decidirSolicitacaoConclusao(ctx, pendente.id, true);
      subtarefa = { tarefaId: decisao.tarefaId };
      await avisarResultadoConclusao(decisao, true);
    } else {
      subtarefa = await atualizarStatusSubtarefa(ctx, subtarefaId, status);
    }
  } else {
    subtarefa = await atualizarStatusSubtarefa(ctx, subtarefaId, status);
  }
  revalidatePath(`/tarefas/${subtarefa.tarefaId}`);
  revalidatePath(`/minhas-tarefas/${subtarefa.tarefaId}`);
  revalidatePath("/notificacoes");
  revalidatePath("/subtarefas");
}

async function avisarResultadoConclusao(
  decisao: Awaited<ReturnType<typeof decidirSolicitacaoConclusao>>,
  aprovada: boolean,
) {
  if (decisao.solicitanteId) void dispararEventoNotificacao(EventoNotificacao.CONCLUSAO_SOLICITADA, {
    titulo: aprovada ? "Conclusão confirmada" : "Conclusão não confirmada",
    mensagem: aprovada
      ? `A conclusão de ${decisao.tipo === "TAREFA" ? "tarefa" : "subtarefa"} ${decisao.titulo} foi confirmada pela Talita.`
      : `A solicitação de conclusão de ${decisao.tipo === "TAREFA" ? "tarefa" : "subtarefa"} ${decisao.titulo} foi rejeitada.${decisao.solicitacao.comentarioDecisao ? ` Comentário: ${decisao.solicitacao.comentarioDecisao}` : ""}`,
    url: `/minhas-tarefas/${decisao.tarefaId}`,
    entidadeId: decisao.solicitacao.id,
    dedupeKey: `solicitacao-conclusao:${decisao.solicitacao.id}:${aprovada ? "aprovada" : "rejeitada"}`,
    usuarioIds: [decisao.solicitanteId],
  });
  if (aprovada && decisao.tipo === "TAREFA") void dispararEventoNotificacao(EventoNotificacao.TAREFA_CONCLUIDA, {
    titulo: `Tarefa concluída: ${decisao.titulo}`,
    mensagem: `A tarefa ${decisao.titulo} foi confirmada como concluída.`,
    url: `/tarefas/${decisao.itemId}`,
    entidadeId: decisao.itemId,
    dedupeKey: `tarefa-concluida:${decisao.itemId}:${decisao.solicitacao.decididoEm?.toISOString() ?? "aprovada"}`,
    usuarioIds: [...(await listarAdministradoresAtivos()).filter((usuarioId) => usuarioId !== decisao.solicitacao.decididoPorId), ...await listarClientesAtivosDoProjeto(decisao.projetoId)],
    urlCliente: `/portal/${decisao.projetoId}`,
  });
}

export async function decidirSolicitacaoConclusaoFormAction(solicitacaoId: string, formData: FormData): Promise<void> {
  const ctx = await obterContexto();
  const decisaoForm = texto(formData, "decisao");
  if (decisaoForm !== "APROVAR" && decisaoForm !== "REJEITAR") throw new Error("Decisão de conclusão inválida.");
  const decisao = await decidirSolicitacaoConclusao(ctx, solicitacaoId, decisaoForm === "APROVAR", texto(formData, "comentario") || null);
  await avisarResultadoConclusao(decisao, decisaoForm === "APROVAR");
  revalidatePath("/subtarefas");
  revalidatePath("/notificacoes");
  revalidatePath(`/tarefas/${decisao.tarefaId}`);
  revalidatePath(`/minhas-tarefas/${decisao.tarefaId}`);
  revalidatePath("/tarefas");
  revalidatePath(`/projetos/${decisao.projetoId}`);
}

export async function cancelarSolicitacaoConclusaoFormAction(solicitacaoId: string): Promise<void> {
  const ctx = await obterContexto();
  const solicitacao = await cancelarSolicitacaoConclusao(ctx, solicitacaoId);
  revalidatePath("/subtarefas");
  revalidatePath("/notificacoes");
  if (solicitacao.tarefaId) {
    revalidatePath(`/minhas-tarefas/${solicitacao.tarefaId}`);
    revalidatePath(`/tarefas/${solicitacao.tarefaId}`);
  }
}

export async function concluirSubtarefaFormAction(subtarefaId: string): Promise<void> {
  await concluirSubtarefaAction(subtarefaId);
}

export async function definirAtivoProjetoAction(id: string, ativo: boolean) {
  const ctx = await obterContexto();
  const resultado = await desativarOuReativar(ctx, "projeto", id, ativo);
  revalidatePath("/projetos");
  revalidatePath(`/projetos/${id}`);
  void resultado;
}

export async function definirAtivoProjetoFormAction(id: string, ativo: boolean): Promise<void> {
  await definirAtivoProjetoAction(id, ativo);
}

export async function definirAtivoTarefaAction(id: string, ativo: boolean) {
  const ctx = await obterContexto();
  const resultado = await desativarOuReativar(ctx, "tarefa", id, ativo);
  revalidatePath("/tarefas");
  revalidatePath(`/tarefas/${id}`);
  revalidatePath("/subtarefas");
  revalidatePath("/agenda");
  return resultado;
}

export async function definirAtivoTarefaFormAction(id: string, ativo: boolean): Promise<void> {
  await definirAtivoTarefaAction(id, ativo);
}

/** RF-039 — exclusão lógica: preserva histórico, comentários e subtarefas. */
export async function excluirTarefaAction(id: string): Promise<void> {
  await definirAtivoTarefaAction(id, false);
  redirect("/tarefas");
}

export async function definirAtivoSubtarefaAction(id: string, ativo: boolean) {
  const ctx = await obterContexto();
  const resultado = await desativarOuReativar(ctx, "subtarefa", id, ativo);
  return resultado;
}
