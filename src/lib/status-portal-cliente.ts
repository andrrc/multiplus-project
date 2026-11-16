/**
 * Situação do acesso do cliente ao portal, mostrada na lista de Clientes (coluna "Portal do cliente"). É derivada dos
 * usuários do perfil CLIENTE ligados ao cadastro, com a mesma regra do status de acesso de Usuários: "pendente" é o
 * convite sem senha definida, e usuário desativado não conta como acesso.
 */
export type StatusPortalCliente = "ATIVO" | "PENDENTE" | "SEM_ACESSO";

export const ROTULO_STATUS_PORTAL: Record<StatusPortalCliente, string> = {
  ATIVO: "Ativo",
  PENDENTE: "Convite pendente",
  SEM_ACESSO: "Sem acesso",
};

export function statusPortalDoCliente(usuarios: ReadonlyArray<{ ativo: boolean; senhaHash: string | null }>): StatusPortalCliente {
  const ativos = usuarios.filter((usuario) => usuario.ativo);
  if (ativos.some((usuario) => usuario.senhaHash)) return "ATIVO";
  return ativos.length > 0 ? "PENDENTE" : "SEM_ACESSO";
}
