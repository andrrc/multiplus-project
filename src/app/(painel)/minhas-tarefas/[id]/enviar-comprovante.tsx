"use client";

/**
 * Tela de envio de comprovante do colaborador (protótipo do colaborador externo, `01-minhas-tarefas.html`): lista "o que
 * enviar", aviso de privacidade, botões "Tirar foto" e "Galeria ou arquivo", contador do que é exigido, observação e o botão
 * "Enviar comprovante", que só liga quando a quantidade exigida foi anexada.
 *
 * Cada arquivo sobe sozinho para `/api/comprovantes` (um por requisição, para caber no limite do proxy) e fica como rascunho;
 * o envio em si é a server action `acaoEnviar`, que cria o pedido de conclusão com os rascunhos. As fotos são reduzidas
 * aqui, no navegador, antes de subir (fotos de celular têm de 3 a 8 MB). A conferência de verdade é a do servidor.
 */
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ACCEPT_COMPROVANTE, LIMITE_ARQUIVO_COMPROVANTE_BYTES } from "@/lib/comprovantes-arquivos";
import { botaoPrimario, botaoSecundario } from "@/ui/botoes";
import { inputClass } from "@/ui/campo";

type Anexado = { id: string; nomeOriginal: string; tipo: string; tamanhoBytes: number };
type EmEnvio = { chave: string; nome: string; erro?: string };

const LADO_MAXIMO = 2048;
const LIMITE_SEM_REDUZIR = 1.5 * 1024 * 1024;

/** Reduz foto grande para JPEG de até 2048 px no maior lado; qualquer falha devolve o arquivo original. */
async function prepararArquivo(arquivo: File): Promise<File> {
  if (!arquivo.type.startsWith("image/") || arquivo.size <= LIMITE_SEM_REDUZIR) return arquivo;
  try {
    // O navegador já aplica a orientação gravada na foto (EXIF) por padrão.
    const imagem = await createImageBitmap(arquivo);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagem.width, imagem.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(imagem.width * escala);
    canvas.height = Math.round(imagem.height * escala);
    canvas.getContext("2d")?.drawImage(imagem, 0, 0, canvas.width, canvas.height);
    imagem.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob || blob.size >= arquivo.size) return arquivo;
    return new File([blob], arquivo.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return arquivo;
  }
}

