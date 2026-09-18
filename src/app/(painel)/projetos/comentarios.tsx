import { listarComentarios, type AlvoComentario } from "@/lib/comentarios";
import { FormularioComentario } from "./formulario-comentario";
import { obterContexto } from "@/server/auth/contexto";

function destinoDoLink(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
}

export async function Comentarios({ alvo, nivel, entidadeId, tarefaId }: { alvo: AlvoComentario; nivel: "projeto" | "tarefa" | "subtarefa"; entidadeId: string; tarefaId?: string }) {
  const comentarios = await listarComentarios(await obterContexto(), alvo);
  return (
    <section className="mt-9 max-w-[760px] border-t border-linha pt-6">
      <h2 className="text-[21px]">Comentários <span className="font-[family-name:var(--font-interface)] text-[14px] text-cinza">({comentarios.length})</span></h2>
      {comentarios.length > 0 && <ol className="mt-4 space-y-3">
        {comentarios.map((comentario) => (
          <li key={comentario.id} className="border-l-[3px] border-l-azul bg-branco px-5 py-4">
            <div className="flex flex-wrap justify-between gap-2 font-[family-name:var(--font-interface)] text-[12px] text-cinza">
              <strong className="font-semibold text-tinta">{comentario.autor.nome}</strong>
              <time>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(comentario.criadoEm)}</time>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-[14px] leading-6 text-tinta">{comentario.texto}</p>
            {comentario.imagemChave && (
              /* Imagem autenticada é entregue por rota interna, não por um host configurável do next/image. */
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={`/api/comentarios/imagem/${comentario.id}`} alt="Imagem anexada ao comentário" className="mt-3 max-h-72 max-w-full object-contain" />
            )}
            {comentario.link && (
              <a href={comentario.link} target="_blank" rel="noreferrer" title={comentario.link} className="mt-3 flex items-center gap-3 border-l-[3px] border-verde bg-verde-cl px-3 py-2.5 font-[family-name:var(--font-interface)] hover:bg-branco focus-visible:outline-none">
                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center border border-verde-borda bg-branco text-verde-esc">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]"><path d="M10 13a5 5 0 0 0 7.07.07l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15" /><path d="M14 11a5 5 0 0 0-7.07-.07l-2 2A5 5 0 0 0 12 20l1.15-1.15" /></svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] text-cinza">Link anexado</span>
                  <span className="block truncate text-[14px] font-semibold text-tinta">{destinoDoLink(comentario.link)}</span>
                </span>
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-none stroke-azul-esc stroke-[1.8]"><path d="M7 17 17 7" /><path d="M8 7h9v9" /></svg>
              </a>
            )}
          </li>
        ))}
      </ol>}
      <FormularioComentario nivel={nivel} entidadeId={entidadeId} tarefaId={tarefaId} />
    </section>
  );
}
