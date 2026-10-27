import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/** O convite não pode parecer enviado quando não existe provedor de e-mail configurado. */
export class EmailNaoConfiguradoError extends Error {
  constructor() {
    super("RESEND_API_KEY não configurada.");
    this.name = "EmailNaoConfiguradoError";
  }
}

type EnviarEmailParams = {
  to: string;
  subject: string;
  html: string;
};

export async function enviarEmail({ to, subject, html }: EnviarEmailParams): Promise<void> {
  if (!resend) {
    // Não registrar o HTML aqui: ele contém um token que concede acesso à conta.
    throw new EmailNaoConfiguradoError();
  }

  // O remetente pode ser configurado por ambiente; o padrão identifica o serviço e não aceita respostas.
  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "SGA Múltiplus Ambiental <nao-responda@multiplusambiental.com.br>",
    to,
    subject,
    html,
  });
}

export function linkDefinirSenha(token: string): string {
  // Produção, testes e desenvolvimento apontam para a origem configurada, com fallback local.
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  // O token aparece somente no link enviado ao usuário; o banco armazena seu hash.
  return `${base}/definir-senha?token=${token}`;
}
