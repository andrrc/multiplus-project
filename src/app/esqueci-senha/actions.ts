"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { criarTokenAcesso } from "@/lib/tokens";
import { enviarEmail, linkDefinirSenha } from "@/lib/email";
import { registrarTentativa } from "@/lib/rate-limit";
import { agendarPosResposta } from "@/lib/pos-resposta";

const schema = z.object({ email: z.string().email() });

// Sempre retorna a mesma mensagem de sucesso — não revela se o e-mail existe.
const MENSAGEM_SUCESSO =
  "Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha.";

// RF-032 (B2) — dois limites, porque cada um cobre um ataque diferente: por e-mail, evita
// usar o formulário para encher a caixa de entrada de alguém; por IP, encarece varrer uma
// lista de endereços atrás de quais estão cadastrados.
const LIMITE_POR_EMAIL = 3;
const LIMITE_POR_IP = 10;
const JANELA_MS = 15 * 60 * 1000;

/**
 * O IP vem do Caddy, que roda na frente do app (ver Caddyfile). Sem proxy reverso o header
 * não existe e todo mundo cai no mesmo balde "desconhecido" — o que só torna o limite por
 * IP mais rígido, nunca mais frouxo.
 */
async function ipDaRequisicao(): Promise<string> {
  const cabecalhos = await headers();
  const encaminhado = cabecalhos.get("x-forwarded-for");
  return encaminhado?.split(",")[0]?.trim() || cabecalhos.get("x-real-ip") || "desconhecido";
}

export async function esqueciSenhaAction(
  _estadoAnterior: { mensagem?: string; erro?: string },
  formData: FormData,
): Promise<{ mensagem?: string; erro?: string }> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { erro: "Informe um e-mail válido." };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const ip = await ipDaRequisicao();

  const porIp = registrarTentativa(`recuperacao:ip:${ip}`, LIMITE_POR_IP, JANELA_MS);
  const porEmail = registrarTentativa(`recuperacao:email:${email}`, LIMITE_POR_EMAIL, JANELA_MS);

  // Estourar o limite devolve a MESMA mensagem do caminho feliz, de propósito: uma resposta
  // diferente aqui ("muitas tentativas") mediria quantas vezes um e-mail específico foi
  // pedido, e devolveria pela porta dos fundos a informação que a mensagem neutra protege.
  if (!porIp.permitido || !porEmail.permitido) {
    return { mensagem: MENSAGEM_SUCESSO };
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });

  // RF-032 — a resposta não espera nada que só acontece quando a conta existe. A mensagem já
  // era idêntica nos dois casos; o tempo não era, e media-se com um cronômetro: gravar o
  // token e aguardar o POST ao Resend custava centenas de milissegundos que o caminho do
  // e-mail inexistente não pagava. Agora as duas saídas fazem o mesmo trabalho antes de
  // responder — parse, limite e um SELECT — e o resto vai para depois da resposta.
  if (usuario && usuario.ativo) {
    agendarPosResposta("recuperacao-de-senha", async () => {
      const token = await criarTokenAcesso(usuario.id, "RECUPERAR_SENHA");
      await enviarEmail({
        to: usuario.email,
        subject: "Redefinição de senha — Múltiplus Software",
        html: `<p>Olá, ${usuario.nome}.</p><p>Clique no link abaixo para redefinir sua senha (válido por 1 hora):</p><p><a href="${linkDefinirSenha(token)}">${linkDefinirSenha(token)}</a></p>`,
      });
    });
  }

  return { mensagem: MENSAGEM_SUCESSO };
}
