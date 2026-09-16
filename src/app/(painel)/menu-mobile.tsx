"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

export function MenuMobile({ navegacao, usuario }: { navegacao: ReactNode; usuario: ReactNode }) {
  const [aberto, setAberto] = useState(false);

  // Fecha ao navegar, ajustando o estado durante o render — mesmo padrão de
  // `useFecharAoSucesso` em clientes/[id]/acoes-cliente.tsx.
  const caminho = usePathname();
  const [ultimoCaminho, setUltimoCaminho] = useState(caminho);
  if (caminho !== ultimoCaminho) {
    setUltimoCaminho(caminho);
    setAberto(false);
  }

  return (
    <div className="relative bg-tinta lg:hidden">
      <div
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: "linear-gradient(112deg, #0499f3 0%, #1ebd1f 130%)" }}
      />

      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-multiplus.png" alt="Múltiplus" width={149} height={41} />
        <button
          type="button"
          onClick={() => setAberto((atual) => !atual)}
          aria-expanded={aberto}
          aria-controls="menu-painel"
          className="-mr-2.5 flex h-11 w-11 items-center justify-center text-menu-inativo hover:text-branco"
        >
          <span className="sr-only">{aberto ? "Fechar menu" : "Abrir menu"}</span>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            {aberto ? (
              <path d="M4 4l12 12M16 4L4 16" />
            ) : (
              <path d="M2 5h16M2 10h16M2 15h16" />
            )}
          </svg>
        </button>
      </div>

      <div id="menu-painel" hidden={!aberto}>
        <nav className="flex flex-col gap-0.5 px-2 pb-3">{navegacao}</nav>
        <div className="border-t border-[color:var(--tinta2)] px-5 py-5">{usuario}</div>
      </div>
    </div>
  );
}
