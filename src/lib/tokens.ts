import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { TipoToken } from "@prisma/client";

// RF-030/031: link de primeiro acesso não precisa ser tão curto quanto o de reset de senha.
const TTL_HORAS: Record<TipoToken, number> = {
  DEFINIR_SENHA: 24 * 7,
  RECUPERAR_SENHA: 1,
};

function hashToken(tokenPlano: string): string {
  return createHash("sha256").update(tokenPlano).digest("hex");
}

/**
 * Gera um token de uso único para o usuário (definição de senha no primeiro
 * acesso — RF-030/RF-031 — ou recuperação de senha — RF-032). Retorna o
 * token em texto puro, que vai só no e-mail: o banco guarda apenas o hash.
 */
export async function criarTokenAcesso(
  usuarioId: string,
  tipo: TipoToken,
): Promise<string> {
  const tokenPlano = randomBytes(32).toString("hex");
  const expiraEm = new Date(Date.now() + TTL_HORAS[tipo] * 60 * 60 * 1000);

  await prisma.tokenAcesso.create({
    data: {
      usuarioId,
      tokenHash: hashToken(tokenPlano),
      tipo,
      expiraEm,
    },
  });

  return tokenPlano;
}

type ValidacaoToken =
  | { valido: true; usuarioId: string; tokenId: string; tipo: TipoToken }
  | { valido: false; motivo: "nao_encontrado" | "expirado" | "ja_usado" };

/**
 * Valida um token de "definir/recuperar senha" — a tela que consome o link
 * é a mesma para os dois casos (RF-030/031 e RF-032), então não filtramos
 * por tipo aqui; `tipo` só volta para eventual texto diferente na UI.
 */
export async function validarTokenAcesso(
  tokenPlano: string,
): Promise<ValidacaoToken> {
  const token = await prisma.tokenAcesso.findUnique({
    where: { tokenHash: hashToken(tokenPlano) },
  });

  if (!token) {
    return { valido: false, motivo: "nao_encontrado" };
  }
  if (token.usadoEm) {
    return { valido: false, motivo: "ja_usado" };
  }
  if (token.expiraEm < new Date()) {
    return { valido: false, motivo: "expirado" };
  }

  return { valido: true, usuarioId: token.usuarioId, tokenId: token.id, tipo: token.tipo };
}

export async function consumirTokenAcesso(tokenId: string): Promise<void> {
  await prisma.tokenAcesso.update({
    where: { id: tokenId },
    data: { usadoEm: new Date() },
  });
}
