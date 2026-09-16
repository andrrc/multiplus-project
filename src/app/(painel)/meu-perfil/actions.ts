"use server";

import { revalidatePath } from "next/cache";
import { obterContexto } from "@/server/auth/contexto";
import { alterarMinhaSenha, atualizarMeuNome } from "@/lib/usuarios";
import { validarPoliticaSenha } from "@/lib/politica-senha";

export type EstadoPerfil = { erro?: string; mensagem?: string };

export async function atualizarNomeAction(
  _estadoAnterior: EstadoPerfil,
  formData: FormData,
): Promise<EstadoPerfil> {
  const ctx = await obterContexto();

  const resultado = await atualizarMeuNome(ctx, String(formData.get("nome") ?? ""));
  if (!resultado.sucesso) return { erro: "Informe o nome." };

  revalidatePath("/meu-perfil");
  return { mensagem: "Nome atualizado." };
}

/**
 * RF-042 — trocar a senha exige a senha atual. A conferência é feita no servidor a cada
 * tentativa; a sessão estar aberta não substitui a senha atual, porque é justamente uma
 * sessão esquecida aberta que a exigência protege.
 */
export async function alterarSenhaAction(
  _estadoAnterior: EstadoPerfil,
  formData: FormData,
): Promise<EstadoPerfil> {
  const ctx = await obterContexto();

  const senhaAtual = String(formData.get("senhaAtual") ?? "");
  const senhaNova = String(formData.get("senhaNova") ?? "");
  const confirmar = String(formData.get("confirmarSenha") ?? "");

  if (senhaNova !== confirmar) return { erro: "As senhas não coincidem." };

  const fraca = validarPoliticaSenha(senhaNova);
  if (fraca) return { erro: fraca };

  const resultado = await alterarMinhaSenha(ctx, senhaAtual, senhaNova);
  if (!resultado.sucesso) {
    const mensagens: Record<typeof resultado.motivo, string> = {
      nome_obrigatorio: "Informe o nome.",
      senha_atual_incorreta: "Senha atual incorreta.",
      senha_fraca: "A nova senha não atende aos requisitos.",
      sem_senha: "Sua conta ainda não tem senha definida. Use o link do convite.",
    };
    return { erro: mensagens[resultado.motivo] };
  }

  return { mensagem: "Senha alterada." };
}
