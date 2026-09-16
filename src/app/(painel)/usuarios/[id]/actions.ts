"use server";

import { revalidatePath } from "next/cache";
import type { EntidadeTipo } from "@prisma/client";
import { exigirAdmin } from "@/server/auth/contexto";
import { adicionarAtribuicao } from "@/lib/usuarios";

export type EstadoAtribuicao = { erro?: string; sucessoEm?: number };

export async function adicionarAtribuicaoAction(
  usuarioId: string,
  _estadoAnterior: EstadoAtribuicao,
  formData: FormData,
): Promise<EstadoAtribuicao> {
  const ctx = await exigirAdmin();

  const [tipo, entidadeId] = String(formData.get("atribuicao") ?? "").split(":");
  if ((tipo !== "PROJETO" && tipo !== "TAREFA") || !entidadeId) {
    return { erro: "Selecione o que atribuir." };
  }

  const resultado = await adicionarAtribuicao(ctx, usuarioId, {
    entidadeTipo: tipo as EntidadeTipo,
    entidadeId,
  });

  if (!resultado.sucesso) {
    const mensagens: Record<typeof resultado.motivo, string> = {
      sem_permissao: "Ação restrita ao Administrador.",
      nao_encontrado: "Usuário não encontrado.",
      incompativel_com_perfil:
        "Colaborador Interno é atribuído por projeto e Externo por tarefa (RN-005).",
      automatica: "Esta atribuição é automática.",
    };
    return { erro: mensagens[resultado.motivo] };
  }

  revalidatePath(`/usuarios/${usuarioId}`);
  return { sucessoEm: Date.now() };
}
