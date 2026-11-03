import type { EventoNotificacao, Perfil } from "@prisma/client";

export type TipoToast = "sucesso" | "aviso" | "erro" | "informacao";

export type NotificacaoToast = {
  id: string;
  evento: EventoNotificacao;
  titulo: string;
  mensagem: string;
  url: string | null;
  criadaEm: Date | string;
};

export type ToastDemonstracao = NotificacaoToast & {
  demonstracao: true;
  tipoVisual: TipoToast;
};

export const EVENTO_GERAR_TOASTS_DEMONSTRACAO = "mplus:gerar-toasts-demonstracao";

export function podeGerarToastsDemonstracao(perfil: Perfil, ambiente: string) {
  return perfil === "ADMIN" && ambiente !== "production";
}

export function criarAmostrasToastDemonstracao(lote: string, criadaEm = new Date()): ToastDemonstracao[] {
  const exemplos: Array<Omit<ToastDemonstracao, "id" | "criadaEm"> & { chave: string }> = [
    { chave: "sucesso", demonstracao: true, tipoVisual: "sucesso", evento: "TAREFA_CONCLUIDA", titulo: "Demonstração · Sucesso", mensagem: "Uma tarefa foi concluída com sucesso.", url: "/notificacoes" },
    { chave: "aviso", demonstracao: true, tipoVisual: "aviso", evento: "PRAZO_PROXIMO", titulo: "Demonstração · Atenção", mensagem: "Há um prazo próximo que merece atenção.", url: "/notificacoes" },
    { chave: "informacao", demonstracao: true, tipoVisual: "informacao", evento: "NOVO_COMENTARIO", titulo: "Demonstração · Informação", mensagem: "Uma atualização está disponível para você.", url: "/notificacoes" },
    { chave: "erro", demonstracao: true, tipoVisual: "erro", evento: "NOVO_COMENTARIO", titulo: "Demonstração · Erro", mensagem: "Este é um exemplo visual de uma mensagem de erro.", url: "/notificacoes" },
  ];

  return exemplos.map(({ chave, ...toast }) => ({ ...toast, id: `demo:${lote}:${chave}`, criadaEm }));
}

export function substituirAmostrasToast<T extends { demonstracao?: boolean }>(fila: T[], amostras: T[]) {
  return [...fila.filter((toast) => !toast.demonstracao), ...amostras];
}

export function enfileirarToast<T extends { id: string }>(fila: T[], toast: T) {
  return fila.some((item) => item.id === toast.id) ? fila : [...fila, toast];
}

export function toastsVisiveis<T>(fila: T[], limite = 3) {
  return fila.slice(0, limite);
}

export function calcularTempoRestanteToast(restanteMs: number, decorridoMs: number) {
  return Math.max(0, restanteMs - decorridoMs);
}

export function tipoToastDoEvento(evento: EventoNotificacao): TipoToast {
  switch (evento) {
    case "TAREFA_CONCLUIDA":
    case "PROJETO_CONCLUIDO":
      return "sucesso";
    case "PRAZO_PROXIMO":
    case "CONCLUSAO_SOLICITADA":
      return "aviso";
    case "NOVO_COMENTARIO":
    case "ATRIBUICAO_RECEBIDA":
      return "informacao";
  }
}

export function rotaCentralNotificacoes(perfil: Perfil) {
  return perfil === "ADMIN" ? "/notificacoes" : "/minhas-notificacoes";
}

export function rotaSeguraDoToast(url: string | null, perfil: Perfil) {
  if (!url || !url.startsWith("/") || url.startsWith("//") || url.includes("\\")) {
    return rotaCentralNotificacoes(perfil);
  }

  try {
    const destino = new URL(url, "https://multiplus.invalid");
    if (destino.origin !== "https://multiplus.invalid") return rotaCentralNotificacoes(perfil);
    return `${destino.pathname}${destino.search}${destino.hash}`;
  } catch {
    return rotaCentralNotificacoes(perfil);
  }
}

export function textoResumoNotificacoes(quantidade: number) {
  return quantidade === 1
    ? "Você tem 1 notificação nova"
    : `Você tem ${quantidade} notificações novas`;
}

export function idDaNotificacaoDoUsuario(payload: string, usuarioId: string) {
  return sinalNotificacaoDoUsuario(payload, usuarioId)?.id ?? null;
}

export function sinalNotificacaoDoUsuario(payload: string, usuarioId: string) {
  try {
    const aviso = JSON.parse(payload) as { id?: unknown; usuarioId?: unknown; lida?: unknown };
    if (aviso.usuarioId !== usuarioId || typeof aviso.id !== "string" || typeof aviso.lida !== "boolean") return null;
    return { id: aviso.id, lida: aviso.lida };
  } catch {
    return null;
  }
}
