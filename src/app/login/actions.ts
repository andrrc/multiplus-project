"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/server/auth";

export async function loginAction(
  _estadoAnterior: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    // Auth.js autentica pelo provider de credenciais e redireciona ao destino informado.
    await signIn("credentials", {
      email: formData.get("email"),
      senha: formData.get("senha"),
      redirectTo: (formData.get("callbackUrl") as string) || "/",
    });
  } catch (error) {
    // Falhas de autenticação têm mensagem genérica; erros de infraestrutura continuam visíveis no servidor.
    if (error instanceof AuthError) {
      return "E-mail ou senha inválidos.";
    }
    throw error;
  }
}
