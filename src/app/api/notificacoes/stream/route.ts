import { Client } from "pg";
import { auth } from "@/server/auth";
import { obterContexto } from "@/server/auth/contexto";
import { buscarNotificacaoNaoLidaParaToast, listarNotificacoesNaoLidasDesde } from "@/lib/notificacoes";
import { sinalNotificacaoDoUsuario } from "@/lib/notificacoes-toasts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const canal = "notificacoes_novas";
const codificarCursor = (data: Date, id: string) => Buffer.from(`${data.toISOString()}|${id}`).toString("base64url");

function decodificarCursor(valor: string | null) {
  if (!valor) return null;
  try {
    const [dataTexto] = Buffer.from(valor, "base64url").toString("utf8").split("|");
    const data = new Date(dataTexto);
    if (!Number.isFinite(data.getTime())) return null;
    // Limita a recuperação de eventos a uma janela recente e evita consultas arbitrárias.
    if (data.getTime() < Date.now() - 24 * 60 * 60 * 1000 || data.getTime() > Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return new Response("Não autenticado.", { status: 401 });

  const ctx = await obterContexto().catch(() => null);
  if (!ctx) return new Response("Sessão inválida.", { status: 401 });
  if (ctx.perfil === "CLIENTE") return new Response("Sem acesso.", { status: 403 });
  if (!process.env.APP_DATABASE_URL) return new Response("Canal indisponível.", { status: 503 });

  const cliente = new Client({ connectionString: process.env.APP_DATABASE_URL });
  try {
    await cliente.connect();
    await cliente.query(`LISTEN ${canal}`);
  } catch (erro) {
    await cliente.end().catch(() => undefined);
    console.error("[notificacoes] não foi possível abrir SSE:", erro);
    return new Response("Canal indisponível.", { status: 503 });
  }
  // Cobre criações concorrentes ocorridas enquanto a conexão estava sendo aberta.
  const pontoRecuperacao = new Date();

  const encoder = new TextEncoder();
  const cursor = decodificarCursor(request.headers.get("last-event-id"));
  let cancelarStream: (() => void) | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let encerrado = false;
      const enviados = new Set<string>();

      const escrever = (texto: string) => {
        if (encerrado) return;
        try {
          controller.enqueue(encoder.encode(texto));
        } catch {
          limpar();
        }
      };

      const emitirItem = async (id: string) => {
        if (encerrado || enviados.has(id)) return;
        const item = await buscarNotificacaoNaoLidaParaToast(ctx, id);
        if (!item || encerrado) return;
        enviados.add(id);
        if (enviados.size > 500) enviados.delete(enviados.values().next().value!);
        const cursorEvento = codificarCursor(item.criadaEm, item.id);
        const dados = JSON.stringify({ ...item, criadaEm: item.criadaEm.toISOString() });
        escrever(`id: ${cursorEvento}\nevent: notificacao\ndata: ${dados}\n\n`);
      };

      const aoReceberNotificacao = (mensagem: { channel?: string; payload?: string }) => {
        if (mensagem.channel !== canal || !mensagem.payload) return;
        const sinal = sinalNotificacaoDoUsuario(mensagem.payload, ctx.usuarioId);
        if (!sinal) return;
        if (sinal.lida) {
          enviados.delete(sinal.id);
          escrever(`event: notificacao-lida\ndata: ${JSON.stringify({ id: sinal.id })}\n\n`);
        } else {
          void emitirItem(sinal.id);
        }
      };

      const aoFalhar = (erro: Error) => {
        console.error("[notificacoes] conexão SSE encerrada:", erro);
        limpar();
      };

      const limpar = () => {
        if (encerrado) return;
        encerrado = true;
        clearInterval(heartbeat);
        clearInterval(validacaoSessao);
        cliente.removeListener("notification", aoReceberNotificacao);
        cliente.removeListener("error", aoFalhar);
        void cliente.query(`UNLISTEN ${canal}`).catch(() => undefined).finally(() => cliente.end().catch(() => undefined));
        try {
          controller.close();
        } catch {
          // O navegador pode encerrar o stream entre o evento e o fechamento.
        }
      };
      cancelarStream = limpar;
      const heartbeat = setInterval(() => escrever(": keepalive\n\n"), 20_000);
      const validacaoSessao = setInterval(() => {
        void obterContexto().then((atual) => {
          if (atual.usuarioId !== ctx.usuarioId || atual.perfil === "CLIENTE") {
            escrever("event: sessao-expirada\ndata: {}\n\n");
            limpar();
          }
        }).catch(() => {
          escrever("event: sessao-expirada\ndata: {}\n\n");
          limpar();
        });
      }, 60_000);

      cliente.on("notification", aoReceberNotificacao);
      cliente.on("error", aoFalhar);
      escrever("retry: 3000\n: conectado\n\n");

      // Inscreve primeiro e só então recupera o intervalo, evitando perder criações concorrentes.
      void listarNotificacoesNaoLidasDesde(ctx, cursor ?? pontoRecuperacao).then((itens) => {
        for (const item of itens) void emitirItem(item.id);
      }).catch((erro: unknown) => console.error("[notificacoes] falha ao recuperar SSE:", erro));
    },
    cancel() {
      cancelarStream?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