function BotaoEnviar({ habilitado }: { habilitado: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={!habilitado || pending} className={`${botaoPrimario} w-full`}>{pending ? "Enviando..." : "Enviar comprovante"}</button>;
}

function tamanho(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export function EnviarComprovante({
  tipo,
  itemId,
  quantidade,
  instrucoes,
  rascunhosIniciais,
  acaoEnviar,
  motivoDevolucao,
}: {
  tipo: "TAREFA" | "SUBTAREFA";
  itemId: string;
  quantidade: number;
  instrucoes: string[];
  rascunhosIniciais: Anexado[];
  /** Server action já ligada ao item: cria o pedido de conclusão com os arquivos anexados e a observação. */
  acaoEnviar: (formData: FormData) => void | Promise<void>;
  motivoDevolucao?: string | null;
}) {
  const [anexados, setAnexados] = useState<Anexado[]>(rascunhosIniciais);
  const [enviando, setEnviando] = useState<EmEnvio[]>([]);
  const camera = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);

  const ocupado = enviando.some((item) => !item.erro);
  const completo = anexados.length >= quantidade;

  async function subir(arquivos: FileList | null) {
    if (!arquivos || arquivos.length === 0) return;
    const lista = Array.from(arquivos);
    for (const original of lista) {
      const chave = `${original.name}-${Date.now()}-${Math.random()}`;
      setEnviando((atual) => [...atual, { chave, nome: original.name }]);
      try {
        const arquivo = await prepararArquivo(original);
        if (arquivo.size > LIMITE_ARQUIVO_COMPROVANTE_BYTES) throw new Error("Cada arquivo deve ter no máximo 10 MB.");
        const corpo = new FormData();
        corpo.set("tipo", tipo);
        corpo.set("itemId", itemId);
        corpo.set("arquivo", arquivo);
        const resposta = await fetch("/api/comprovantes", { method: "POST", body: corpo });
        const dados = (await resposta.json().catch(() => ({}))) as { arquivo?: Anexado; erro?: string };
        if (!resposta.ok || !dados.arquivo) throw new Error(dados.erro ?? "Não foi possível enviar o arquivo.");
        setAnexados((atual) => [...atual, dados.arquivo!]);
        setEnviando((atual) => atual.filter((item) => item.chave !== chave));
      } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : "Não foi possível enviar o arquivo.";
        setEnviando((atual) => atual.map((item) => (item.chave === chave ? { ...item, erro: mensagem } : item)));
      }
    }
    if (camera.current) camera.current.value = "";
    if (galeria.current) galeria.current.value = "";
  }

  async function remover(id: string) {
    const resposta = await fetch(`/api/comprovantes/${id}`, { method: "DELETE" });
    if (resposta.ok) setAnexados((atual) => atual.filter((arquivo) => arquivo.id !== id));
  }

  return (
    <section aria-label="Enviar comprovante" className="grid gap-4">
      {motivoDevolucao && (
        <p role="status" className="rounded-controle bg-azul-cl px-3 py-2 text-[13.5px] text-azul-esc">
          <strong className="font-semibold">Devolvido para correção:</strong> {motivoDevolucao}
        </p>
      )}

      {instrucoes.length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-cinza">O que enviar</h3>
          <ul className="mt-2 grid gap-1.5 text-[14px] text-ink">
            {instrucoes.map((linha) => (
              <li key={linha} className="flex items-start gap-2">
                <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-verde" />
                {linha}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="flex items-start gap-2 rounded-controle bg-papel px-3 py-2 text-[13px] text-cinza">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" className="mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v5h1" /></svg>
        <span>Evite fotografar pessoas, placas de veículos e documentos pessoais. Se aparecerem, refaça a foto com outro enquadramento.</span>
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className={`${botaoSecundario} cursor-pointer`}>
          <input ref={camera} type="file" accept="image/*" capture="environment" multiple className="sr-only" onChange={(evento) => void subir(evento.target.files)} />
          Tirar foto
        </label>
        <label className={`${botaoSecundario} cursor-pointer`}>
          <input ref={galeria} type="file" accept={ACCEPT_COMPROVANTE} multiple className="sr-only" onChange={(evento) => void subir(evento.target.files)} />
          Galeria ou arquivo
        </label>
      </div>

      <p aria-live="polite" className="text-[13.5px] font-medium tabular-nums text-ink">
        {anexados.length} de {quantidade} {quantidade === 1 ? "arquivo exigido" : "arquivos exigidos"}
        {completo && <span className="ml-2 text-verde-esc">· quantidade atingida</span>}
      </p>

      {(anexados.length > 0 || enviando.length > 0) && (
        <ul className="grid gap-2">
          {anexados.map((arquivo) => (
            <li key={arquivo.id} className="flex items-center gap-3 rounded-controle border border-linha px-3 py-2 text-[13.5px]">
              <span className="min-w-0 flex-1 truncate">{arquivo.nomeOriginal}</span>
              <span className="shrink-0 tabular-nums text-faint">{tamanho(arquivo.tamanhoBytes)}</span>
              <button type="button" onClick={() => void remover(arquivo.id)} className="min-h-11 shrink-0 px-2 text-[13px] font-semibold text-critico md:min-h-8" aria-label={`Remover ${arquivo.nomeOriginal}`}>Remover</button>
            </li>
          ))}
          {enviando.map((item) => (
            <li key={item.chave} className={`flex items-center gap-3 rounded-controle border px-3 py-2 text-[13.5px] ${item.erro ? "border-critico/30 bg-critico-cl text-critico" : "border-linha text-cinza"}`}>
              <span className="min-w-0 flex-1 truncate">{item.nome}</span>
              <span className="shrink-0">{item.erro ?? "Enviando..."}</span>
              {item.erro && <button type="button" onClick={() => setEnviando((atual) => atual.filter((outro) => outro.chave !== item.chave))} className="shrink-0 text-[13px] font-semibold underline">Fechar</button>}
            </li>
          ))}
        </ul>
      )}

      <form action={acaoEnviar} className="grid gap-3">
        <label className="grid gap-1.5 text-[13px] font-medium text-ink">
          Observação (opcional)
          <textarea name="observacao" rows={3} maxLength={2000} placeholder="Ex.: a caldeira estava em manutenção preventiva no dia." className={inputClass} />
        </label>
        <BotaoEnviar habilitado={completo && !ocupado} />
      </form>
    </section>
  );
}
