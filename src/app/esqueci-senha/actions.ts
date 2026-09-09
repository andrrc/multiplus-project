"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { criarTokenAcesso } from "@/lib/tokens";
import { enviarEmail, linkDefinirSenha } from "@/lib/email";

const schema = z.object({ email: z.string().email() });

// Sempre retorna a mesma mensagem de sucesso — não revela se o e-mail existe.
const MENSAGEM_SUCESSO =
  "Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha.";

export async function esqueciSenhaAction(
  _estadoAnterior: { mensagem?: string; erro?: string },
  formData: FormData,
): Promise<{ mensagem?: string; erro?: string }> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { erro: "Informe um e-mail válido." };
  }

  const usuario = await prisma.usuario.findUnique({ where: { email: parsed.data.email } });

  if (usuario && usuario.ativo) {
    const token = await criarTokenAcesso(usuario.id, "RECUPERAR_SENHA");
    await enviarEmail({
      to: usuario.email,
      subject: "Redefinição de senha — Múltiplus Software",
      html: `<p>Olá, ${usuario.nome}.</p><p>Clique no link abaixo para redefinir sua senha (válido por 1 hora):</p><p><a href="${linkDefinirSenha(token)}">${linkDefinirSenha(token)}</a></p>`,
    });
  }

  return { mensagem: MENSAGEM_SUCESSO };
}
