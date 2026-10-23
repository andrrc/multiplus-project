import type { Perfil } from "@prisma/client";

const ROTAS_POR_PERFIL = {
  colaborador: [
    ["/projetos", "/meus-projetos"],
    ["/tarefas", "/minhas-tarefas"],
    ["/notificacoes", "/minhas-notificacoes"],
  ],
} as const;

/** Converte links internos para a rota equivalente que o destinatário pode acessar. */
export function rotaDoRegistroParaPerfil(url: string | null | undefined, perfil: Perfil): string | null {
  if (!url) return null;
  if (perfil === "CLIENTE") return url;

  const absoluta = /^[a-z][a-z\d+.-]*:/i.test(url);
  let parsed: URL;
  try {
    parsed = new URL(url, "https://multiplus.invalid");
  } catch {
    return url;
  }

  const pares = ROTAS_POR_PERFIL.colaborador;
  const mapa = perfil === "ADMIN"
    ? pares.map(([origem, destino]) => [destino, origem] as const)
    : pares;
  const par = mapa.find(([origem]) => parsed.pathname === origem || parsed.pathname.startsWith(`${origem}/`));
  if (par) {
    parsed.pathname = `${par[1]}${parsed.pathname.slice(par[0].length)}`;
    if (perfil !== "ADMIN" && par[0] === "/tarefas" && parsed.searchParams.has("subtarefa")) {
      parsed.search = "";
      parsed.hash = "";
    }
  }

  const caminho = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  return absoluta ? `${parsed.origin}${caminho}` : caminho;
}
