"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { IconeMenu } from "./icones-shell";

/**
 * Estrutura do painel: menu lateral fixo no desktop e em gaveta no celular, barra superior
 * de 64 px e área de conteúdo. O menu, o rodapé do usuário e as ações da barra chegam prontos
 * do layout (que é de servidor); aqui só vive o estado de abrir e fechar a gaveta.
 */
export function CascaPainel({
  navegacao,
  rodape,
  acoes,
  children,
}: {
  navegacao: ReactNode;
  rodape: ReactNode;
  /** Ações da barra superior no desktop. Sem ações, a barra só aparece no celular. */
  acoes?: ReactNode;
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);

  // Fecha a gaveta ao navegar, ajustando o estado durante o render — mesmo padrão de
  // `useFecharAoSucesso` em clientes/[id]/acoes-cliente.tsx.
  const caminho = usePathname();
  const [ultimoCaminho, setUltimoCaminho] = useState(caminho);
  if (caminho !== ultimoCaminho) {
    setUltimoCaminho(caminho);
    setAberto(false);
  }

  // Esc fecha a gaveta aberta.
  useEffect(() => {
    if (!aberto) return;
    const aoPressionar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAberto(false);
    };
    document.addEventListener("keydown", aoPressionar);
    return () => document.removeEventListener("keydown", aoPressionar);
  }, [aberto]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      {/* Fundo escurecido atrás da gaveta; só existe no celular. */}
      {aberto && <div aria-hidden="true" onClick={() => setAberto(false)} className="fixed inset-0 z-20 bg-tinta/40 lg:hidden" />}

      <aside
        id="menu-painel"
        aria-label="Menu principal"
        className={`fixed inset-y-0 left-0 z-30 flex w-[272px] flex-col bg-tinta transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-auto lg:translate-x-0 ${
          aberto ? "translate-x-0" : "-translate-x-full max-lg:invisible"
        }`}
      >
        <div className="px-6 pt-[26px] pb-[22px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-multiplus.png" alt="Múltiplus" width={172} height={47} />
        </div>
        <nav className="flex flex-1 flex-col overflow-y-auto px-3 pb-4">{navegacao}</nav>
        <div className="border-t border-branco/10 px-4 py-3.5">{rodape}</div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className={`sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-linha bg-branco px-4 sm:px-8 ${acoes ? "" : "lg:hidden"}`}>
          <button
            type="button"
            onClick={() => setAberto((atual) => !atual)}
            aria-expanded={aberto}
            aria-controls="menu-painel"
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-controle text-ink hover:bg-papel lg:hidden"
          >
            <span className="sr-only">Abrir menu</span>
            <IconeMenu />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-multiplus.png" alt="Múltiplus" width={125} height={34} className="lg:hidden" />
          <span className="flex-1" />
          {acoes}
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden bg-papel px-4 pt-5 pb-12 sm:px-8 lg:pt-8 lg:pb-16">
          <div className="max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
