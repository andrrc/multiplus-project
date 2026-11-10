"use client";

import type { Perfil } from "@prisma/client";
import { menuDoPerfil, type ItemMenu } from "@/lib/navegacao";
import { NavLink } from "./nav-link";

// A organização é visual: a lista de rotas e permissões continua em menuDoPerfil.
const gruposAdmin = [
  { titulo: "Dia a dia", rotas: ["/agenda", "/notificacoes"] },
  { titulo: "Trabalho", rotas: ["/projetos", "/tarefas", "/subtarefas"] },
  { titulo: "Cadastros", rotas: ["/clientes", "/usuarios"] },
  { titulo: "Configurações", rotas: ["/etiquetas"] },
];
const gruposEquipe = [
  { titulo: "Dia a dia", rotas: ["/minhas-tarefas", "/minhas-notificacoes"] },
  { titulo: "Trabalho", rotas: ["/meus-projetos", "/meus-clientes"] },
];

function Icone({ href }: { href: string }) {
  const caminhos: Record<string, string> = {
    "/agenda": "M4 4h16v16H4z M4 9h16 M8 2v4 M16 2v4",
    "/notificacoes": "M18 8a6 6 0 0 0-12 0c0 6-2 6-2 8h16c0-2-2-2-2-8M10 19h4",
    "/minhas-notificacoes": "M18 8a6 6 0 0 0-12 0c0 6-2 6-2 8h16c0-2-2-2-2-8M10 19h4",
    "/projetos": "M3 6h7l2 2h9v11H3z",
    "/meus-projetos": "M3 6h7l2 2h9v11H3z",
    "/tarefas": "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
    "/minhas-tarefas": "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
    "/subtarefas": "M4 5h16v14H4zM8 9h8M8 13h8M8 17h5",
    "/clientes": "M3 21h18M5 21V5l7-3 7 3v16M9 8h1M14 8h1M9 12h1M14 12h1M10 21v-5h4v5",
    "/meus-clientes": "M3 21h18M5 21V5l7-3 7 3v16M9 8h1M14 8h1M9 12h1M14 12h1M10 21v-5h4v5",
    "/usuarios": "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 4a4 4 0 0 1 0 7M20 21v-2a4 4 0 0 0-3-3.9",
    "/etiquetas": "M3 12V4h8l10 10-7 7zM7 8h.01",
    "/portal": "M3 11l9-8 9 8M5 10v10h14V10",
    "/meu-perfil": "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21a8 8 0 0 1 16 0",
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={caminhos[href] ?? caminhos["/portal"]} /></svg>;
}

function Item({ item, naoLidas }: { item: ItemMenu; naoLidas: number }) {
  const avisos = item.href === "/notificacoes" || item.href === "/minhas-notificacoes";
  return <NavLink href={item.href}><span className="flex items-center gap-3"><Icone href={item.href} /><span>{avisos ? "Avisos" : item.rotulo}{avisos && <span className="sr-only"> (Notificações)</span>}</span>{avisos && naoLidas > 0 && <span aria-label={`${naoLidas} não lida${naoLidas === 1 ? "" : "s"}`} className="ml-auto rounded-full bg-tinta2 px-2 text-[12px] font-semibold text-branco tabular-nums">{naoLidas > 99 ? "99+" : naoLidas}</span>}</span></NavLink>;
}

export function NavegacaoPainel({ perfil, naoLidas = 0 }: { perfil: Perfil; naoLidas?: number }) {
  const itens = menuDoPerfil(perfil);
  const grupos = perfil === "ADMIN" ? gruposAdmin : perfil === "CLIENTE" ? [{ titulo: "Acompanhamento", rotas: ["/portal"] }] : gruposEquipe;
  const porHref = new Map(itens.map((item) => [item.href, item]));
  return <>
    {grupos.map((grupo) => {
      const encontrados = grupo.rotas.flatMap((href) => { const item = porHref.get(href); return item ? [item] : []; });
      return encontrados.length ? <div key={grupo.titulo} className="mt-4 first:mt-1"><p className="px-3 pb-1.5 font-[family-name:var(--font-interface)] text-[11px] font-semibold uppercase tracking-[0.08em] text-menu-inativo">{grupo.titulo}</p>{encontrados.map((item) => <Item key={item.href} item={item} naoLidas={naoLidas} />)}</div> : null;
    })}
    {itens.filter((item) => !grupos.some((grupo) => grupo.rotas.includes(item.href))).map((item) => <Item key={item.href} item={item} naoLidas={naoLidas} />)}
  </>;
}
