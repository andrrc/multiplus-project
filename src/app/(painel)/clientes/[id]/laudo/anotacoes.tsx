"use client";

import { useCallback, useId, useRef, useState, useTransition } from "react";
import { IconPlus, IconX, IconDotsVertical, IconPencil, IconArchive, IconRestore } from "@tabler/icons-react";
import { useFecharAoClicarFora } from "@/ui/use-fechar-ao-clicar-fora";
import { Campo, inputClass } from "@/ui/campo";
import { salvarAnotacaoLaudoAction, definirAnotacaoLaudoAtivaAction } from "./actions";

const botao = "min-h-11 rounded-[3px] border border-linha px-4 py-2 font-[family-name:var(--font-interface)] text-[14px] text-tinta hover:bg-papel disabled:opacity-60";

export function FormularioAnotacaoLaudo({ clienteId, laudoId, anotacao, onCancel }: { clienteId: string; laudoId: string; anotacao?: { id: string; versao: number; texto: string; links: { url: string }[] }; onCancel?: () => void }) {
  const [texto, setTexto] = useState(anotacao?.texto ?? "");
  const [links, setLinks] = useState(anotacao?.links.map((l) => l.url) ?? [""]);
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();
  return <form className="flex min-w-0 flex-col gap-3" onSubmit={(e) => { e.preventDefault(); setErro(""); iniciar(async () => {
    try {
      const resultado = await salvarAnotacaoLaudoAction(clienteId, laudoId, { texto, links }, anotacao?.id, anotacao?.versao);
      if (resultado.erro) { setErro(resultado.erro); return; }
      if (onCancel) onCancel(); else { setTexto(""); setLinks([""]); }
    } catch { setErro("Não foi possível salvar. Seu conteúdo foi preservado. Tente novamente."); }
  }); }}>
    <fieldset disabled={pendente} className="flex min-w-0 flex-col gap-3">
      <Campo label="Anotação"><textarea rows={5} placeholder="Registre a análise, os encaminhamentos ou informações do laudo…" value={texto} onChange={(e) => setTexto(e.target.value)} className={`${inputClass} font-[family-name:var(--font-leitura)]`} /></Campo>
      {links.map((link, indice) => <div key={indice} className="flex min-w-0 items-end gap-2"><div className="min-w-0 flex-1"><Campo label={`Link do Drive ${indice + 1}`}><input type="url" value={link} onChange={(e) => setLinks(links.map((valor, i) => i === indice ? e.target.value : valor))} placeholder="https://drive.google.com/…" className={inputClass} /></Campo></div><button type="button" className={botao} onClick={() => setLinks(links.filter((_, i) => i !== indice))} aria-label={`Remover link ${indice + 1}`}><IconX size={18} aria-hidden="true" /></button></div>)}
      <div className="flex flex-wrap gap-2"><button type="button" className={botao} onClick={() => setLinks([...links, ""])}>Adicionar link</button><button type="submit" className={`${botao} bg-verde font-semibold hover:bg-verde-cl`}>{pendente ? "Salvando…" : "Salvar anotação"}</button>{onCancel && <button type="button" onClick={onCancel} className={botao}>Cancelar</button>}</div>
    </fieldset>
    {erro && <p role="alert" className="text-[14px] text-critico">{erro}</p>}
  </form>;
}

type NotaEditavel = { id: string; versao: number; texto: string; links: { url: string }[]; ativo: boolean };

function DialogoAnotacao({ clienteId, laudoId, anotacao, onClose, dialogRef }: { clienteId: string; laudoId: string; anotacao?: NotaEditavel; onClose: () => void; dialogRef: React.RefObject<HTMLDialogElement | null> }) {
  const tituloId = useId();
  return <dialog ref={dialogRef} onClose={onClose} aria-labelledby={tituloId} className="fixed inset-0 m-auto max-h-[calc(100dvh-32px)] w-[calc(100%_-_32px)] max-w-[640px] overflow-y-auto rounded-[3px] border border-linha bg-branco p-5 text-tinta shadow-lg backdrop:bg-tinta/50 sm:p-7">
    <div className="mb-5 flex items-center justify-between gap-3"><h2 id={tituloId} className="font-[family-name:var(--font-interface)] text-[22px] font-semibold">{anotacao ? "Editar anotação" : "Nova anotação"}</h2><button type="button" aria-label="Fechar anotação" className="flex min-h-11 min-w-11 items-center justify-center rounded-[3px] hover:bg-papel" onClick={() => dialogRef.current?.close()}><IconX size={21} aria-hidden="true" /></button></div>
    <p className="mb-5 text-[14px] text-cinza">Adicione um texto, links de documentos ou ambos.</p>
    <FormularioAnotacaoLaudo clienteId={clienteId} laudoId={laudoId} anotacao={anotacao} onCancel={() => dialogRef.current?.close()} />
  </dialog>;
}

export function NovaAnotacaoLaudo({ clienteId, laudoId }: { clienteId: string; laudoId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [sessao, setSessao] = useState(0);
  return <><button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[3px] bg-verde px-4 text-[14px] font-semibold text-tinta hover:bg-verde-cl" onClick={() => dialogRef.current?.showModal()}><IconPlus size={19} aria-hidden="true" />Nova anotação</button><DialogoAnotacao key={sessao} dialogRef={dialogRef} clienteId={clienteId} laudoId={laudoId} onClose={() => setSessao((valor) => valor + 1)} /></>;
}

export function AcoesAnotacaoLaudo({ clienteId, laudoId, anotacao }: { clienteId: string; laudoId: string; anotacao: NotaEditavel }) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();
  const [sessao, setSessao] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fechar = useCallback(() => setAberto(false), []);
  useFecharAoClicarFora(containerRef, aberto, fechar, botaoRef);
  return <div ref={containerRef} className="relative">
    <button ref={botaoRef} type="button" aria-label="Ações da anotação" aria-expanded={aberto} disabled={pendente} className="flex min-h-11 min-w-11 items-center justify-center rounded-[3px] text-cinza hover:bg-papel" onClick={() => setAberto(!aberto)}><IconDotsVertical size={20} aria-hidden="true" /></button>
    {aberto && <div className="absolute top-11 right-0 z-10 w-52 rounded-[3px] border border-linha bg-branco p-1 shadow-lg">
      {anotacao.ativo && <button type="button" className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-[14px] hover:bg-papel" onClick={() => { fechar(); dialogRef.current?.showModal(); }}><IconPencil size={17} aria-hidden="true" />Editar anotação</button>}
      <button type="button" disabled={pendente} className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-[14px] hover:bg-papel" onClick={() => { fechar(); setErro(""); iniciar(async () => {
        try { const resultado = await definirAnotacaoLaudoAtivaAction(clienteId, laudoId, anotacao.id, anotacao.versao, !anotacao.ativo); if (resultado.erro) setErro(resultado.erro); }
        catch { setErro("Não foi possível alterar a anotação. Tente novamente."); }
      }); }}>{anotacao.ativo ? <IconArchive size={17} aria-hidden="true" /> : <IconRestore size={17} aria-hidden="true" />}{anotacao.ativo ? "Desativar anotação" : "Reativar anotação"}</button>
    </div>}
    {erro && <p role="alert" className="absolute right-0 z-10 w-60 border border-linha bg-branco p-3 text-[13px] text-critico">{erro}</p>}
    <DialogoAnotacao key={sessao} dialogRef={dialogRef} clienteId={clienteId} laudoId={laudoId} anotacao={anotacao} onClose={() => { setSessao((valor) => valor + 1); botaoRef.current?.focus(); }} />
  </div>;
}
