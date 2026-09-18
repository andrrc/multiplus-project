import { NextResponse } from "next/server";
import { dispararPrazoProximo } from "@/lib/notificacoes";

export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  const autorizado = segredo && request.headers.get("authorization") === `Bearer ${segredo}`;
  if (!autorizado) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const resultado = await dispararPrazoProximo();
  return NextResponse.json(resultado);
}
