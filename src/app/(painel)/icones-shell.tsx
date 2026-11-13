import type { ReactNode } from "react";

/**
 * Ícones de traço do menu e da barra superior, iguais aos dos protótipos de `telas-novas/`.
 * Todos usam `currentColor`, então a cor vem do elemento que os contém.
 */
function Svg({ children, tamanho = 18 }: { children: ReactNode; tamanho?: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={tamanho}
      height={tamanho}
      className="shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const ICONES_ROTA: Record<string, ReactNode> = {
  "/painel": (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  "/agenda": (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  avisos: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),
  projetos: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />,
  tarefas: (
    <>
      <path d="m9 11 3 3 8-8" />
      <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
    </>
  ),
  "/subtarefas": (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </>
  ),
  clientes: (
    <>
      <path d="M3 21V8l6-4v17M9 21h12V10l-6-3" />
      <path d="M13 12h4M13 16h4" />
    </>
  ),
  "/usuarios": (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0" />
      <path d="M17 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3" />
    </>
  ),
  "/configuracoes": (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
  "/etiquetas": (
    <>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
      <circle cx="7.5" cy="7.5" r="1.2" />
    </>
  ),
  "/portal": <path d="M3 11l9-8 9 8M5 10v10h14V10" />,
};

/** Chave do ícone de cada rota do menu (rotas "meus-*" usam o mesmo desenho das de admin). */
function chaveDoIcone(href: string) {
  if (href === "/notificacoes" || href === "/minhas-notificacoes") return "avisos";
  if (href === "/agenda" || href === "/minha-agenda") return "/agenda";
  if (href === "/projetos" || href === "/meus-projetos") return "projetos";
  if (href === "/tarefas" || href === "/minhas-tarefas") return "tarefas";
  if (href === "/clientes" || href === "/meus-clientes") return "clientes";
  return href;
}

export function IconeRota({ href }: { href: string }) {
  return <Svg>{ICONES_ROTA[chaveDoIcone(href)] ?? ICONES_ROTA["/portal"]}</Svg>;
}

export function IconeMenu() {
  return <Svg tamanho={20}><path d="M4 6h16M4 12h16M4 18h16" /></Svg>;
}

export function IconePerfil() {
  return (
    <Svg>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </Svg>
  );
}

export function IconeSair() {
  return (
    <Svg>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </Svg>
  );
}

export function IconeMais() {
  return <Svg><path d="M12 5v14M5 12h14" /></Svg>;
}
