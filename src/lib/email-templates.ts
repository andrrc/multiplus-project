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

const chamadaPorEvento: Record<EventoNotificacao, string> = {
  PRAZO_PROXIMO: "Há uma tarefa chegando ao prazo.",
  TAREFA_CONCLUIDA: "Uma tarefa foi concluída.",
  PROJETO_CONCLUIDO: "Um projeto foi concluído.",
  NOVO_COMENTARIO: "Há um novo comentário para você.",
  ATRIBUICAO_RECEBIDA: "Uma nova atribuição foi recebida.",
};

/** B7 — template único, compatível com o envio atual e pronto para virar template do Resend. */
export function renderTemplateNotificacao(evento: EventoNotificacao, dados: DadosTemplateNotificacao) {
  const link = dados.url
    ? `<p style="margin:24px 0"><a href="${escapar(dados.url)}" style="background:#1d5c63;color:#fff;padding:12px 18px;text-decoration:none;border-radius:3px">Abrir no Múltiplus</a></p>`
    : "";
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f1ea;color:#202525;font-family:Arial,sans-serif"><main style="max-width:560px;margin:32px auto;padding:32px;background:#fff"><p style="color:#1d5c63;font-size:12px;font-weight:bold;letter-spacing:.12em;text-transform:uppercase">Múltiplus Software</p><h1 style="font-size:24px;font-weight:500">${escapar(dados.titulo)}</h1><p>Olá, ${escapar(dados.nome)}.</p><p>${escapar(chamadaPorEvento[evento])}</p><p>${escapar(dados.mensagem)}</p>${link}<p style="color:#6b7471;font-size:12px">Você recebeu este aviso conforme as preferências de notificações do seu perfil.</p></main></body></html>`;
}
