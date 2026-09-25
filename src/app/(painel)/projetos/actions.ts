"use server";

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
  concluirSubtarefa,
  concluirTarefa,
  criarDocumentoProjeto,
  criarProjeto,
  criarSubtarefa,
  criarTarefa,
  desativarOuReativar,
} from "@/lib/projetos-tarefas";
import { criarComentario } from "@/lib/comentarios";
import { dispararEventoNotificacao } from "@/lib/notificacoes";

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
    diasAntecedencia: texto(formData, "diasAntecedencia") ? Number(texto(formData, "diasAntecedencia")) : null,
    status: statusTarefa(texto(formData, "status")),
  });
  revalidatePath(`/projetos/${tarefa.projetoId}`);
  revalidatePath("/prazos");
  return tarefa;
}

export async function criarTarefaERedirecionarAction(formData: FormData) {
  const tarefa = await criarTarefaAction(formData);
  redirect(`/tarefas/${tarefa.id}`);
}

export async function atualizarTarefaAction(tarefaId: string, formData: FormData) {
  const ctx = await obterContexto();
  const dadosResponsavel = responsavel(texto(formData, "responsavelId"));
  const tarefa = await atualizarTarefa(ctx, tarefaId, {
    nome: texto(formData, "nome"),
    descricao: texto(formData, "descricao") || null,
    prazo: dataOpcional(texto(formData, "prazo")) ?? new Date(NaN),
    ...dadosResponsavel,
    periodicidade: periodicidade(texto(formData, "periodicidade")),
    diasAntecedencia: texto(formData, "diasAntecedencia") ? Number(texto(formData, "diasAntecedencia")) : null,
    status: statusTarefa(texto(formData, "status")),
  });
  revalidatePath(`/tarefas/${tarefaId}`);
  revalidatePath(`/projetos/${tarefa.projetoId}`);
  return tarefa;
}

export async function alterarStatusTarefaAction(tarefaId: string, formData: FormData) {
  const ctx = await obterContexto();
  const status = statusTarefa(texto(formData, "status"));
  if (!status) throw new Error("Status de tarefa inválido.");
  const tarefa = await atualizarStatusTarefa(ctx, tarefaId, status);
  if (tarefa.status === "CONCLUIDO") void dispararEventoNotificacao(EventoNotificacao.TAREFA_CONCLUIDA, {
    titulo: `Tarefa concluída: ${tarefa.nome}`,
    mensagem: `A tarefa ${tarefa.nome} foi marcada como concluída.`,
    url: `/tarefas/${tarefa.id}`,
    entidadeId: tarefa.id,
    dedupeKey: `tarefa-concluida:${tarefa.id}:${tarefa.atualizadoEm.toISOString()}`,
  });
  revalidatePath(`/tarefas/${tarefaId}`);
  revalidatePath(`/projetos/${tarefa.projetoId}`);
  revalidatePath("/tarefas");
  revalidatePath("/prazos");
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
    etiquetas: texto(formData, "etiquetas")
      ? texto(formData, "etiquetas").split(",").map((etiqueta) => etiqueta.trim()).filter(Boolean)
      : [],
    ...dadosResponsavel,
  });
  revalidatePath(`/tarefas/${subtarefa.tarefaId}`);
  return subtarefa;
}

export async function criarSubtarefaFormAction(formData: FormData): Promise<void> {
  await criarSubtarefaAction(formData);
}

export async function criarSubtarefaERedirecionarAction(formData: FormData): Promise<void> {
  const subtarefa = await criarSubtarefaAction(formData);
  if (subtarefa) redirect(`/tarefas/${subtarefa.tarefaId}?subtarefa=${subtarefa.id}`);
}

