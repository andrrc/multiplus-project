import { NextResponse } from "next/server";
import { executarJobPrazo } from "@/lib/notificacoes";

export async function GET(request: Request) {
  // O segredo do cron evita que chamadas externas executem o job sem autorização.
  const segredo = process.env.CRON_SECRET;
  const autorizado = segredo && request.headers.get("authorization") === `Bearer ${segredo}`;
  if (!autorizado) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  try {
    // A rotina executa os avisos e devolve contagem de sucesso/falha para o monitor.
    const resultado = await executarJobPrazo();
    return NextResponse.json(resultado, { status: resultado.falhas ? 500 : 200 });
  } catch {
    // Converte exceções inesperadas em resposta genérica sem expor detalhes internos.
    return NextResponse.json({ erro: "Falha ao executar avisos de prazo" }, { status: 500 });
  }
}
