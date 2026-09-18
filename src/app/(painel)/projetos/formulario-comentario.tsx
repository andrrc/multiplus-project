"use client";

import { useRef, useState, useTransition } from "react";
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
  const [enviando, startTransition] = useTransition(); const [erro, setErro] = useState<string | null>(null); const [sucesso, setSucesso] = useState(false); const formRef = useRef<HTMLFormElement>(null);
  function enviar(formData: FormData) { setErro(null); setSucesso(false); startTransition(async () => { try { const arquivo = formData.get("imagem"); if (arquivo instanceof File && arquivo.size > 0) formData.set("imagem", await redimensionarImagem(arquivo)); await criarComentarioAction(formData); formRef.current?.reset(); setSucesso(true); } catch (error) { setErro(error instanceof Error ? error.message : "Não foi possível publicar o comentário."); } }); }
  return <form ref={formRef} action={enviar} className="mt-4 rounded-[3px] border border-linha bg-branco p-4"><input type="hidden" name="nivel" value={nivel} /><input type="hidden" name="entidadeId" value={entidadeId} />{tarefaId && <input type="hidden" name="tarefaId" value={tarefaId} />}<textarea name="texto" required rows={3} placeholder="Escreva uma atualização para este item" className={inputClass} /><div className="mt-2 grid gap-2 sm:grid-cols-[1fr_190px]"><input name="link" type="url" placeholder="Link opcional" className={inputClass} /><label className="flex min-h-11 cursor-pointer items-center rounded-[3px] border border-dashed border-linha px-3 font-[family-name:var(--font-interface)] text-[13px] text-cinza hover:border-azul"><span className="truncate">Anexar imagem</span><input name="imagem" type="file" accept="image/webp,image/jpeg,image/png" className="sr-only" /></label></div>{erro && <p className="mt-2 text-[13px] text-vermelho">{erro}</p>}{sucesso && <p className="mt-2 text-[13px] text-verde-esc">Comentário publicado.</p>}<button disabled={enviando} className="mt-3 min-h-10 rounded-[3px] bg-tinta px-4 font-[family-name:var(--font-interface)] text-[13px] font-semibold text-branco disabled:opacity-60">{enviando ? "Publicando…" : "Publicar comentário"}</button></form>;
}
