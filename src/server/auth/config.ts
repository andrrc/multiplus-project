import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { autenticarComCredenciais } from "./credentials";

/**
 * Auth.js com provider de credenciais (RF-014) + JWT — sem adapter de
 * banco: o Credentials provider do Auth.js não é compatível com sessão de
 * banco, então a "persistência" de sessão é o próprio JWT assinado, e o
 * fluxo de definir/recuperar senha (RF-030 a RF-032) é implementado à parte
 * em src/lib/tokens.ts, não pelo mecanismo de verification token do Auth.js.
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        senha: { label: "Senha", type: "password" },
      },
      authorize: autenticarComCredenciais,
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        // authorize() sempre retorna um id (vem de usuario.id, nunca vazio).
        token.id = user.id as string;
        token.perfil = user.perfil;
        token.clienteId = user.clienteId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.perfil = token.perfil;
      session.user.clienteId = token.clienteId;
      return session;
    },
  },
};
