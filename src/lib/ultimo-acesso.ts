import { prisma } from "@/lib/prisma";
import { formatarDataHoraBrasilia } from "@/lib/datas";

/**
 * Último acesso do usuário (protótipo 07-usuarios).
 *
 * Guarda só o momento do último login bem-sucedido: sem histórico, IP nem aparelho. A leitura por
 * outras pessoas é restrita à administração (política `usuarios_select` e `listarUsuarios`).
 */

/**
 * Grava o instante do login que acabou de dar certo. Não pode derrubar o login: se a gravação falhar,
 * o erro vai para o log do servidor e a pessoa entra do mesmo jeito. O UPDATE é direto, para não mexer
 * em `atualizadoEm` nem em `versaoSessao`.
 */
export async function registrarUltimoAcesso(usuarioId: string): Promise<void> {
  try {
    await prisma.$executeRaw`UPDATE "usuarios" SET "ultimoAcessoEm" = now() WHERE "id" = ${usuarioId}`;
  } catch (erro) {
    console.error("Falha ao registrar o último acesso do usuário.", erro);
  }
}

/**
 * Texto da coluna "Último acesso". Quem ainda não definiu a senha nunca entrou ("Ainda não acessou");
 * quem já tem senha e não tem data entrou antes de o registro existir ("Sem registro", até o próximo login).
 */
export function descreverUltimoAcesso(usuario: { ultimoAcessoEm: Date | null; temSenha: boolean }): string {
  if (usuario.ultimoAcessoEm) return formatarDataHoraBrasilia(usuario.ultimoAcessoEm);
  return usuario.temSenha ? "Sem registro" : "Ainda não acessou";
}
