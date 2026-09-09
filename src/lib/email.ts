import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

type EnviarEmailParams = {
  to: string;
  subject: string;
  html: string;
};

/**
 * Sem RESEND_API_KEY configurada (dev local), só loga no console — evita
 * exigir uma conta Resend/domínio verificado para trabalhar na Sprint 1.
 */
export async function enviarEmail({ to, subject, html }: EnviarEmailParams): Promise<void> {
  if (!resend) {
    console.log(`\n[email] (RESEND_API_KEY não configurada — apenas log)`);
    console.log(`[email] Para: ${to}`);
    console.log(`[email] Assunto: ${subject}`);
    console.log(`[email] Corpo:\n${html}\n`);
    return;
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Múltiplus <nao-responda@multiplusambiental.com.br>",
    to,
    subject,
    html,
  });
}

export function linkDefinirSenha(token: string): string {
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  return `${base}/definir-senha?token=${token}`;
}
