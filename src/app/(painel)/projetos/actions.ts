"use server";

import { revalidatePath } from "next/cache";
import { obterContexto } from "@/server/auth/contexto";
import {
  atualizarProjeto,
  atualizarSubtarefa,
  atualizarTarefa,
  concluirSubtarefa,
  concluirTarefa,
  criarDocumentoProjeto,
  criarProjeto,
  criarSubtarefa,
  criarTarefa,
  desativarOuReativar,
} from "@/lib/projetos-tarefas";
import { StatusProjeto, StatusTarefa, Periodicidade } from "@prisma/client";

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

function periodicidade(valor: string): Periodicidade | null {
  return Object.values(Periodicidade).includes(valor as Periodicidade) ? (valor as Periodicidade) : null;
}

export async function criarProjetoAction(formData: FormData) {
  const ctx = await obterContexto();
  const projeto = await criarProjeto(ctx, {
    clienteId: texto(formData, "clienteId"),
    nome: texto(formData, "nome"),
    descricao: texto(formData, "descricao") || null,
    dataInicio: dataOpcional(texto(formData, "dataInicio")),
    dataPrevistaConclusao: dataOpcional(texto(formData, "dataPrevistaConclusao")),
    status: statusProjeto(texto(formData, "status")),
  });
  revalidatePath("/projetos");
  return projeto;
}

export async function atualizarProjetoAction(projetoId: string, formData: FormData) {
  const ctx = await obterContexto();
  const projeto = await atualizarProjeto(ctx, projetoId, {
    nome: texto(formData, "nome"),
    descricao: texto(formData, "descricao") || null,
    dataInicio: dataOpcional(texto(formData, "dataInicio")),
    dataPrevistaConclusao: dataOpcional(texto(formData, "dataPrevistaConclusao")),
    status: statusProjeto(texto(formData, "status")),
  });
  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/projetos");
  return projeto;
}

export async function criarTarefaAction(formData: FormData) {
  const ctx = await obterContexto();
  const tarefa = await criarTarefa(ctx, {
    projetoId: texto(formData, "projetoId"),
    nome: texto(formData, "nome"),
    descricao: texto(formData, "descricao") || null,
    prazo: dataOpcional(texto(formData, "prazo")) ?? new Date(NaN),
    responsavelId: texto(formData, "responsavelId") || null,
    periodicidade: periodicidade(texto(formData, "periodicidade")),
    diasAntecedencia: texto(formData, "diasAntecedencia") ? Number(texto(formData, "diasAntecedencia")) : null,
    status: statusTarefa(texto(formData, "status")),
  });
  revalidatePath(`/projetos/${tarefa.projetoId}`);
  revalidatePath("/prazos");
  return tarefa;
}

export async function atualizarTarefaAction(tarefaId: string, formData: FormData) {
  const ctx = await obterContexto();
  const tarefa = await atualizarTarefa(ctx, tarefaId, {
    nome: texto(formData, "nome"),
    descricao: texto(formData, "descricao") || null,
    prazo: dataOpcional(texto(formData, "prazo")) ?? new Date(NaN),
    responsavelId: texto(formData, "responsavelId") || null,
    periodicidade: periodicidade(texto(formData, "periodicidade")),
    diasAntecedencia: texto(formData, "diasAntecedencia") ? Number(texto(formData, "diasAntecedencia")) : null,
    status: statusTarefa(texto(formData, "status")),
  });
  revalidatePath(`/tarefas/${tarefaId}`);
  revalidatePath(`/projetos/${tarefa.projetoId}`);
  return tarefa;
}

export async function criarSubtarefaAction(formData: FormData) {
  const ctx = await obterContexto();
  const subtarefa = await criarSubtarefa(ctx, {
    tarefaId: texto(formData, "tarefaId"),
    titulo: texto(formData, "titulo"),
    etiquetas: texto(formData, "etiquetas")
      ? texto(formData, "etiquetas").split(",").map((etiqueta) => etiqueta.trim()).filter(Boolean)
      : [],
    atribuidoAId: texto(formData, "atribuidoAId") || null,
  });
  revalidatePath(`/tarefas/${subtarefa.tarefaId}`);
  return subtarefa;
}

export async function atualizarSubtarefaAction(subtarefaId: string, formData: FormData) {
  const ctx = await obterContexto();
  const subtarefa = await atualizarSubtarefa(ctx, subtarefaId, {
    titulo: texto(formData, "titulo"),
    etiquetas: texto(formData, "etiquetas")
      ? texto(formData, "etiquetas").split(",").map((etiqueta) => etiqueta.trim()).filter(Boolean)
      : [],
    atribuidoAId: texto(formData, "atribuidoAId") || null,
  });
  revalidatePath(`/tarefas/${subtarefa.tarefaId}`);
  return subtarefa;
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
  return documento;
}

export async function concluirTarefaAction(tarefaId: string) {
  const ctx = await obterContexto();
  const resultado = await concluirTarefa(ctx, tarefaId);
  revalidatePath(`/tarefas/${tarefaId}`);
  revalidatePath(`/projetos/${resultado.tarefa.projetoId}`);
  revalidatePath("/prazos");
  return resultado;
}

export async function concluirSubtarefaAction(subtarefaId: string) {
  const ctx = await obterContexto();
  const subtarefa = await concluirSubtarefa(ctx, subtarefaId);
  revalidatePath(`/tarefas/${subtarefa.tarefaId}`);
  return subtarefa;
}

export async function definirAtivoProjetoAction(id: string, ativo: boolean) {
  const ctx = await obterContexto();
  const resultado = await desativarOuReativar(ctx, "projeto", id, ativo);
  revalidatePath("/projetos");
  revalidatePath(`/projetos/${id}`);
  return resultado;
}

export async function definirAtivoTarefaAction(id: string, ativo: boolean) {
  const ctx = await obterContexto();
  const resultado = await desativarOuReativar(ctx, "tarefa", id, ativo);
  revalidatePath("/prazos");
  return resultado;
}

export async function definirAtivoSubtarefaAction(id: string, ativo: boolean) {
  const ctx = await obterContexto();
  const resultado = await desativarOuReativar(ctx, "subtarefa", id, ativo);
  return resultado;
}
