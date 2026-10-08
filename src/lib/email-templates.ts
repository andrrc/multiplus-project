import { EventoNotificacao } from "@prisma/client";

type DadosTemplateNotificacao = {
  nome: string;
  titulo: string;
  mensagem: string;
  url?: string | null;
};

function escapar(valor: string) {
  return valor.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

type AcaoEmail = { url: string; texto: string };

/** Estrutura institucional compartilhada pelos e-mails transacionais do Múltiplus. */
function renderLayoutEmail({
  nome,
  titulo,
  conteudo,
  acao,
  nota,
  rodape,
}: {
  nome: string;
  titulo: string;
  conteudo: string;
  acao?: AcaoEmail;
  nota?: string;
  rodape: string;
}): string {
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  const logo = `${base.replace(/\/+$/, "")}/logo-multiplus.png`;
  const botao = acao
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" bgcolor="#0e7a3c" style="border-radius:3px"><a href="${escapar(acao.url)}" style="display:inline-block;padding:14px 22px;font-size:16px;line-height:22px;font-weight:600;color:#ffffff;text-decoration:none">${escapar(acao.texto)}</a></td></tr></table>`
    : "";
  const blocoNota = nota
    ? `<p style="margin:24px 0 0;font-size:14px;line-height:22px;color:#52666f">${escapar(nota)}</p>`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <style>@media only screen and (max-width:600px){.email-card{width:100%!important}.email-pad{padding-left:22px!important;padding-right:22px!important}}</style>
  </head>
  <body style="margin:0;padding:0;background-color:#f1f5f7;font-family:Arial,Helvetica,sans-serif;color:#18313c">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f1f5f7">
      <tr><td align="center" style="padding:36px 16px">
        <table class="email-card" role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;table-layout:fixed;background-color:#ffffff;border:1px solid #dce6e9">
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid #e5ecee">
              <img src="${escapar(logo)}" width="186" alt="Múltiplus Ambiental" style="display:block;width:186px;max-width:100%;height:auto;border:0">
            </td>
          </tr>
          <tr>
            <td class="email-pad" style="padding:32px">
              <p style="margin:0 0 12px;font-size:16px;line-height:24px;color:#18313c">Olá, ${escapar(nome)}.</p>
              <h1 style="margin:0 0 16px;font-size:26px;line-height:32px;font-weight:600;color:#18313c">${escapar(titulo)}</h1>
              ${conteudo}
              ${botao}
              ${blocoNota}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;background-color:#f8fafb;border-top:1px solid #e5ecee">
              <p style="margin:0;font-size:12px;line-height:19px;color:#657780">${escapar(rodape)}</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

/** RF-030/RF-031 — convite responsivo para definição de senha, com CTA e link alternativo. */
export function renderTemplateConvite(nome: string, apresentacao: string, link: string): string {
  const linkSeguro = escapar(link);
  return renderLayoutEmail({
    nome,
    titulo: "Seu acesso está pronto",
    conteudo: `<p style="margin:0 0 24px;font-size:16px;line-height:25px;color:#52666f">${escapar(apresentacao)} Para começar, defina sua senha de acesso.</p><p style="margin:24px 0 8px;font-size:13px;line-height:20px;color:#52666f">Se o botão não funcionar, use este link:</p><p style="margin:0;font-size:13px;line-height:20px"><a href="${linkSeguro}" style="color:#0b6fb0;text-decoration:underline">Definir senha no Múltiplus</a></p>`,
    acao: { url: link, texto: "Definir minha senha" },
    nota: "Este link pode ser usado uma única vez e expira em 7 dias.",
    rodape: "Mensagem automática da Múltiplus Ambiental. Se você não esperava receber este acesso, ignore este e-mail.",
  });
}

const chamadaPorEvento: Record<EventoNotificacao, string> = {
  PRAZO_PROXIMO: "Há uma tarefa chegando ao prazo.",
  TAREFA_CONCLUIDA: "Uma tarefa foi concluída.",
  PROJETO_CONCLUIDO: "Um projeto foi concluído.",
  NOVO_COMENTARIO: "Há um novo comentário para você.",
  ATRIBUICAO_RECEBIDA: "Uma nova atribuição foi recebida.",
};

/** B7 — template único, compatível com o envio atual e pronto para virar template do Resend. */
export function renderTemplateNotificacao(evento: EventoNotificacao, dados: DadosTemplateNotificacao) {
  return renderLayoutEmail({
    nome: dados.nome,
    titulo: dados.titulo,
    conteudo: `<p style="margin:0 0 12px;font-size:16px;line-height:25px;color:#52666f">${escapar(chamadaPorEvento[evento])}</p><p style="margin:0 0 24px;font-size:16px;line-height:25px;color:#52666f;white-space:pre-wrap">${escapar(dados.mensagem)}</p>`,
    acao: dados.url ? { url: dados.url, texto: "Abrir no Múltiplus" } : undefined,
    rodape: "Mensagem automática da Múltiplus Ambiental. Você recebeu este aviso conforme as preferências de notificações do seu perfil.",
  });
}

export function renderTemplateMencaoComentario(dados: DadosTemplateNotificacao & { autor: string; comentario: string }) {
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  const url = dados.url ? new URL(dados.url, base).toString() : base;
  return renderLayoutEmail({
    nome: dados.nome,
    titulo: dados.titulo,
    conteudo: `<p style="margin:0 0 20px;font-size:16px;line-height:25px;color:#52666f">${escapar(dados.mensagem)}</p><p style="margin:0 0 10px;font-size:14px;line-height:22px;color:#52666f"><strong style="color:#18313c">${escapar(dados.autor)}</strong> escreveu:</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;background-color:#f8fafb;border-left:3px solid #0e7a3c"><tr><td style="padding:14px 16px;font-size:15px;line-height:24px;color:#52666f;white-space:pre-wrap">${escapar(dados.comentario)}</td></tr></table>`,
    acao: { url, texto: "Abrir comentário" },
    rodape: "Mensagem automática da Múltiplus Ambiental. Você recebeu este aviso conforme as preferências de notificações do seu perfil.",
  });
}
