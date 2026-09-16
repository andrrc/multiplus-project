"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashSenha } from "@/lib/senha";
import { validarPoliticaSenha } from "@/lib/politica-senha";
import { validarTokenAcesso, consumirTokenAcesso } from "@/lib/tokens";
import { signIn } from "@/server/auth";
import { telaInicial } from "@/lib/navegacao";

const schema = z
  .object({
    token: z.string().min(1),
    senha: z.string().min(1, "Informe uma senha."),
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

  // B3 — a política vale no servidor. A marcação de requisitos na tela usa a mesma lista
  // (src/lib/politica-senha.ts), mas quem decide é esta checagem.
  const senhaFraca = validarPoliticaSenha(parsed.data.senha);
  if (senhaFraca) return { erro: senhaFraca };

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

  const usuario = await prisma.usuario.update({
    where: { id: validacao.usuarioId },
    data: { senhaHash },
    select: { email: true, perfil: true },
  });
  await consumirTokenAcesso(validacao.tokenId);

  // RF-043 / Fluxo AB — login automático e queda na tela inicial do perfil. `signIn`
  // redireciona lançando NEXT_REDIRECT, então nada depois disto executa no caminho feliz;
  // a senha em texto puro vem do próprio formulário desta requisição, não é relida de
  // lugar nenhum.
  await signIn("credentials", {
    email: usuario.email,
    senha: parsed.data.senha,
    redirectTo: telaInicial(usuario.perfil),
  });

  return { sucesso: true };
}
