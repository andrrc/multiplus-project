"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { criarComentarioAction } from "./actions";
import { inputClass } from "@/ui/campo";

async function redimensionarImagem(arquivo: File): Promise<File> {
  if (arquivo.type === "image/webp" && arquivo.size <= 10 * 1024 * 1024) return arquivo;
  const imagem = new Image();
  const url = URL.createObjectURL(arquivo);
  try {
    await new Promise<void>((resolve, reject) => { imagem.onload = () => resolve(); imagem.onerror = () => reject(new Error("Não foi possível ler a imagem.")); imagem.src = url; });
    const escala = Math.min(1, 2000 / Math.max(imagem.naturalWidth, imagem.naturalHeight));
    const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(imagem.naturalWidth * escala)); canvas.height = Math.max(1, Math.round(imagem.naturalHeight * escala));
    canvas.getContext("2d")?.drawImage(imagem, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
    if (!blob) throw new Error("Não foi possível preparar a imagem.");
    return new File([blob], "comentario.webp", { type: "image/webp" });
  } finally { URL.revokeObjectURL(url); }
}

export function FormularioComentario({ nivel, entidadeId, tarefaId }: { nivel: "projeto" | "tarefa" | "subtarefa"; entidadeId: string; tarefaId?: string }) {
  const [enviando, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [anexo, setAnexo] = useState<{ nome: string; tamanho: number; preview: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const imagemRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (anexo) URL.revokeObjectURL(anexo.preview); }, [anexo]);

  function selecionarImagem(event: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    setErro(null);
    setSucesso(false);
    if (!arquivo) return setAnexo(null);
    setAnexo({ nome: arquivo.name, tamanho: arquivo.size, preview: URL.createObjectURL(arquivo) });
  }

  function removerImagem() {
    if (imagemRef.current) imagemRef.current.value = "";
    setAnexo(null);
  }

  function enviar(formData: FormData) {
    setErro(null);
    setSucesso(false);
    startTransition(async () => {
      try {
        const arquivo = formData.get("imagem");
        if (arquivo instanceof File && arquivo.size > 0) formData.set("imagem", await redimensionarImagem(arquivo));
        await criarComentarioAction(formData);
        formRef.current?.reset();
        setAnexo(null);
        setSucesso(true);
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível publicar o comentário.");
      }
    });
  }

  const tamanho = anexo && (anexo.tamanho < 1024 * 1024
    ? `${Math.max(1, Math.round(anexo.tamanho / 1024))} KB`
    : `${(anexo.tamanho / 1024 / 1024).toFixed(1)} MB`);

  return (
    <form ref={formRef} action={enviar} className="mt-4 rounded-[3px] border border-linha bg-branco p-4">
      <input type="hidden" name="nivel" value={nivel} />
      <input type="hidden" name="entidadeId" value={entidadeId} />
      {tarefaId && <input type="hidden" name="tarefaId" value={tarefaId} />}

      <textarea name="texto" required rows={3} placeholder="Escreva uma atualização para este item" className={inputClass} />
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_190px]">
        <input name="link" type="url" placeholder="Link opcional" className={inputClass} />
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[3px] border border-dashed border-linha px-3 font-[family-name:var(--font-interface)] text-[13px] text-cinza hover:border-azul hover:text-tinta focus-within:border-azul focus-within:text-tinta">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-none stroke-current stroke-[1.8]"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m21 3-9.5 9.5-3-3L18 0" /></svg>
          <span className="truncate">{anexo ? "Trocar imagem" : "Anexar imagem"}</span>
          <input ref={imagemRef} name="imagem" type="file" accept="image/webp,image/jpeg,image/png" className="sr-only" onChange={selecionarImagem} />
        </label>
      </div>

      {anexo && <div className="mt-3 flex items-center gap-3 border-l-[3px] border-azul bg-papel p-3" aria-live="polite">
        {/* A prévia usa uma URL local temporária (blob), incompatível com a otimização remota do next/image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={anexo.preview} alt="Prévia da imagem que será anexada" className="h-14 w-14 shrink-0 border border-linha bg-branco object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-[family-name:var(--font-interface)] text-[13px] font-semibold text-tinta">{anexo.nome}</p>
          <p className="mt-0.5 text-[12px] text-cinza">Imagem pronta para ser anexada · {tamanho}</p>
        </div>
        <button type="button" onClick={removerImagem} className="shrink-0 font-[family-name:var(--font-interface)] text-[13px] text-azul-esc hover:underline">Remover</button>
      </div>}

      {erro && <p role="alert" className="mt-2 text-[13px] text-vermelho">{erro}</p>}
      {sucesso && <p role="status" className="mt-2 text-[13px] text-verde-esc">Comentário publicado.</p>}
      <button disabled={enviando} className="mt-3 min-h-10 rounded-[3px] bg-tinta px-4 font-[family-name:var(--font-interface)] text-[13px] font-semibold text-branco disabled:opacity-60">{enviando ? "Publicando…" : "Publicar comentário"}</button>
    </form>
  );
}
