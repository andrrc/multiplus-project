"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/server/auth";

export async function loginAction(
  _estadoAnterior: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      senha: formData.get("senha"),
      redirectTo: (formData.get("callbackUrl") as string) || "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "E-mail ou senha inválidos.";
    }
    throw error;
  }
}
