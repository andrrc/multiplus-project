import { NextResponse } from "next/server";
import { obterContexto } from "@/server/auth/contexto";
import { anexarComprovante, interpretarTipoItem } from "@/lib/comprovantes";
import { mensagemDeErroComprovante, origemConfere } from "@/lib/comprovantes-arquivos";

export const runtime = "nodejs";

/**
 * Anexa UM arquivo de comprovante a um item do colaborador. Um arquivo por requisição mantém cada chamada abaixo do
 * limite de 12 MB do proxy; o envio em si (que cria o pedido de conclusão) é a server action de `solicitarConclusao`.
 */
export async function POST(request: Request) {
  if (!origemConfere(request.headers.get("origin"), request.headers.get("host"))) {
    return NextResponse.json({ erro: "Requisição não permitida." }, { status: 403 });
  }
  let ctx;
  try {
    ctx = await obterContexto();
  } catch {
    return NextResponse.json({ erro: "Sessão expirada. Entre de novo." }, { status: 401 });
  }
  try {
    const formulario = await request.formData();
    const arquivo = formulario.get("arquivo");
    if (!(arquivo instanceof File)) return NextResponse.json({ erro: "Informe o arquivo." }, { status: 400 });
    const tipo = interpretarTipoItem(formulario.get("tipo"));
    const itemId = String(formulario.get("itemId") ?? "");
    if (!itemId) return NextResponse.json({ erro: "Item inválido." }, { status: 400 });
    const anexado = await anexarComprovante(ctx, tipo, itemId, arquivo);
    return NextResponse.json({ arquivo: anexado }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (erro) {
    return NextResponse.json({ erro: mensagemDeErroComprovante(erro) }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
