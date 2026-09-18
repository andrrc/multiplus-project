import { NextResponse } from "next/server";
import { obterContexto } from "@/server/auth/contexto";
import { comContextoDeUsuario } from "@/lib/prisma-app";
import { lerImagemComentario } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await obterContexto();
    const { id } = await params;
    const comentario = await comContextoDeUsuario(ctx, (tx) => tx.comentario.findUnique({ where: { id }, select: { imagemChave: true } }));
    if (!comentario?.imagemChave) return new NextResponse("Imagem não encontrada", { status: 404 });
    const dados = await lerImagemComentario(comentario.imagemChave);
    const extensao = comentario.imagemChave.split(".").pop();
    const tipo = extensao === "jpg" ? "image/jpeg" : extensao === "png" ? "image/png" : "image/webp";
    return new NextResponse(new Uint8Array(dados), { headers: { "Content-Type": tipo, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new NextResponse("Imagem não encontrada", { status: 404 });
  }
}
