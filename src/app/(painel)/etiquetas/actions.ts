"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAdmin } from "@/server/auth/contexto";
import { atualizarEtiquetaGerenciada, criarEtiquetaGerenciada, excluirEtiquetaGerenciada } from "@/lib/etiquetas";

function valor(formData: FormData, chave: string) {
  return String(formData.get(chave) ?? "").trim();
}

function codigoErro(erro: unknown) {
  const mensagem = erro instanceof Error ? erro.message : "Não foi possível salvar a etiqueta.";
  if (mensagem.includes("Já existe")) return "duplicada";
  if (mensagem.includes("1 e 40 caracteres")) return "nome";
  if (mensagem.includes("cor disponível")) return "cor";
  if (mensagem.includes("não está mais") || mensagem.includes("já foi removida")) return "indisponivel";
  return "falha";
}

function invalidarListagens() {
  revalidatePath("/etiquetas");
  revalidatePath("/tarefas");
  revalidatePath("/minhas-tarefas");
  revalidatePath("/subtarefas");
}

export async function criarEtiquetaAction(formData: FormData): Promise<void> {
  const ctx = await exigirAdmin();
  let erro: string | null = null;
  try {
    await criarEtiquetaGerenciada(ctx, { nome: valor(formData, "nome"), cor: valor(formData, "cor") });
  } catch (falha) {
    erro = codigoErro(falha);
  }
  if (erro) redirect(`/etiquetas?erro=${erro}#nova-etiqueta`);
  invalidarListagens();
  redirect("/etiquetas?resultado=criada#catalogo-etiquetas");
}

export async function atualizarEtiquetaAction(id: string, formData: FormData): Promise<void> {
  const ctx = await exigirAdmin();
  let erro: string | null = null;
  try {
    await atualizarEtiquetaGerenciada(ctx, id, { nome: valor(formData, "nome"), cor: valor(formData, "cor") });
  } catch (falha) {
    erro = codigoErro(falha);
  }
  if (erro) redirect(`/etiquetas?erro=${erro}#etiqueta-${encodeURIComponent(id)}`);
  invalidarListagens();
  redirect(`/etiquetas?resultado=atualizada#etiqueta-${encodeURIComponent(id)}`);
}

export async function excluirEtiquetaAction(id: string): Promise<void> {
  const ctx = await exigirAdmin();
  let resultado: Awaited<ReturnType<typeof excluirEtiquetaGerenciada>> | null = null;
  let erro: string | null = null;
  try {
    resultado = await excluirEtiquetaGerenciada(ctx, id);
  } catch (falha) {
    erro = codigoErro(falha);
  }
  if (erro) redirect(`/etiquetas?erro=${erro}#catalogo-etiquetas`);
  invalidarListagens();
  redirect(`/etiquetas?resultado=excluida&usos=${resultado?.quantidadeSubtarefas ?? 0}#catalogo-etiquetas`);
}
