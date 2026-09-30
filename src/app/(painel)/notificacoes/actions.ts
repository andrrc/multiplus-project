"use server";

import { EventoNotificacao } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { obterContexto } from "@/server/auth/contexto";
import { atualizarPreferenciaNotificacao, marcarNotificacaoLida, marcarTodasNotificacoesLidas } from "@/lib/notificacoes";
import { atualizarLimitesSemaforo } from "@/lib/semaforo";

const perfis = ["ADMIN", "ADMIN_INTERNO", "ADMIN_EXTERNO", "CLIENTE"] as const;

export async function marcarNotificacaoLidaAction(id: string) {
  await marcarNotificacaoLida(await obterContexto(), id);
  revalidatePath("/notificacoes");
}

export async function marcarTodasNotificacoesLidasAction() {
  await marcarTodasNotificacoesLidas(await obterContexto());
  revalidatePath("/notificacoes");
}

export async function atualizarPreferenciaAction(formData: FormData) {
  const perfil = String(formData.get("perfil"));
  const evento = String(formData.get("evento"));
  if (!perfis.includes(perfil as typeof perfis[number]) || !Object.values(EventoNotificacao).includes(evento as EventoNotificacao)) throw new Error("Preferência inválida.");
  await atualizarPreferenciaNotificacao(await obterContexto(), perfil as typeof perfis[number], evento as EventoNotificacao, {
    email: formData.get("email") === "on",
    inApp: formData.get("inApp") === "on",
  });
  revalidatePath("/notificacoes");
}

export async function atualizarSemaforoAction(formData: FormData) {
  await atualizarLimitesSemaforo(await obterContexto(), {
    diasVermelhoAte: Number(formData.get("diasVermelhoAte")),
    diasAmareloAte: Number(formData.get("diasAmareloAte")),
  });
  revalidatePath("/notificacoes");
}
