import { auth } from "./index";
import type { ContextoUsuario } from "@/lib/prisma-app";

/** Contexto do usuário logado, no formato que `comContextoDeUsuario` espera. */
export async function obterContexto(): Promise<ContextoUsuario> {
  const session = await auth();
  if (!session) throw new Error("Sessão não encontrada.");
  return { usuarioId: session.user.id, perfil: session.user.perfil };
}

/**
 * Para ações que usam a role dona das tabelas (bypassa RLS) — ex. criar/bloquear
 * acesso do cliente (src/lib/clientes.ts). Nessas, o RLS não protege por role
 * compartilhada; a checagem de perfil precisa acontecer aqui, na Server Action.
 */
export async function exigirAdmin(): Promise<ContextoUsuario> {
  const ctx = await obterContexto();
  if (ctx.perfil !== "ADMIN") throw new Error("Ação restrita ao Administrador.");
  return ctx;
}
