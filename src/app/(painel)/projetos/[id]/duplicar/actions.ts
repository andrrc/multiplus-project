"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { duplicarProjeto, ProjetoIndisponivelParaDuplicacao } from "@/lib/duplicar-projeto";
import { exigirAdmin } from "@/server/auth/contexto";

export async function duplicarProjetoAction(projetoId: string, clienteId: string) {
  const ctx = await exigirAdmin();
  let novoProjeto;
  try {
    novoProjeto = await duplicarProjeto(ctx, projetoId, clienteId);
  } catch (erro) {
    if (erro instanceof ProjetoIndisponivelParaDuplicacao) return erro.message;
    throw erro;
  }

  revalidatePath("/projetos");
  revalidatePath("/tarefas");
  revalidatePath("/subtarefas");
  revalidatePath(`/clientes/${novoProjeto.clienteId}`);
  redirect(`/projetos/${novoProjeto.id}`);
}
