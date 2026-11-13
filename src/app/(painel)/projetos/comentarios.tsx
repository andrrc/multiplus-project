/**
 * Componente de interface `comentarios`. Recebe dados e callbacks de seu chamador, mantém apenas o estado necessário à interação e delega validações e persistência ao servidor.
 */
import { formatarDataHoraBrasilia } from "@/lib/datas";
import type { ReactNode } from "react";
import { listarComentarios, listarUsuariosMencionaveis, type AlvoComentario } from "@/lib/comentarios";
import { FormularioComentario } from "./formulario-comentario";
import { ImagemComentario } from "./imagem-comentario";
import { obterContexto } from "@/server/auth/contexto";
import { Avatar, Cartao } from "@/ui/cartao";

function destinoDoLink(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
}

function textoComMencoes(texto: string, nomesMencionados: string[]) {
  const nomes = [...new Set(nomesMencionados)].sort((a, b) => b.length - a.length);
  const partes: ReactNode[] = [];
  let cursor = 0;
  while (cursor < texto.length) {
    let indiceMaisProximo = -1;
    let nomeMaisProximo = "";
    for (const nome of nomes) {
      const indice = texto.indexOf(`@${nome}`, cursor);
      if (indice >= 0 && (indiceMaisProximo < 0 || indice < indiceMaisProximo)) {
        indiceMaisProximo = indice;
        nomeMaisProximo = nome;
      }
    }
    if (indiceMaisProximo < 0) {
      partes.push(texto.slice(cursor));
      break;
    }
    if (indiceMaisProximo > cursor) partes.push(texto.slice(cursor, indiceMaisProximo));
    partes.push(<strong key={`${indiceMaisProximo}-${nomeMaisProximo}`} className="font-semibold text-azul-esc">@{nomeMaisProximo}</strong>);
    cursor = indiceMaisProximo + nomeMaisProximo.length + 1;
  }
  return partes;
}

export async function Comentarios({ alvo, nivel, entidadeId, tarefaId }: { alvo: AlvoComentario; nivel: "projeto" | "tarefa" | "subtarefa"; entidadeId: string; tarefaId?: string }) {
  const ctx = await obterContexto();
  const [comentarios, usuariosMencionaveis] = await Promise.all([
    listarComentarios(ctx, alvo),
    listarUsuariosMencionaveis(ctx, alvo),
  ]);
  // Projeto e tarefa mostram os comentários num cartão; dentro de uma subtarefa ficam sem moldura.
  const compacto = nivel === "subtarefa";
  const total = comentarios.length;
  const conteudo = (
    <>
      <FormularioComentario nivel={nivel} entidadeId={entidadeId} tarefaId={tarefaId} usuariosMencionaveis={usuariosMencionaveis} />
      {total > 0 && <ol className="px-5">
        {comentarios.map((comentario) => (
          <li key={comentario.id} className="flex gap-3 border-t border-linha py-4 first:border-t-0">
            <Avatar nome={comentario.autor.nome} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 font-[family-name:var(--font-interface)] text-xs text-cinza">
                <strong className="text-sm font-semibold text-ink">{comentario.autor.nome}</strong>
                <time>{formatarDataHoraBrasilia(comentario.criadoEm)}</time>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-ink">{textoComMencoes(comentario.texto, comentario.nomesMencionados)}</p>
              {comentario.imagemChave && <ImagemComentario comentarioId={comentario.id} />}
              {comentario.link && (
                <a href={comentario.link} target="_blank" rel="noreferrer" title={comentario.link} className="mt-3 flex items-center gap-3 rounded-controle border border-linha bg-papel px-3 py-2.5 font-[family-name:var(--font-interface)] hover:bg-cabecalho focus-visible:outline-none">
                  <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-controle bg-branco text-azul-esc">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]"><path d="M10 13a5 5 0 0 0 7.07.07l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15" /><path d="M14 11a5 5 0 0 0-7.07-.07l-2 2A5 5 0 0 0 12 20l1.15-1.15" /></svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-cinza">Link anexado</span>
                    <span className="block truncate text-sm font-semibold text-ink">{destinoDoLink(comentario.link)}</span>
                  </span>
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-none stroke-azul-esc stroke-[1.8]"><path d="M7 17 17 7" /><path d="M8 7h9v9" /></svg>
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>}
    </>
  );

  if (compacto) {
    return (
      <section className="mt-5 overflow-hidden rounded-cartao border border-linha bg-branco">
        <h3 className="border-b border-linha px-5 py-3 font-[family-name:var(--font-interface)] text-[13px] font-semibold">Comentários <span className="font-normal text-cinza">({total})</span></h3>
        {conteudo}
      </section>
    );
  }
  return (
    <Cartao titulo={<>Comentários <span className="rounded-full bg-papel px-2 py-px text-xs font-semibold tabular-nums text-ink">{total}</span></>} semMargem>
      {conteudo}
    </Cartao>
  );
}
