"use client";

import type { Perfil } from "@prisma/client";
import { menuDoPerfil, type ItemMenu } from "@/lib/navegacao";
import { IconeRota } from "./icones-shell";
import { NavLink } from "./nav-link";

// A organização é visual: a lista de rotas e permissões continua em menuDoPerfil.
const gruposAdmin = [
  { titulo: "Dia a dia", rotas: ["/painel", "/agenda", "/notificacoes"] },
  { titulo: "Trabalho", rotas: ["/projetos", "/tarefas", "/subtarefas"] },
  { titulo: "Cadastros", rotas: ["/clientes", "/usuarios"] },
  { titulo: "Configurações", rotas: ["/etiquetas", "/configuracoes"] },
];
const gruposEquipe = [
  { titulo: "Dia a dia", rotas: ["/painel", "/minha-agenda", "/minhas-tarefas", "/minhas-notificacoes"] },
  { titulo: "Trabalho", rotas: ["/meus-projetos", "/meus-clientes"] },
];

/** "Meu perfil" fica no rodapé do menu (ícone ao lado do nome), não na lista de itens. */
const ROTAS_FORA_DA_LISTA = new Set(["/meu-perfil", "/busca"]);

function Item({ item, naoLidas }: { item: ItemMenu; naoLidas: number }) {
  const avisos = item.href === "/notificacoes" || item.href === "/minhas-notificacoes";
  return (
    <NavLink href={item.href}>
      <IconeRota href={item.href} />
      <span>
        {avisos ? "Avisos" : item.rotulo}
        {avisos && <span className="sr-only"> (Notificações)</span>}
      </span>
      {avisos && naoLidas > 0 && (
        <span
          aria-label={`${naoLidas} não lida${naoLidas === 1 ? "" : "s"}`}
          className="ml-auto min-w-[22px] rounded-full bg-branco/15 px-[7px] py-px text-center text-xs font-semibold tabular-nums text-branco"
        >
          {naoLidas > 99 ? "99+" : naoLidas}
        </span>
      )}
    </NavLink>
  );
}

export function NavegacaoPainel({ perfil, naoLidas = 0 }: { perfil: Perfil; naoLidas?: number }) {
  const itens = menuDoPerfil(perfil).filter((item) => !ROTAS_FORA_DA_LISTA.has(item.href));
  const grupos = perfil === "ADMIN" ? gruposAdmin : perfil === "CLIENTE" ? [{ titulo: "Acompanhamento", rotas: ["/portal"] }] : gruposEquipe;
  const porHref = new Map(itens.map((item) => [item.href, item]));
  const soltos = itens.filter((item) => !grupos.some((grupo) => grupo.rotas.includes(item.href)));

  return (
    <>
      {grupos.map((grupo) => {
        const encontrados = grupo.rotas.flatMap((href) => {
          const item = porHref.get(href);
          return item ? [item] : [];
        });
        if (!encontrados.length) return null;
        return (
          <div key={grupo.titulo} className="mt-[18px] first:mt-1">
            <p className="px-3 pb-1.5 font-[family-name:var(--font-interface)] text-[11px] font-semibold uppercase tracking-[0.08em] text-menu-grupo">
              {grupo.titulo}
            </p>
            <div className="flex flex-col gap-0.5">
              {encontrados.map((item) => <Item key={item.href} item={item} naoLidas={naoLidas} />)}
            </div>
          </div>
        );
      })}
      {soltos.map((item) => <Item key={item.href} item={item} naoLidas={naoLidas} />)}
    </>
  );
}
