"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { Etiqueta } from "@/ui/campo";
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
    {aberto && <div role="menu" className={`absolute ${alinhar === "esquerda" ? "left-0" : "right-0"} z-10 mt-2 min-w-48 rounded-cartao border border-linha bg-branco p-2 shadow-lg`}>{opcoes.map(opcao => <form action={action} onSubmit={fechar} key={opcao.valor}><button role="menuitem" name="status" value={opcao.valor} className={`flex min-h-11 w-full items-center rounded-controle px-3 text-left text-[13px] hover:bg-verde-cl ${opcao.valor === status ? "font-semibold" : "font-normal"}`}>{opcao.label}</button></form>)}</div>}
  </div>;
}

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
  // Em tabelas e linhas compactas, o status é apresentado como etiqueta clicável.
  return <MenuStatus classeContainer="relative inline-block" classeGatilho="inline-flex" status={status} opcoes={opcoes} action={action} alinhar={alinhar} gatilho={<Etiqueta tom={status === "CONCLUIDO" ? "positivo" : status === "CANCELADO" ? "apagado" : undefined}>{label} ▾</Etiqueta>} />;
}

export function StatusCardInline({ status, label, opcoes, action }: { status: string; label: string; opcoes: Opcao[]; action: (formData: FormData) => Promise<void> }) {
  // O ponto e o rótulo comunicam o estado sem substituir o texto.
  const estilo: Record<string, string> = { A_INICIAR: "bg-papel text-tinta", EM_ANDAMENTO: "bg-azul/8 text-azul-esc", CONCLUIDO: "bg-verde-cl text-verde-esc", CANCELADO: "bg-critico/8 text-critico" };
  // Reaproveita o mesmo menu, mudando apenas a apresentação do controle que o aciona.
  return <MenuStatus status={status} opcoes={opcoes} action={action} classeGatilho={`inline-flex min-h-[68px] max-w-full items-center gap-3 rounded-controle border border-linha px-4 py-3 ${estilo[status] ?? estilo.A_INICIAR}`} gatilho={<><span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded-full ${status === "CONCLUIDO" ? "bg-verde-esc" : status === "CANCELADO" ? "bg-critico" : status === "EM_ANDAMENTO" ? "bg-azul-esc" : "bg-cinza"}`} /><span><span className="block font-[family-name:var(--font-interface)] text-[11px] font-medium leading-4 text-cinza">Status do projeto</span><span className="block font-[family-name:var(--font-interface)] text-[16px] font-semibold leading-5">{label} ▾</span></span></>} />;
}
