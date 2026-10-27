"use client";
/**
 * Componente de interface `navegacao painel`. Recebe dados e callbacks de seu chamador, mantém apenas o estado necessário à interação e delega validações e persistência ao servidor.
 */

import type { Perfil } from "@prisma/client";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { menuDoPerfil, type ItemMenu } from "@/lib/navegacao";
import { NavLink } from "./nav-link";

const ROTAS_DE_PROJETOS_E_TAREFAS = ["/projetos", "/tarefas", "/subtarefas", "/agenda"];

function pertenceAoGrupo(pathname: string) {
  return ROTAS_DE_PROJETOS_E_TAREFAS.some(
    (href) => pathname === href || pathname.startsWith(`${href}/`),
  );
}

function GrupoProjetosETarefas({
  itens,
  grupoAtivo,
}: {
  itens: ItemMenu[];
  grupoAtivo: boolean;
}) {
  const [aberto, setAberto] = useState(grupoAtivo);

  return (
    <div className="mt-0.5">
      <button
        type="button"
        onClick={() => setAberto((valor) => !valor)}
        aria-expanded={aberto}
        aria-controls="menu-projetos-e-tarefas"
        className={`flex w-full items-center justify-between border-l-[3px] py-2.5 pr-4 pl-[13px] text-left font-[family-name:var(--font-interface)] text-[14px] font-medium transition-colors ${
          grupoAtivo
            ? "border-verde bg-menu-ativo text-branco"
            : "border-transparent text-menu-inativo hover:bg-menu-hover hover:text-branco"
        }`}
      >
        <span>Projetos e tarefas</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className={`h-4 w-4 shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="m3 6 5 5 5-5" />
        </svg>
      </button>

      {aberto ? (
        <div id="menu-projetos-e-tarefas" className="mt-0.5 border-l border-[color:var(--tinta2)]">
          {itens.map((item) => (
            <NavLink key={item.href} href={item.href} nivel="filho">
              {item.rotulo}
            </NavLink>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** A organização visual não altera o MENU, que também é a fonte das permissões de rota. */
export function NavegacaoPainel({ perfil, naoLidas = 0 }: { perfil: Perfil; naoLidas?: number }) {
  const itens = menuDoPerfil(perfil);
  const pathname = usePathname();

  if (perfil !== "ADMIN") {
    return itens.map((item) => (
      <NavLink key={item.href} href={item.href}>
        {item.href === "/minhas-notificacoes" ? (
          <span className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2.5">
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15.5 7.5a5.5 5.5 0 0 0-11 0c0 6-2 6-2 7.5h15c0-1.5-2-1.5-2-7.5ZM8 17h4" />
              </svg>
              <span>{item.rotulo}</span>
            </span>
            {naoLidas > 0 && (
              <span aria-label={`${naoLidas} não lida${naoLidas === 1 ? "" : "s"}`} className="inline-flex min-w-6 items-center justify-center rounded-full bg-verde px-1.5 py-0.5 font-[family-name:var(--font-interface)] text-[11px] font-semibold leading-none text-tinta tabular-nums">
                {naoLidas > 99 ? "99+" : naoLidas}
              </span>
            )}
          </span>
        ) : item.rotulo}
      </NavLink>
    ));
  }

  const porHref = new Map(itens.map((item) => [item.href, item]));
  const grupo = ROTAS_DE_PROJETOS_E_TAREFAS.flatMap((href) => {
    const item = porHref.get(href);
    return item ? [item] : [];
  });
  const diretos = ["/clientes", "/usuarios", "/etiquetas", "/notificacoes", "/meu-perfil"].flatMap((href) => {
    const item = porHref.get(href);
    return item ? [item] : [];
  });

  return (
    <>
      {diretos.slice(0, 1).map((item) => (
        <NavLink key={item.href} href={item.href}>
          {item.rotulo}
        </NavLink>
      ))}
      <GrupoProjetosETarefas
        key={pathname}
        itens={grupo}
        grupoAtivo={pertenceAoGrupo(pathname)}
      />
      {diretos.slice(1).map((item) => (
        <NavLink key={item.href} href={item.href}>
          {item.rotulo}
        </NavLink>
      ))}
    </>
  );
}
