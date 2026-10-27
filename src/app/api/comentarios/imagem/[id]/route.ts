import { NextResponse } from "next/server";
import { obterContexto } from "@/server/auth/contexto";
import { comContextoDeUsuario } from "@/lib/prisma-app";
import { lerImagemComentario } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Resolve a sessão antes de consultar a imagem; a RLS limita o comentário ao escopo do usuário.
    const ctx = await obterContexto();
    // Segmentos dinâmicos também são assíncronos no Next instalado neste projeto.
    const { id } = await params;
    const comentario = await comContextoDeUsuario(ctx, (tx) => tx.comentario.findUnique({ where: { id }, select: { imagemChave: true } }));
    // Mesma resposta para id inexistente ou comentário sem imagem, sem revelar dados do registro.
    if (!comentario?.imagemChave) return new NextResponse("Imagem não encontrada", { status: 404 });
    // O conteúdo é lido do bucket privado usando a chave armazenada no comentário.
    const dados = await lerImagemComentario(comentario.imagemChave);
    // A extensão foi definida durante o upload e determina o tipo de resposta permitido.
    const extensao = comentario.imagemChave.split(".").pop();
    const tipo = extensao === "jpg" ? "image/jpeg" : extensao === "png" ? "image/png" : "image/webp";
    // A opção download muda apenas a disposição; a imagem segue privada e sem cache.
    const download = new URL(request.url).searchParams.get("download") === "1";
    const headers: Record<string, string> = {
      "Content-Type": tipo,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    };
    if (download) headers["Content-Disposition"] = `attachment; filename="comentario-${id}.${extensao}"`;
    return new NextResponse(new Uint8Array(dados), { headers });
  } catch {
    // Ausência de sessão, falha de storage e registro indisponível têm resposta indistinguível.
    return new NextResponse("Imagem não encontrada", { status: 404 });
  }
}
