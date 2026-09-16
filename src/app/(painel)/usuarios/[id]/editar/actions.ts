"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Perfil } from "@prisma/client";
import { exigirAdmin } from "@/server/auth/contexto";
import { atualizarUsuario } from "@/lib/usuarios";
import type { EstadoFormularioUsuario } from "../../usuario-form";

const PERFIS_VALIDOS: Perfil[] = ["ADMIN", "ADMIN_INTERNO", "ADMIN_EXTERNO"];

export async function atualizarUsuarioAction(
  usuarioId: string,
  _estadoAnterior: EstadoFormularioUsuario,
  formData: FormData,
): Promise<EstadoFormularioUsuario> {
  const ctx = await exigirAdmin();

  const perfil = PERFIS_VALIDOS.find((p) => p === formData.get("perfil"));
  if (!perfil) return { erro: "Escolha um perfil de acesso." };

  const resultado = await atualizarUsuario(ctx, usuarioId, {
    nome: String(formData.get("nome") ?? ""),
    email: String(formData.get("email") ?? ""),
    perfil,
  });

  if (!resultado.sucesso) {
    const mensagens: Record<typeof resultado.motivo, EstadoFormularioUsuario> = {
      sem_permissao: { erro: "Ação restrita ao Administrador." },
      nome_obrigatorio: { erro: "Informe o nome.", campo: "nome" },
      email_invalido: { erro: "E-mail inválido.", campo: "email" },
      email_duplicado: { erro: "Já existe um usuário com esse e-mail.", campo: "email" },
      perfil_invalido: { erro: "Escolha um perfil de acesso." },
      atribuicao_incompativel: { erro: "Atribuições incompatíveis com o perfil." },
    };
    return mensagens[resultado.motivo];
  }

  revalidatePath("/usuarios");
  revalidatePath(`/usuarios/${usuarioId}`);

  // Trocar o perfil troca a granularidade da atribuição (RN-005) e derruba as que não
  // servem mais. A tela de atribuições avisa em vez de a pessoa descobrir sozinha.
  redirect(
    resultado.atribuicoesRemovidas > 0
      ? `/usuarios/${usuarioId}?atribuicoesRemovidas=${resultado.atribuicoesRemovidas}`
      : `/usuarios/${usuarioId}`,
  );
}
