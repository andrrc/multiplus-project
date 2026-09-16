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
    cargo: String(formData.get("cargo") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    // O formulário só envia o documento do tipo escolhido; o outro vem vazio e é
    // descartado na normalização.
    cpf: String(formData.get("cpf") ?? ""),
    cnpj: String(formData.get("cnpj") ?? ""),
    observacoes: String(formData.get("observacoes") ?? ""),
  });

  if (!resultado.sucesso) {
    const mensagens: Record<typeof resultado.motivo, EstadoFormularioUsuario> = {
      sem_permissao: { erro: "Ação restrita ao Administrador." },
      nome_obrigatorio: { erro: "Informe o nome.", campo: "nome" },
      email_invalido: { erro: "E-mail inválido.", campo: "email" },
      email_duplicado: { erro: "Já existe um usuário com esse e-mail.", campo: "email" },
      perfil_invalido: { erro: "Escolha um perfil de acesso." },
      atribuicao_incompativel: { erro: "Atribuições incompatíveis com o perfil." },
      cpf_invalido: { erro: "CPF inválido.", campo: "cpf" },
      cnpj_invalido: { erro: "CNPJ inválido.", campo: "cnpj" },
      cpf_e_cnpj: {
        erro: "Informe CPF ou CNPJ, não os dois — a pessoa é física ou jurídica.",
        campo: "cpf",
      },
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
