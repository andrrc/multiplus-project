"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/server/auth/contexto";
import { salvarAnotacaoLaudo, definirAnotacaoLaudoAtiva } from "@/lib/laudos-tecnicos";
import type { DadosAnotacaoInput } from "@/lib/validacao-laudo";

export async function salvarAnotacaoLaudoAction(clienteId: string, laudoId: string, dados: DadosAnotacaoInput, id?: string, versao?: number): Promise<{ erro?: string }> {
  const ctx = await exigirAdmin();
  try { await salvarAnotacaoLaudo(ctx, clienteId, laudoId, dados, id, versao); }
  catch (error) { if (error instanceof Error) return { erro: error.message }; throw error; }
  revalidatePath(`/clientes/${clienteId}`);
  return {};
}

export async function definirAnotacaoLaudoAtivaAction(clienteId: string, laudoId: string, id: string, versao: number, ativo: boolean): Promise<{ erro?: string }> {
  const ctx = await exigirAdmin();
  try { await definirAnotacaoLaudoAtiva(ctx, clienteId, laudoId, id, versao, ativo); }
  catch (error) { if (error instanceof Error) return { erro: error.message }; throw error; }
  revalidatePath(`/clientes/${clienteId}`);
  return {};
}
