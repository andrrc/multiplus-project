"use server";

import { redirect } from "next/navigation";
import { obterContexto } from "@/server/auth/contexto";
import { atualizarCliente, type AtualizarClienteInput } from "@/lib/clientes";
import { validarAtualizacaoCliente } from "@/lib/validacao-cliente";
import { resolverSegmento } from "@/lib/opcoes-cliente";

export type EstadoEditarCliente = { erro?: string };

export async function atualizarClienteAction(
  clienteId: string,
  dados: AtualizarClienteInput,
): Promise<EstadoEditarCliente> {
  const ctx = await obterContexto();
  if (ctx.perfil !== "ADMIN") return { erro: "Ação restrita ao Administrador." };

  const erroValidacao = validarAtualizacaoCliente(dados);
  if (erroValidacao) return { erro: erroValidacao };

  const dadosResolvidos: AtualizarClienteInput = {
    ...dados,
    segmento: resolverSegmento(dados.tipo, dados.segmento, dados.segmentoCustomizado),
  };

  await atualizarCliente(ctx, clienteId, dadosResolvidos);
  redirect(`/clientes/${clienteId}`);
}
