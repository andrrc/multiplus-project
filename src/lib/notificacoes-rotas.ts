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
  // Links ausentes permanecem ausentes; não há destino padrão a inventar.
  if (!url) return null;
  // Cliente já recebe links do portal produzidos pelo próprio fluxo.
  if (perfil === "CLIENTE") return url;

  // Distingue caminhos locais de URLs completas para preservar a origem nos links absolutos.
  const absoluta = /^[a-z][a-z\d+.-]*:/i.test(url);
  let parsed: URL;
  try {
    parsed = new URL(url, "https://multiplus.invalid");
  } catch {
    // Se não for possível interpretar, devolve o conteúdo original sem reconstruí-lo.
    return url;
  }

  // Administradores navegam das rotas pessoais do colaborador para as rotas gerenciais;
  // colaboradores fazem a conversão inversa para suas telas com escopo próprio.
  const pares = ROTAS_POR_PERFIL.colaborador;
  const mapa = perfil === "ADMIN"
    ? pares.map(([origem, destino]) => [destino, origem] as const)
    : pares;
  const par = mapa.find(([origem]) => parsed.pathname === origem || parsed.pathname.startsWith(`${origem}/`));
  if (par) {
    // Mantém o restante do caminho ao trocar apenas o prefixo da rota.
    parsed.pathname = `${par[1]}${parsed.pathname.slice(par[0].length)}`;
    // Um colaborador não pode abrir uma solicitação de conclusão que só a ADMIN administra.
    if (perfil !== "ADMIN" && par[0] === "/tarefas" && parsed.searchParams.has("subtarefa")) {
      parsed.search = "";
      parsed.hash = "";
    }
  }

  // Reconstrói o link sem acrescentar domínio a caminhos relativos.
  const caminho = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  return absoluta ? `${parsed.origin}${caminho}` : caminho;
}
