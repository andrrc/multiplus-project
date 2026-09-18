"use client";

import { useEffect, useRef, useState } from "react";

export function ImagemComentario({ comentarioId }: { comentarioId: string }) {
  const [aberta, setAberta] = useState(false);
  const fecharRef = useRef<HTMLButtonElement>(null);
  const imagemUrl = `/api/comentarios/imagem/${comentarioId}`;
  const downloadUrl = `${imagemUrl}?download=1`;

  useEffect(() => {
    if (!aberta) return;
    const aoPressionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAberta(false);
    };
    window.addEventListener("keydown", aoPressionarTecla);
    fecharRef.current?.focus();
    return () => window.removeEventListener("keydown", aoPressionarTecla);
  }, [aberta]);

  return (
    <div className="mt-3">
      <button type="button" onClick={() => setAberta(true)} className="group relative block max-w-full cursor-zoom-in overflow-hidden focus-visible:outline-none" aria-haspopup="dialog" aria-expanded={aberta}>
        {/* Imagem autenticada é entregue por rota interna, não por um host configurável do next/image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imagemUrl} alt="Imagem anexada ao comentário. Clique para ampliar." className="max-h-72 max-w-full object-contain transition-opacity group-hover:opacity-85" />
        <span className="pointer-events-none absolute bottom-2 right-2 bg-tinta px-2 py-1 font-[family-name:var(--font-interface)] text-[12px] font-semibold text-branco opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">Ampliar</span>
      </button>

      <a href={downloadUrl} download className="mt-2 inline-flex min-h-9 items-center gap-2 border border-linha px-3 font-[family-name:var(--font-interface)] text-[13px] font-semibold text-azul-esc hover:border-azul hover:bg-papel">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
        Salvar imagem
      </a>

      {aberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={`imagem-comentario-${comentarioId}`}>
          <button type="button" aria-label="Fechar visualização da imagem" onClick={() => setAberta(false)} className="fixed inset-0 cursor-default bg-tinta/90" />
          <div className="relative z-10 flex max-h-full w-full max-w-6xl flex-col border border-tinta2 bg-branco shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-linha bg-papel px-4 py-3 font-[family-name:var(--font-interface)]">
              <p id={`imagem-comentario-${comentarioId}`} className="text-[14px] font-semibold text-tinta">Imagem do comentário</p>
              <div className="flex items-center gap-2">
                <a href={downloadUrl} download className="min-h-9 px-3 py-2 text-[13px] font-semibold text-azul-esc hover:underline">Salvar imagem</a>
                <button ref={fecharRef} type="button" onClick={() => setAberta(false)} className="min-h-9 border border-linha px-3 text-[13px] font-semibold text-tinta hover:border-azul">Fechar</button>
              </div>
            </div>
            <div className="flex min-h-0 items-center justify-center bg-tinta p-3 sm:p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagemUrl} alt="Imagem anexada ao comentário ampliada" className="max-h-[calc(100vh-10rem)] max-w-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
