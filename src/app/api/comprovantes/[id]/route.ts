import { NextResponse } from "next/server";
import { obterContexto } from "@/server/auth/contexto";
import { abrirArquivoComprovante, removerRascunho } from "@/lib/comprovantes";
import { ehImagemComprovante, origemConfere } from "@/lib/comprovantes-arquivos";

export const runtime = "nodejs";

/** Remove um rascunho (arquivo anexado e ainda não enviado) do próprio colaborador. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!origemConfere(request.headers.get("origin"), request.headers.get("host"))) {
    return NextResponse.json({ erro: "Requisição não permitida." }, { status: 403 });
  }
  try {
    const ctx = await obterContexto();
    const { id } = await params;
    await removerRascunho(ctx, id);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ erro: "Não foi possível remover o arquivo." }, { status: 400 });
  }
}

/**
 * Entrega o arquivo de um comprovante. O acesso é decidido pela RLS na consulta; sem acesso, sem sessão e arquivo
 * inexistente têm a mesma resposta (404). Imagens abrem na página; os demais tipos são sempre baixados.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await obterContexto();
    const { id } = await params;
    const arquivo = await abrirArquivoComprovante(ctx, id);
    if (!arquivo) return new NextResponse("Arquivo não encontrado", { status: 404 });
    const imagem = ehImagemComprovante(arquivo.tipo);
    const baixar = !imagem || new URL(request.url).searchParams.get("download") === "1";
    const headers: Record<string, string> = {
      "Content-Type": arquivo.tipo,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      // Sem script nem recurso externo, mesmo que um arquivo aberto na página tenha conteúdo inesperado.
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    };
    if (baixar) headers["Content-Disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(arquivo.nomeOriginal)}`;
    return new NextResponse(new Uint8Array(arquivo.dados), { headers });
  } catch {
    return new NextResponse("Arquivo não encontrado", { status: 404 });
  }
}
