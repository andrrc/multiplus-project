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

type UsuarioMencionavel = { id: string; nome: string; perfil: string };

const perfilLabel: Record<string, string> = {
  ADMIN: "Administradora",
  ADMIN_INTERNO: "Equipe interna",
  ADMIN_EXTERNO: "Equipe externa",
  CLIENTE: "Cliente",
};

export function FormularioComentario({ nivel, entidadeId, tarefaId, usuariosMencionaveis }: { nivel: "projeto" | "tarefa" | "subtarefa"; entidadeId: string; tarefaId?: string; usuariosMencionaveis: UsuarioMencionavel[] }) {
  const [enviando, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [anexo, setAnexo] = useState<{ nome: string; tamanho: number; preview: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const imagemRef = useRef<HTMLInputElement>(null);
  const textoRef = useRef<HTMLTextAreaElement>(null);
  const [texto, setTexto] = useState("");
  const [mencoes, setMencoes] = useState<UsuarioMencionavel[]>([]);
  const [consultaMencao, setConsultaMencao] = useState<{ inicio: number; texto: string } | null>(null);
  const [opcaoMencaoAtiva, setOpcaoMencaoAtiva] = useState(0);

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

  const sugestoes = consultaMencao
    ? usuariosMencionaveis.filter((usuario) => usuario.nome.toLocaleLowerCase("pt-BR").includes(consultaMencao.texto.toLocaleLowerCase("pt-BR"))).slice(0, 6)
    : [];

  function alterarTexto(valor: string, cursor: number) {
    setTexto(valor);
    setMencoes((atuais) => atuais.filter((usuario) => valor.includes(`@${usuario.nome}`)));
    const antesDoCursor = valor.slice(0, cursor);
    const correspondencia = antesDoCursor.match(/@([^\s@]*)$/u);
    if (!correspondencia) {
      setConsultaMencao(null);
      return;
    }
    setConsultaMencao({ inicio: cursor - correspondencia[1].length - 1, texto: correspondencia[1] });
    setOpcaoMencaoAtiva(0);
  }

  function selecionarMencao(usuario: UsuarioMencionavel) {
    const campo = textoRef.current;
    if (!campo || !consultaMencao) return;
    const cursor = campo.selectionStart;
    const insercao = `@${usuario.nome} `;
    const novoTexto = `${texto.slice(0, consultaMencao.inicio)}${insercao}${texto.slice(cursor)}`;
    const novoCursor = consultaMencao.inicio + insercao.length;
    setTexto(novoTexto);
    setMencoes((atuais) => atuais.some((atual) => atual.id === usuario.id) ? atuais : [...atuais, usuario]);
    setConsultaMencao(null);
    requestAnimationFrame(() => { campo.focus(); campo.setSelectionRange(novoCursor, novoCursor); });
  }

  function navegarSugestoes(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!consultaMencao || sugestoes.length === 0) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setOpcaoMencaoAtiva((atual) => (atual + 1) % sugestoes.length); }
    if (event.key === "ArrowUp") { event.preventDefault(); setOpcaoMencaoAtiva((atual) => (atual - 1 + sugestoes.length) % sugestoes.length); }
    if (event.key === "Enter" || event.key === "Tab") { event.preventDefault(); selecionarMencao(sugestoes[opcaoMencaoAtiva] ?? sugestoes[0]); }
    if (event.key === "Escape") { setConsultaMencao(null); }
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
        setTexto("");
        setMencoes([]);
        setConsultaMencao(null);
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

      <div>
        <textarea ref={textoRef} name="texto" required rows={3} value={texto} onChange={(event) => alterarTexto(event.target.value, event.target.selectionStart)} onKeyDown={navegarSugestoes} placeholder="Escreva uma atualização para este item" className={inputClass} aria-autocomplete="list" aria-controls="sugestoes-mencao-comentario" />
        {consultaMencao && sugestoes.length > 0 && <ul id="sugestoes-mencao-comentario" role="listbox" aria-label="Pessoas para mencionar" className="mt-1 max-h-56 overflow-y-auto rounded-[3px] border border-linha bg-branco py-1 shadow-lg">
          {sugestoes.map((usuario, indice) => <li key={usuario.id} role="option" aria-selected={indice === opcaoMencaoAtiva}><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selecionarMencao(usuario)} className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left ${indice === opcaoMencaoAtiva ? "bg-verde-cl" : "hover:bg-papel"}`}><span className="truncate text-[14px] font-medium text-tinta">{usuario.nome}</span><span className="shrink-0 text-[12px] text-cinza">{perfilLabel[usuario.perfil] ?? "Usuário"}</span></button></li>)}
        </ul>}
        {consultaMencao && sugestoes.length === 0 && <p role="status" className="mt-1 rounded-[3px] border border-linha bg-branco px-3 py-2 text-[13px] text-cinza">Nenhuma pessoa com acesso a este registro corresponde à busca.</p>}
      </div>
      <p className="mt-1 text-[12px] text-cinza">Digite @ para mencionar alguém que também tenha acesso a este registro. Você e as pessoas mencionadas receberão um e-mail.</p>
      {mencoes.map((usuario) => <input key={usuario.id} type="hidden" name="mencaoUsuarioId" value={usuario.id} />)}
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

      {erro && <p role="alert" className="mt-2 text-[13px] text-critico">{erro}</p>}
      {sucesso && <p role="status" className="mt-2 text-[13px] text-verde-esc">Comentário publicado.</p>}
      <button disabled={enviando} className="mt-3 min-h-10 rounded-[3px] bg-tinta px-4 font-[family-name:var(--font-interface)] text-[13px] font-semibold text-branco disabled:opacity-60">{enviando ? "Publicando…" : "Publicar comentário"}</button>
    </form>
  );
}
