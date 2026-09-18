"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { EntidadeTipo, Perfil } from "@prisma/client";
import { exigirAdmin } from "@/server/auth/contexto";
import { criarUsuarioInterno, type AtribuicaoInput } from "@/lib/usuarios";
import type { EstadoFormularioUsuario } from "../usuario-form";

const PERFIS_VALIDOS: Perfil[] = ["ADMIN", "ADMIN_INTERNO", "ADMIN_EXTERNO"];

/**
 * Os checkboxes vêm como "PROJETO:id" / "TAREFA:id" — um campo só para os dois tipos.
 * Não é exportada: num arquivo "use server" toda export vira Server Action e precisa ser
 * async, e esta é só uma leitura de FormData.
 */
function lerAtribuicoes(formData: FormData): AtribuicaoInput[] {
  return formData
    .getAll("atribuicoes")
    .map((valor) => String(valor).split(":"))
    .filter(([tipo, id]) => (tipo === "PROJETO" || tipo === "TAREFA") && id)
    .map(([tipo, id]) => ({ entidadeTipo: tipo as EntidadeTipo, entidadeId: id }));
}

export async function criarUsuarioAction(
  _estadoAnterior: EstadoFormularioUsuario,
  formData: FormData,
): Promise<EstadoFormularioUsuario> {
  const ctx = await exigirAdmin();

  const perfil = PERFIS_VALIDOS.find((p) => p === formData.get("perfil"));
  if (!perfil) return { erro: "Escolha um perfil de acesso." };

  const resultado = await criarUsuarioInterno(ctx, {
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
    atribuicoes: lerAtribuicoes(formData),
  });

  if (!resultado.sucesso) {
    // O erro de e-mail duplicado volta marcado no campo para a tela não perder o resto do
    // formulário preenchido (estado A2 do PDD).
    const mensagens: Record<typeof resultado.motivo, EstadoFormularioUsuario> = {
      sem_permissao: { erro: "Ação restrita ao Administrador." },
      nome_obrigatorio: { erro: "Informe o nome.", campo: "nome" },
      email_invalido: { erro: "E-mail inválido.", campo: "email" },
      email_duplicado: { erro: "Já existe um usuário com esse e-mail.", campo: "email" },
      perfil_invalido: { erro: "Escolha um perfil de acesso." },
      atribuicao_incompativel: {
        erro: "As atribuições não correspondem à granularidade do perfil escolhido.",
      },
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

  // RF-040 — falha no envio do convite não desfaz a criação: o usuário existe e a Tela A1
  // oferece "Reenviar convite". A listagem mostra o status "Pendente de ativação" de
  // qualquer forma, então o aviso vai junto do destino.
  redirect(
    resultado.convite === "enviado"
      ? "/usuarios?convite=enviado"
      : resultado.convite === "nao_configurado"
        ? "/usuarios?convite=manual"
        : "/usuarios?convite=falhou",
  );
}