export async function criarComentarioAction(formData: FormData): Promise<void> {
  const ctx = await obterContexto();
  const nivel = texto(formData, "nivel");
  const id = texto(formData, "entidadeId");
  const alvo = nivel === "projeto" ? { projetoId: id } : nivel === "tarefa" ? { tarefaId: id } : { subtarefaId: id };
  const imagem = formData.get("imagem");
  const comentario = await criarComentario(ctx, alvo, texto(formData, "texto"), texto(formData, "link"), imagem instanceof File ? imagem : null);
  void dispararEventoNotificacao(EventoNotificacao.NOVO_COMENTARIO, {
    titulo: "Novo comentário",
    mensagem: "Um novo comentário foi publicado em um registro que você acompanha.",
    url: nivel === "projeto" ? `/projetos/${id}` : `/tarefas/${nivel === "tarefa" ? id : texto(formData, "tarefaId")}`,
    entidadeId: comentario.id,
    dedupeKey: `comentario:${comentario.id}`,
  });
  if (nivel === "projeto") revalidatePath(`/projetos/${id}`);
  if (nivel === "tarefa") revalidatePath(`/tarefas/${id}`);
  if (nivel === "subtarefa") revalidatePath(`/tarefas/${texto(formData, "tarefaId")}`);
}

export async function atualizarSubtarefaAction(subtarefaId: string, formData: FormData) {
  const ctx = await obterContexto();
  const dadosResponsavel = responsavelSubtarefa(texto(formData, "responsavelId"));
  const subtarefa = await atualizarSubtarefa(ctx, subtarefaId, {
    titulo: texto(formData, "titulo"),
    descricao: texto(formData, "descricao") || null,
    prazo: dataOpcional(texto(formData, "prazo")),
    status: statusSubtarefa(texto(formData, "status")),
    etiquetas: texto(formData, "etiquetas")
      ? texto(formData, "etiquetas").split(",").map((etiqueta) => etiqueta.trim()).filter(Boolean)
      : [],
    ...dadosResponsavel,
  });
  revalidatePath(`/tarefas/${subtarefa.tarefaId}`);
  return subtarefa;
}

export async function atualizarSubtarefaFormAction(subtarefaId: string, formData: FormData): Promise<void> {
  await atualizarSubtarefaAction(subtarefaId, formData);
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
  const resultado = await concluirTarefa(ctx, tarefaId);
  void dispararEventoNotificacao(EventoNotificacao.TAREFA_CONCLUIDA, {
    titulo: `Tarefa concluída: ${resultado.tarefa.nome}`,
    mensagem: `A tarefa ${resultado.tarefa.nome} foi marcada como concluída.`,
    url: `/tarefas/${tarefaId}`,
    entidadeId: tarefaId,
    dedupeKey: `tarefa-concluida:${tarefaId}:${resultado.tarefa.atualizadoEm.toISOString()}`,
  });
  revalidatePath(`/tarefas/${tarefaId}`);
  revalidatePath(`/projetos/${resultado.tarefa.projetoId}`);
  revalidatePath("/prazos");
  void resultado;
}

export async function concluirTarefaFormAction(tarefaId: string): Promise<void> {
  await concluirTarefaAction(tarefaId);
}

export async function concluirSubtarefaAction(subtarefaId: string) {
  const ctx = await obterContexto();
  const subtarefa = await concluirSubtarefa(ctx, subtarefaId);
  revalidatePath(`/tarefas/${subtarefa.tarefaId}`);
  revalidatePath(`/minhas-tarefas/${subtarefa.tarefaId}`);
  revalidatePath("/prazos");
  void subtarefa;
}

export async function atualizarStatusSubtarefaAction(subtarefaId: string, formData: FormData) {
  const ctx = await obterContexto();
  const status = statusSubtarefa(texto(formData, "status"));
  if (!status) throw new Error("Status de subtarefa inválido.");
  const subtarefa = await atualizarStatusSubtarefa(ctx, subtarefaId, status);
  revalidatePath(`/tarefas/${subtarefa.tarefaId}`);
  revalidatePath("/prazos");
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
  revalidatePath("/prazos");
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
