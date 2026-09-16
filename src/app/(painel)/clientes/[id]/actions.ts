"use server";

import { revalidatePath } from "next/cache";
import { obterContexto, exigirAdmin } from "@/server/auth/contexto";
import { adicionarDocumento, criarAcessoCliente, definirAcessoClienteAtivo } from "@/lib/clientes";
import {
  adicionarPessoaEnvolvida,
  criarAcessoPessoaEnvolvida,
  validarPessoaEnvolvida,
} from "@/lib/pessoas-envolvidas";
import { definirAtivo, exigirClienteAtivo, type EntidadeDesativavel } from "@/lib/desativacao";
import type { PessoaEnvolvidaInput } from "@/lib/clientes";
import type { ContextoUsuario } from "@/lib/prisma-app";

/**
 * RF-039 — converte o `throw` de `exigirClienteAtivo` em erro de formulário. Devolve
 * `null` quando o cliente está ativo e pode seguir.
 *
 * Não é exportada: num arquivo "use server" toda export vira Server Action, e esta é uma
 * guarda interna, não um endpoint.
 */
async function barrarClienteDesativado(
  ctx: ContextoUsuario,
  clienteId: string,
  acao: string,
): Promise<{ erro: string } | null> {
  try {
    await exigirClienteAtivo(ctx, clienteId, acao);
    return null;
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Cliente indisponível." };
  }
}

export type EstadoAdicionarPessoaEnvolvida = { erro?: string; sucessoEm?: number };

export async function adicionarPessoaEnvolvidaAction(
  clienteId: string,
  _estadoAnterior: EstadoAdicionarPessoaEnvolvida,
  formData: FormData,
): Promise<EstadoAdicionarPessoaEnvolvida> {
  const ctx = await obterContexto();
  if (ctx.perfil !== "ADMIN") return { erro: "Ação restrita ao Administrador." };

  const dados: PessoaEnvolvidaInput = {
    tipo: formData.get("tipo") === "EMPRESA" ? "EMPRESA" : "PESSOA",
    nome: String(formData.get("nome") ?? "").trim(),
    cpf: String(formData.get("cpf") ?? "").trim() || undefined,
    cnpj: String(formData.get("cnpj") ?? "").trim() || undefined,
    telefone: String(formData.get("telefone") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    temAcesso: formData.get("temAcesso") === "on",
  };

  const erro = validarPessoaEnvolvida(dados);
  if (erro) return { erro };

  const pessoa = await adicionarPessoaEnvolvida(ctx, clienteId, dados);
  if (dados.temAcesso) await criarAcessoPessoaEnvolvida(pessoa.id);

  revalidatePath(`/clientes/${clienteId}`);
  return { sucessoEm: Date.now() };
}

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
  const ctx = await exigirAdmin();

  // RF-039 — segunda camada: `criarAcessoCliente` já recusa cliente desativado, mas ela roda
  // na role dona. Esta guarda passa pela RLS, então cobre também o caso de o cliente nem ser
  // visível para quem chamou.
  const barrado = await barrarClienteDesativado(ctx, clienteId, "criar o acesso");
  if (barrado) return barrado;

  const resultado = await criarAcessoCliente(clienteId);
  if (!resultado.sucesso) {
    const mensagens: Record<typeof resultado.motivo, string> = {
      sem_email: "Cadastre o Ponto de Contato antes de criar o acesso.",
      ja_existe: "Já existe um usuário cadastrado com esse e-mail.",
      cliente_desativado:
        "Este cliente está desativado. Reative-o antes de criar o acesso.",
    };
    return { erro: mensagens[resultado.motivo] };
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

/**
 * RF-039 — desativação/reativação a partir da tela de detalhe: o próprio cliente, uma
 * pessoa envolvida ou um documento. A mesma action serve às três porque a regra é a mesma
 * (RN-007, só Administrador) e o serviço é um só.
 */
export async function definirAtivoAction(
  clienteId: string,
  entidade: EntidadeDesativavel,
  id: string,
  ativo: boolean,
): Promise<EstadoCriarAcesso> {
  const ctx = await exigirAdmin();

  const resultado = await definirAtivo(ctx, entidade, id, ativo);
  if (!resultado.sucesso) {
    const mensagens: Record<typeof resultado.motivo, string> = {
      sem_permissao: "Ação restrita ao Administrador.",
      auto_desativacao: "Você não pode desativar o próprio acesso.",
      nao_encontrado: "Registro não encontrado.",
    };
    return { erro: mensagens[resultado.motivo] };
  }

  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/clientes");
  return {};
}

export async function criarAcessoPessoaEnvolvidaAction(
  clienteId: string,
  pessoaEnvolvidaId: string,
): Promise<EstadoCriarAcesso> {
  const ctx = await exigirAdmin();

  const barrado = await barrarClienteDesativado(ctx, clienteId, "criar o acesso");
  if (barrado) return barrado;

  const resultado = await criarAcessoPessoaEnvolvida(pessoaEnvolvidaId);
  if (!resultado.sucesso) {
    const mensagens: Record<typeof resultado.motivo, string> = {
      nao_encontrada: "Cadastre um e-mail para essa pessoa antes de criar o acesso.",
      ja_tem_acesso: "Essa pessoa já tem acesso.",
      ja_existe: "Já existe um usuário cadastrado com esse e-mail.",
      cliente_desativado:
        "Este cliente está desativado. Reative-o antes de criar o acesso.",
    };
    return { erro: mensagens[resultado.motivo] };
  }

  revalidatePath(`/clientes/${clienteId}`);
  return {};
}
