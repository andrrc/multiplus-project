import { criarTokenAcesso } from "@/lib/tokens";
import { enviarEmail, linkDefinirSenha } from "@/lib/email";

/**
 * RF-030 / RF-031 / RF-032 — o convite de definição de senha, num lugar só.
 *
 * Quatro pontos de entrada diferentes chegam aqui e antes duplicavam este mesmo trecho:
 * RF-028 (checkbox "é um colaborador?" no cadastro do cliente), RF-030 (usuário interno
 * criado pela Talita), RF-031 (acesso do cliente) e RF-033 (promoção posterior de uma
 * Pessoa Envolvida). Roda na role dona das tabelas — `tokens_acesso` não é acessível pela
 * role de aplicação (ver migration de RLS da Sprint 1).
 */
export type OrigemConvite = "USUARIO_INTERNO" | "COLABORADOR_EXTERNO" | "CLIENTE";

/**
 * "falha_no_envio" não é erro fatal de propósito: o usuário já existe no banco e a Tela A1
 * oferece "Reenviar convite". Derrubar a criação inteira porque o Resend piscou obrigaria
 * a Talita a recomeçar o cadastro — e deixaria o e-mail já ocupado por um usuário que ela
 * não consegue mais criar.
 */
export type ResultadoConvite = "enviado" | "falha_no_envio";

const APRESENTACAO: Record<OrigemConvite, string> = {
  USUARIO_INTERNO: "Você recebeu acesso ao Múltiplus Software.",
  COLABORADOR_EXTERNO: "Você foi cadastrado como Colaborador Externo no Múltiplus.",
  CLIENTE: "Seu acesso à área de cliente do Múltiplus foi liberado.",
};

export async function enviarConviteDefinicaoSenha(
  usuario: { id: string; nome: string; email: string },
  origem: OrigemConvite,
): Promise<ResultadoConvite> {
  const token = await criarTokenAcesso(usuario.id, "DEFINIR_SENHA");
  const link = linkDefinirSenha(token);

  try {
    await enviarEmail({
      to: usuario.email,
      subject: "Acesso ao Múltiplus — defina sua senha",
      html: `<p>Olá, ${usuario.nome}.</p><p>${APRESENTACAO[origem]}</p><p>Defina sua senha de acesso: <a href="${link}">${link}</a></p><p>O link vale por 7 dias.</p>`,
    });
    return "enviado";
  } catch (erro) {
    console.error("[convite] falha ao enviar e-mail de definição de senha:", erro);
    return "falha_no_envio";
  }
}
