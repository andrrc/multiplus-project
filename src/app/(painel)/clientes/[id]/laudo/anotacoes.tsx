"use client";

import { useState, useTransition } from "react";
import { Campo, inputClass } from "@/ui/campo";
import { salvarAnotacaoLaudoAction, definirAnotacaoLaudoAtivaAction } from "./actions";

const botao = "min-h-11 rounded-[3px] border border-linha px-4 py-2 font-[family-name:var(--font-interface)] text-[14px] text-tinta disabled:opacity-60";

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
      <Campo label={anotacao ? "Editar anotação" : "Nova anotação"}><textarea rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} className={`${inputClass} font-[family-name:var(--font-leitura)]`} /></Campo>
      {links.map((link, indice) => <div key={indice} className="flex min-w-0 items-end gap-2"><div className="min-w-0 flex-1"><Campo label={`Link do Drive ${indice + 1}`}><input type="url" value={link} onChange={(e) => setLinks(links.map((valor, i) => i === indice ? e.target.value : valor))} placeholder="https://drive.google.com/…" className={inputClass} /></Campo></div><button type="button" className={botao} onClick={() => setLinks(links.filter((_, i) => i !== indice))} aria-label={`Remover link ${indice + 1}`}>Remover</button></div>)}
      <div className="flex flex-wrap gap-2"><button type="button" className={botao} onClick={() => setLinks([...links, ""])}>Adicionar link</button><button type="submit" className={`${botao} bg-verde font-semibold`}>{pendente ? "Salvando…" : "Salvar anotação"}</button>{onCancel && <button type="button" onClick={onCancel} className={botao}>Cancelar</button>}</div>
    </fieldset>
    {erro && <p role="alert" className="text-[14px] text-critico">{erro}</p>}
  </form>;
}

export function AcoesAnotacaoLaudo({ clienteId, laudoId, anotacao }: { clienteId: string; laudoId: string; anotacao: { id: string; versao: number; texto: string; links: { url: string }[]; ativo: boolean } }) {
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();
  if (editando) return <FormularioAnotacaoLaudo clienteId={clienteId} laudoId={laudoId} anotacao={anotacao} onCancel={() => setEditando(false)} />;
  return <div className="mt-3"><div className="flex flex-wrap gap-2">{anotacao.ativo && <button className={botao} disabled={pendente} onClick={() => setEditando(true)}>Editar anotação</button>}<button className={botao} disabled={pendente} onClick={() => { setErro(""); iniciar(async () => {
    try { const resultado = await definirAnotacaoLaudoAtivaAction(clienteId, laudoId, anotacao.id, anotacao.versao, !anotacao.ativo); if (resultado.erro) setErro(resultado.erro); }
    catch { setErro("Não foi possível alterar a anotação. Tente novamente."); }
  }); }}>{pendente ? "Salvando…" : anotacao.ativo ? "Desativar anotação" : "Reativar anotação"}</button></div>{erro && <p role="alert" className="text-critico">{erro}</p>}</div>;
}
