"use client";

import type { Perfil } from "@prisma/client";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { menuDoPerfil, type ItemMenu } from "@/lib/navegacao";
import { NavLink } from "./nav-link";

const ROTAS_DE_PROJETOS_E_TAREFAS = ["/projetos", "/tarefas", "/prazos", "/agenda"];

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
              {item.rotulo === "Tarefas" ? "Todas as tarefas" : item.rotulo}
            </NavLink>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** A organização visual não altera o MENU, que também é a fonte das permissões de rota. */
export function NavegacaoPainel({ perfil }: { perfil: Perfil }) {
  const itens = menuDoPerfil(perfil);
  const pathname = usePathname();

  if (perfil !== "ADMIN") {
    return itens.map((item) => (
      <NavLink key={item.href} href={item.href}>
        {item.rotulo}
      </NavLink>
    ));
  }

  const porHref = new Map(itens.map((item) => [item.href, item]));
  const grupo = ROTAS_DE_PROJETOS_E_TAREFAS.flatMap((href) => {
    const item = porHref.get(href);
    return item ? [item] : [];
  });
  const diretos = ["/clientes", "/usuarios", "/notificacoes", "/meu-perfil"].flatMap((href) => {
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
