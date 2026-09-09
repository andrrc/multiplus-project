"use server";

import { revalidatePath } from "next/cache";
import { obterContexto, exigirAdmin } from "@/server/auth/contexto";
import { adicionarDocumento, criarAcessoCliente, definirAcessoClienteAtivo } from "@/lib/clientes";

export type EstadoAdicionarDocumento = { erro?: string; sucessoEm?: number };

export async function adicionarDocumentoAction(
  clienteId: string,
  _estadoAnterior: EstadoAdicionarDocumento,
  formData: FormData,
): Promise<EstadoAdicionarDocumento> {
  const ctx = await obterContexto();
  if (ctx.perfil !== "ADMIN") return { erro: "Ação restrita ao Administrador." };

  const nome = String(formData.get("nome") ?? "").trim();
  const link = String(formData.get("link") ?? "").trim();
  if (!nome || !link) return { erro: "Preencha o nome e o link do documento." };

  await adicionarDocumento(ctx, clienteId, nome, link);
  revalidatePath(`/clientes/${clienteId}`);
  return { sucessoEm: Date.now() };
}

export type EstadoCriarAcesso = { erro?: string };

export async function criarAcessoAction(clienteId: string): Promise<EstadoCriarAcesso> {
  await exigirAdmin();

  const resultado = await criarAcessoCliente(clienteId);
  if (!resultado.sucesso) {
    return {
      erro:
        resultado.motivo === "sem_email"
          ? "Cadastre o Ponto de Contato antes de criar o acesso."
          : "Já existe um usuário cadastrado com esse e-mail.",
    };
  }

  revalidatePath(`/clientes/${clienteId}`);
  return {};
}

export async function definirAcessoAtivoAction(
  clienteId: string,
  usuarioId: string,
  ativo: boolean,
): Promise<void> {
  await exigirAdmin();
  await definirAcessoClienteAtivo(usuarioId, ativo);
  revalidatePath(`/clientes/${clienteId}`);
}
