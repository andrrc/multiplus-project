"use server";

import { redirect } from "next/navigation";
import { obterContexto } from "@/server/auth/contexto";
import { criarCliente, type NovoClienteInput } from "@/lib/clientes";
import { consultarCnpj, validarCnpj } from "@/lib/cnpj";
import { validarNovoCliente } from "@/lib/validacao-cliente";

export type EstadoNovoCliente = { erro?: string };

export async function criarClienteAction(dados: NovoClienteInput): Promise<EstadoNovoCliente> {
  const ctx = await obterContexto();
  if (ctx.perfil !== "ADMIN") return { erro: "Ação restrita ao Administrador." };

  const erroValidacao = validarNovoCliente(dados);
  if (erroValidacao) return { erro: erroValidacao };

  let clienteId: string;
  try {
    const cliente = await criarCliente(ctx, dados);
    clienteId = cliente.id;
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return {
        erro:
          dados.tipo === "PESSOA_JURIDICA"
            ? "Já existe um cliente cadastrado com esse CNPJ."
            : "Já existe um cliente cadastrado com esse CPF.",
      };
    }
    throw error;
  }

  redirect(`/clientes/${clienteId}`);
}

export type ResultadoConsultaCnpj =
  | { status: "encontrado"; razaoSocial: string; endereco: string }
  | { status: "nao_encontrado" }
  | { status: "indisponivel" }
  | { status: "invalido" };

export async function consultarCnpjAction(cnpjEntrada: string): Promise<ResultadoConsultaCnpj> {
  if (!validarCnpj(cnpjEntrada)) return { status: "invalido" };

  const resultado = await consultarCnpj(cnpjEntrada);
  if (resultado === null) return { status: "indisponivel" };
  if (!resultado.encontrado) return { status: "nao_encontrado" };

  return { status: "encontrado", razaoSocial: resultado.razaoSocial, endereco: resultado.endereco };
}
