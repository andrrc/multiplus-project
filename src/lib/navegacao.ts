import type { Perfil } from "@prisma/client";

/**
 * RF-043 — navegação e tela inicial por perfil, numa fonte só.
 *
 * O menu e a guarda de rota saem daqui juntos de propósito: se fossem listas separadas,
 * um item de menu poderia continuar apontando para uma rota que o perfil já não acessa, ou
 * o contrário — a rota ficar aberta por descuido porque ninguém tira o item do menu.
 */
export type ItemMenu = {
  href: string;
  rotulo: string;
  perfis: Perfil[];
};

/**
 * Sprint 3: só existem Clientes, Usuários e Meu Perfil. Prazos, Agenda, Projetos e
 * Notificações (previstos no RF-043 para o Administrador) entram nesta lista conforme a
 * Sprint 4 construir cada tela — um item de menu que leva a uma rota inexistente é pior
 * que a ausência dele.
 */
export const MENU: ItemMenu[] = [
  { href: "/clientes", rotulo: "Clientes", perfis: ["ADMIN"] },
  { href: "/usuarios", rotulo: "Usuários", perfis: ["ADMIN"] },
  { href: "/projetos", rotulo: "Projetos", perfis: ["ADMIN"] },
  { href: "/prazos", rotulo: "Prazos", perfis: ["ADMIN"] },
  { href: "/agenda", rotulo: "Agenda", perfis: ["ADMIN"] },
  { href: "/notificacoes", rotulo: "Notificações", perfis: ["ADMIN"] },
  { href: "/tarefas", rotulo: "Tarefas", perfis: ["ADMIN"] },
  { href: "/meus-clientes", rotulo: "Clientes", perfis: ["ADMIN_INTERNO", "ADMIN_EXTERNO"] },
  { href: "/meus-projetos", rotulo: "Meus Projetos", perfis: ["ADMIN_INTERNO", "ADMIN_EXTERNO"] },
  { href: "/minhas-tarefas", rotulo: "Minhas Tarefas", perfis: ["ADMIN_INTERNO", "ADMIN_EXTERNO"] },
  {
    href: "/meu-perfil",
    rotulo: "Meu Perfil",
    perfis: ["ADMIN", "ADMIN_INTERNO", "ADMIN_EXTERNO", "CLIENTE"],
  },
];

export function menuDoPerfil(perfil: Perfil): ItemMenu[] {
  // RF-043 — item que o perfil não acessa não aparece; não fica desabilitado.
  return MENU.filter((item) => item.perfis.includes(perfil));
}

/**
 * RF-043 — para onde cada perfil vai depois do login.
 *
 * O Administrador deveria cair no Painel de Prazos (Tela 12), que só nasce na Sprint 4.
 * Até lá vai para Clientes, o único módulo com dado real — o destino definitivo troca
 * nesta função, num lugar só, quando a tela existir.
 *
 * O Cliente final vai para Meu Perfil porque a Área Exclusiva é da Sprint 6; sem isso ele
 * logaria numa rota que ainda não existe.
 */
export const TELA_INICIAL: Record<Perfil, string> = {
  ADMIN: "/prazos",
  ADMIN_INTERNO: "/minhas-tarefas",
  ADMIN_EXTERNO: "/minhas-tarefas",
  CLIENTE: "/meu-perfil",
};

export function telaInicial(perfil: Perfil): string {
  return TELA_INICIAL[perfil];
}

/**
 * RF-043 — "acesso direto por URL a rota fora do perfil é negado".
 *
 * Derivado do MENU, mais as sub-rotas que não têm item próprio (o formulário de cliente
 * vive sob /clientes, por exemplo). A raiz fica de fora: ela só redireciona para a tela
 * inicial do perfil, e portanto é acessível a todos.
 */
/**
 * Cópia do `config.matcher` de `src/proxy.ts` — quais caminhos passam pela guarda.
 *
 * `.*\..*` exclui qualquer caminho com extensão, ou seja, os arquivos servidos de
 * `public/`. Essa exclusão é a contrapartida de `perfilPodeAcessar` negar rota não
 * declarada: sem ela, a logo e o favicon caem na guarda, não correspondem a item nenhum do
 * MENU e são redirecionados junto com as páginas.
 *
 * É mesmo uma cópia, e não o contrário: o Next extrai `config.matcher` em tempo de build,
 * sem executar os imports do módulo, então lá o valor **precisa** ser um literal — importar
 * esta constante no proxy causa `ReferenceError` em toda requisição. O teste unitário
 * compara as duas e falha se divergirem.
 */
export const PADRAO_ROTAS_DO_PROXY = "/((?!api|_next/static|_next/image|.*\\..*).*)";

/** Responde se o proxy chega a avaliar este caminho — usado pelos testes. */
export function proxyAvaliaCaminho(pathname: string): boolean {
  return new RegExp(`^${PADRAO_ROTAS_DO_PROXY}$`).test(pathname);
}

export function perfilPodeAcessar(perfil: Perfil, pathname: string): boolean {
  if (pathname === "/") return true;

  const item = MENU.find(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );

  // Rota que não corresponde a nenhum item de menu não é liberada por omissão — quem
  // adiciona uma área nova precisa declará-la aqui, e enquanto não declara ela responde
  // negado em vez de ficar aberta sem ninguém perceber.
  if (!item) return false;

  return item.perfis.includes(perfil);
}
