"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { botaoSecundario } from "@/ui/botoes";
import { StatusPonto } from "@/ui/status-ponto";
import { useFecharAoClicarFora } from "@/ui/use-fechar-ao-clicar-fora";

type Opcao = { valor: string; label: string };

// Menu suspenso de status: fecha ao escolher uma opção, ao clicar fora ou ao apertar Esc.
function MenuStatus({
  gatilho,
  classeGatilho,
  status,
  opcoes,
  action,
  alinhar = "direita",
  classeContainer = "relative",
}: {
  gatilho: ReactNode;
  classeGatilho: string;
  status: string;
  opcoes: Opcao[];
  action: (formData: FormData) => Promise<void>;
  alinhar?: "direita" | "esquerda";
  classeContainer?: string;
}) {
  const [aberto, setAberto] = useState(false);
  // A referência identifica a área interna do menu para o hook distinguir toque dentro/fora.
  const containerRef = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  // A função estável evita reinstalar os listeners globais a cada renderização.
  const fechar = useCallback(() => setAberto(false), []);
  useFecharAoClicarFora(containerRef, aberto, fechar, botaoRef);

  // O menu só é montado quando aberto; cada opção envia o novo status pela action do servidor.
  return <div ref={containerRef} className={classeContainer}>
    <button ref={botaoRef} type="button" aria-haspopup="menu" aria-expanded={aberto} onClick={() => setAberto(atual => !atual)} className={`cursor-pointer text-left ${classeGatilho}`}>{gatilho}</button>
    {aberto && <div role="menu" className={`absolute ${alinhar === "esquerda" ? "left-0" : "right-0"} z-10 mt-2 min-w-52 rounded-cartao border border-linha bg-branco p-1.5 shadow-xl`}>{opcoes.map(opcao => <form action={action} onSubmit={fechar} key={opcao.valor}><button role="menuitem" name="status" value={opcao.valor} className={`flex min-h-11 w-full items-center rounded-controle px-3 text-left text-[13px] text-ink hover:bg-papel md:min-h-9 ${opcao.valor === status ? "font-semibold" : "font-normal"}`}><StatusPonto status={opcao.valor}>{opcao.label}</StatusPonto></button></form>)}</div>}
  </div>;
}

const SETA = <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" className="shrink-0 text-cinza" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>;

export function StatusInline({
  status,
  label,
  opcoes,
  action,
  alinhar,
}: {
  status: string;
  label: string;
  opcoes: Opcao[];
  action: (formData: FormData) => Promise<void>;
  alinhar?: "direita" | "esquerda";
}) {
  // Em linhas compactas, o status é um texto com ponto colorido que abre o menu ao clicar.
  return <MenuStatus classeContainer="relative inline-block" classeGatilho="inline-flex min-h-11 items-center gap-1.5 rounded-controle px-1.5 hover:bg-papel md:min-h-8" status={status} opcoes={opcoes} action={action} alinhar={alinhar} gatilho={<><StatusPonto status={status}>{label}</StatusPonto>{SETA}</>} />;
}

export function StatusCardInline({ status, label, opcoes, action }: { status: string; label: string; opcoes: Opcao[]; action: (formData: FormData) => Promise<void> }) {
  // No cabeçalho da página, o status é um botão secundário com o ponto colorido e uma seta.
  return <MenuStatus status={status} opcoes={opcoes} action={action} classeGatilho={botaoSecundario} gatilho={<><StatusPonto status={status}>{label}</StatusPonto>{SETA}</>} />;
}
