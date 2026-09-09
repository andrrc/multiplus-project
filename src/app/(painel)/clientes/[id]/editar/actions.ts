"use server";

import { redirect } from "next/navigation";
import { obterContexto } from "@/server/auth/contexto";
import { atualizarCliente, type AtualizarClienteInput } from "@/lib/clientes";
import { validarCpf } from "@/lib/cpf";

export type EstadoEditarCliente = { erro?: string };

export async function atualizarClienteAction(
  clienteId: string,
  dados: AtualizarClienteInput,
): Promise<EstadoEditarCliente> {
  const ctx = await obterContexto();
  if (ctx.perfil !== "ADMIN") return { erro: "Ação restrita ao Administrador." };

  if (!dados.razaoSocial.trim()) return { erro: "Informe a razão social." };
  if (!validarCpf(dados.responsavelLegal.cpf)) return { erro: "CPF do Responsável Legal inválido." };
  if (!validarCpf(dados.pontoContato.cpf)) return { erro: "CPF do Ponto de Contato inválido." };

  await atualizarCliente(ctx, clienteId, dados);
  redirect(`/clientes/${clienteId}`);
}
