import { NextRequest } from "next/server";
import { gerarExportacaoTarefasPdf } from "@/lib/exportacao-pdf-tarefas";
import { obterContexto } from "@/server/auth/contexto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ listagem: string }> },
) {
  const { listagem } = await params;
  if (listagem !== "tarefas" && listagem !== "subtarefas") {
    return Response.json({ erro: "Listagem inválida." }, { status: 404 });
  }

  let contexto;
  try {
    contexto = await obterContexto();
  } catch (erro) {
    if (erro instanceof Error && erro.message === "Sessão não encontrada.") {
      return Response.json({ erro: "Autenticação necessária." }, { status: 401 });
    }
    throw erro;
  }
  if (contexto.perfil !== "ADMIN") {
    return Response.json({ erro: "Exportação disponível somente para a administração." }, { status: 403 });
  }

  try {
    const pdf = await gerarExportacaoTarefasPdf(contexto, request.nextUrl.searchParams, listagem);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="exportacao-${listagem}.pdf"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (erro) {
    if (erro instanceof Error && erro.message.startsWith("O filtro ")) {
      return Response.json({ erro: erro.message }, { status: 400 });
    }
    throw erro;
  }
}
