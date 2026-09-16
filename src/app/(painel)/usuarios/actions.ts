"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/server/auth/contexto";
import { definirAtivo } from "@/lib/desativacao";
import { reenviarConvite, removerAtribuicao } from "@/lib/usuarios";

export type EstadoAcaoUsuario = { erro?: string; mensagem?: string };

/**
 * RF-039 — desativar/reativar usuário. `exigirAdmin` barra aqui (RN-007), `definirAtivo`
 * confere de novo, e a política `usuarios_write` é a palavra final no banco.
 */
export async function definirUsuarioAtivoAction(
  usuarioId: string,
  ativo: boolean,
): Promise<EstadoAcaoUsuario> {
  const ctx = await exigirAdmin();

  const resultado = await definirAtivo(ctx, "usuario", usuarioId, ativo);
  if (!resultado.sucesso) {
    const mensagens: Record<typeof resultado.motivo, string> = {
      sem_permissao: "Ação restrita ao Administrador.",
      auto_desativacao: "Você não pode desativar o próprio acesso.",
      nao_encontrado: "Usuário não encontrado.",
    };
    return { erro: mensagens[resultado.motivo] };
  }

  revalidatePath("/usuarios");
  return { mensagem: ativo ? "Usuário reativado." : "Usuário desativado." };
}

/** RF-040 — "Reenviar convite" da Tela A1, disponível enquanto a pessoa não definiu senha. */
export async function reenviarConviteAction(usuarioId: string): Promise<EstadoAcaoUsuario> {
  const ctx = await exigirAdmin();

  const resultado = await reenviarConvite(ctx, usuarioId);
  if (!resultado.sucesso) {
    const mensagens: Record<typeof resultado.motivo, string> = {
      sem_permissao: "Ação restrita ao Administrador.",
      nao_encontrado: "Usuário não encontrado.",
      ja_ativou: "Esta pessoa já definiu a senha — não há convite pendente.",
    };
    return { erro: mensagens[resultado.motivo] };
  }

  revalidatePath("/usuarios");
  return resultado.convite === "enviado"
    ? { mensagem: "Convite reenviado." }
    : { erro: "Não foi possível enviar o e-mail agora. Tente reenviar em instantes." };
}

/** RF-041 / RN-006 — remoção de atribuição manual; a automática é recusada no serviço. */
export async function removerAtribuicaoAction(
  usuarioId: string,
  atribuicaoId: string,
): Promise<EstadoAcaoUsuario> {
  const ctx = await exigirAdmin();

  const resultado = await removerAtribuicao(ctx, atribuicaoId);
  if (!resultado.sucesso) {
    const mensagens: Record<typeof resultado.motivo, string> = {
      sem_permissao: "Ação restrita ao Administrador.",
      nao_encontrado: "Atribuição não encontrada.",
      incompativel_com_perfil: "Esta atribuição não corresponde ao perfil do usuário.",
      automatica:
        "Esta atribuição vem de a pessoa ser responsável pela tarefa. Troque o responsável da tarefa para removê-la.",
    };
    return { erro: mensagens[resultado.motivo] };
  }

  revalidatePath(`/usuarios/${usuarioId}`);
  return { mensagem: "Atribuição removida." };
}
