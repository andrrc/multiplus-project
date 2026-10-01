import { NextResponse } from "next/server";
import { executarJobPrazo } from "@/lib/notificacoes";

export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  const autorizado = segredo && request.headers.get("authorization") === `Bearer ${segredo}`;
  if (!autorizado) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  try {
    const resultado = await executarJobPrazo();
    return NextResponse.json(resultado, { status: resultado.falhas ? 500 : 200 });
  } catch {
    return NextResponse.json({ erro: "Falha ao executar avisos de prazo" }, { status: 500 });
  }
}
