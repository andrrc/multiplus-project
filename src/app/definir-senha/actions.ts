"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashSenha } from "@/lib/senha";
import { validarTokenAcesso, consumirTokenAcesso } from "@/lib/tokens";

const schema = z
  .object({
    token: z.string().min(1),
    senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
    confirmarSenha: z.string(),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    message: "As senhas não coincidem.",
    path: ["confirmarSenha"],
  });

export type EstadoDefinirSenha = { erro?: string; sucesso?: boolean };

export async function definirSenhaAction(
  _estadoAnterior: EstadoDefinirSenha,
  formData: FormData,
): Promise<EstadoDefinirSenha> {
  const parsed = schema.safeParse({
    token: formData.get("token"),
    senha: formData.get("senha"),
    confirmarSenha: formData.get("confirmarSenha"),
  });

  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const validacao = await validarTokenAcesso(parsed.data.token);
  if (!validacao.valido) {
    switch (validacao.motivo) {
      case "expirado":
        return { erro: "Este link expirou. Solicite um novo." };
      case "ja_usado":
        return { erro: "Este link já foi usado. Solicite um novo, se precisar." };
      default:
        return { erro: "Link inválido." };
    }
  }

  const senhaHash = await hashSenha(parsed.data.senha);

  await prisma.usuario.update({
    where: { id: validacao.usuarioId },
    data: { senhaHash },
  });
  await consumirTokenAcesso(validacao.tokenId);

  return { sucesso: true };
}
