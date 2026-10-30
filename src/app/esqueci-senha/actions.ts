"use server";
/**
 * Actions do módulo `src/app/esqueci-senha`. Recebem dados enviados pela interface, obtêm o contexto autenticado, validam as entradas no servidor e encaminham operações às funções de domínio; a interface não é a barreira de autorização.
 */

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { criarTokenAcesso } from "@/lib/tokens";
import { enviarEmail, linkDefinirSenha } from "@/lib/email";
import { reservarLimites } from "@/lib/rate-limit-banco";
import { agendarPosResposta } from "@/lib/pos-resposta";

const schema = z.object({ email: z.string().max(320).email() });

// Sempre retorna a mesma mensagem de sucesso — não revela se o e-mail existe.
const MENSAGEM_SUCESSO =
  "Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha.";

// RF-032 (B2) — dois limites, porque cada um cobre um ataque diferente: por e-mail, evita
// usar o formulário para encher a caixa de entrada de alguém; por IP, encarece varrer uma
// lista de endereços atrás de quais estão cadastrados.
const LIMITE_POR_EMAIL = 3;
const LIMITE_POR_IP = 10;

/**
 * O IP vem do Caddy, que roda na frente do app (ver Caddyfile). Sem proxy reverso o header
 * não existe e todo mundo cai no mesmo balde "desconhecido" — o que só torna o limite por
 * IP mais rígido, nunca mais frouxo.
 */
async function ipDaRequisicao(): Promise<string> {
  const cabecalhos = await headers();
  return cabecalhos.get("x-real-ip")?.trim() || "desconhecido";
}

export async function esqueciSenhaAction(
  _estadoAnterior: { mensagem?: string; erro?: string },
  formData: FormData,
): Promise<{ mensagem?: string; erro?: string }> {
  // A validação ocorre no servidor antes de normalizar e usar o e-mail.
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { erro: "Informe um e-mail válido." };
  }

  const email = parsed.data.email.trim().toLowerCase();
  // Limita em paralelo por origem e por endereço para reduzir abuso e enumeração.
  const ip = await ipDaRequisicao();

  const reserva = await reservarLimites([
    { chave: `recuperacao:ip:${ip}`, limite: LIMITE_POR_IP },
    { chave: `recuperacao:email:${email}`, limite: LIMITE_POR_EMAIL },
  ], false);

  // Estourar o limite devolve a MESMA mensagem do caminho feliz, de propósito: uma resposta
  // diferente aqui ("muitas tentativas") mediria quantas vezes um e-mail específico foi
  // pedido, e devolveria pela porta dos fundos a informação que a mensagem neutra protege.
  if (!reserva) {
    return { mensagem: MENSAGEM_SUCESSO };
  }

  // A resposta não depende de sessão; esta busca é necessária para iniciar o fluxo de recuperação.
  const usuario = await prisma.usuario.findUnique({ where: { email } });

  // RF-032 — a resposta não espera nada que só acontece quando a conta existe. A mensagem já
  // era idêntica nos dois casos; o tempo não era, e media-se com um cronômetro: gravar o
  // token e aguardar o POST ao Resend custava centenas de milissegundos que o caminho do
  // e-mail inexistente não pagava. Agora as duas saídas fazem o mesmo trabalho antes de
  // responder — parse, limite e um SELECT — e o resto vai para depois da resposta.
  if (usuario && usuario.ativo) {
    // Geração do token e envio são adiados para não alterar o tempo da resposta pública.
    agendarPosResposta("recuperacao-de-senha", async () => {
      const token = await criarTokenAcesso(usuario.id, "RECUPERAR_SENHA");
      await enviarEmail({
        to: usuario.email,
        subject: "Redefinição de senha — SGA Múltiplus Ambiental",
        html: `<p>Olá, ${usuario.nome}.</p><p>Clique no link abaixo para redefinir sua senha (válido por 1 hora):</p><p><a href="${linkDefinirSenha(token)}">${linkDefinirSenha(token)}</a></p>`,
      });
    });
  }

  return { mensagem: MENSAGEM_SUCESSO };
}
