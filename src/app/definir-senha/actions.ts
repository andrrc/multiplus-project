"use server";
/**
 * Actions do módulo `src/app/definir-senha`. Recebem dados enviados pela interface, obtêm o contexto autenticado, validam as entradas no servidor e encaminham operações às funções de domínio; a interface não é a barreira de autorização.
 */

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashSenha } from "@/lib/senha";
import { validarPoliticaSenha } from "@/lib/politica-senha";
import { validarTokenAcesso } from "@/lib/tokens";
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
  // Extrai os três campos do formulário e valida tipo, preenchimento e igualdade das senhas.
  const parsed = schema.safeParse({
    token: formData.get("token"),
    senha: formData.get("senha"),
    confirmarSenha: formData.get("confirmarSenha"),
  });

  if (!parsed.success) {
    // Mostra a primeira falha de validação de forma simples para o formulário.
    return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // B3 — a política vale no servidor. A marcação de requisitos na tela usa a mesma lista
  // (src/lib/politica-senha.ts), mas quem decide é esta checagem.
  const senhaFraca = validarPoliticaSenha(parsed.data.senha);
  if (senhaFraca) return { erro: senhaFraca };

  // Revalida no servidor: abrir a tela não reserva nem consome o token.
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

  // Persiste apenas o hash bcrypt, nunca a senha em texto puro.
  const senhaHash = await hashSenha(parsed.data.senha);

  // A mesma transação reserva o token e altera a senha; uma falha desfaz ambos.
  const usuario = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "usuarios" WHERE id = ${validacao.usuarioId} FOR UPDATE`;
    const conta = await tx.usuario.findUnique({ where: { id: validacao.usuarioId }, select: { ativo: true } });
    if (!conta?.ativo) return null;
    const consumo = await tx.tokenAcesso.updateMany({
      where: { id: validacao.tokenId, usuarioId: validacao.usuarioId, usadoEm: null, expiraEm: { gt: new Date() } },
      data: { usadoEm: new Date() },
    });
    if (consumo.count !== 1) return null;
    return tx.usuario.update({
      where: { id: validacao.usuarioId },
      data: { senhaHash, versaoSessao: { increment: 1 } },
      select: { email: true, perfil: true },
    });
  });
  if (!usuario) return { erro: "Este link não está mais disponível. Solicite um novo." };

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
