import { redirect } from "next/navigation";
import { auth } from "./index";
import { prismaApp, type ContextoUsuario } from "@/lib/prisma-app";
import { perfilPodeAcessar, telaInicial } from "@/lib/navegacao";

/** Contexto do usuário logado, no formato que `comContextoDeUsuario` espera. */
export async function obterContexto(): Promise<ContextoUsuario> {
  const session = await auth();
  if (!session) throw new Error("Sessão não encontrada.");

  // O JWT identifica o usuário, mas ativo e perfil precisam refletir o banco no
  // request atual. A consulta usa a role da aplicação e o contexto antigo somente
  // para permitir a leitura da própria linha, conforme a policy usuarios_select.
  const usuario = await prismaApp.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.usuario_id', ${session.user.id}, true)`;
    await tx.$executeRaw`SELECT set_config('app.perfil', ${session.user.perfil}, true)`;
    return tx.usuario.findUnique({
      where: { id: session.user.id },
      select: { id: true, ativo: true, perfil: true },
    });
  });

  if (!usuario || !usuario.ativo) {
    redirect("/login?motivo=sessao-invalidada");
  }

  return { usuarioId: usuario.id, perfil: usuario.perfil };
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

/**
 * RF-043 — guarda de rota no servidor. O proxy já barra a navegação, mas ele roda antes do
 * render e é uma checagem otimista; esta é a que vale para a página em si, e roda mesmo em
 * requisições que não passam pelo proxy (RSC payload, navegação client-side).
 */
export async function exigirAcessoARota(pathname: string): Promise<ContextoUsuario> {
  const ctx = await obterContexto();
  if (!perfilPodeAcessar(ctx.perfil, pathname)) {
    redirect(telaInicial(ctx.perfil));
  }
  return ctx;
}
