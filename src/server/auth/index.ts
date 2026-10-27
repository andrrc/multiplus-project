/**
 * Infraestrutura de autenticação `src/server/auth/index.ts`. Separa a leitura da sessão, o perfil validado no banco e o contexto usado para aplicar as políticas de acesso.
 */
import NextAuth from "next-auth";
import { authConfig } from "./config";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
