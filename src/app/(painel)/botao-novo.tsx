"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useFecharAoClicarFora } from "@/ui/use-fechar-ao-clicar-fora";
import { IconeMais } from "./icones-shell";

/** Atalhos de criação que já existem como rota: cada item abre o formulário do cadastro. */
const ATALHOS = [
  { href: "/projetos/novo", rotulo: "Novo projeto" },
  { href: "/clientes/novo", rotulo: "Novo cliente" },
  { href: "/usuarios/novo", rotulo: "Novo usuário" },
];

/** Botão "Novo" da barra superior (Administradora), com o menu de atalhos de criação. */
export function BotaoNovo() {
  const [aberto, setAberto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const gatilho = useRef<HTMLButtonElement>(null);
  const fechar = () => setAberto(false);
  useFecharAoClicarFora(contenedor, aberto, fechar, gatilho);

  return (
    <div ref={contenedor} className="relative">
      <button
        ref={gatilho}
        type="button"
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={() => setAberto((atual) => !atual)}
        className="inline-flex h-11 items-center gap-2 rounded-controle bg-tinta px-4 font-[family-name:var(--font-interface)] text-sm font-semibold text-branco hover:bg-tinta2 md:h-10"
      >
        <IconeMais />
        <span className="max-lg:sr-only">Novo</span>
      </button>
      {aberto && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-cartao border border-linha bg-branco py-1 shadow-xl"
        >
          {ATALHOS.map((atalho) => (
            <Link
              key={atalho.href}
              href={atalho.href}
              role="menuitem"
              onClick={fechar}
              className="flex min-h-11 items-center px-4 font-[family-name:var(--font-interface)] text-sm text-ink hover:bg-papel md:min-h-10"
            >
              {atalho.rotulo}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
