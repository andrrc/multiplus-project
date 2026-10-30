// Tipos do domínio usados nos campos adicionais do Auth.js.
import type { Perfil } from "@prisma/client";
import type { DefaultSession } from "next-auth";

// Estende a sessão e o usuário com os campos necessários à autorização e ao escopo do cliente.
declare module "next-auth" {
  interface Session {
    user: {
      // Id identifica a conta que as funções de domínio usam no contexto RLS.
      id: string;
      // Perfil é revalidado no banco antes de autorizar páginas e actions.
      perfil: Perfil;
      // Vínculo do portal limita CLIENTE ao próprio cadastro.
      clienteId: string | null;
      versaoSessao: number;
    } & DefaultSession["user"];
  }

  interface User {
    // Campos retornados pelo provider de credenciais no primeiro login.
    perfil: Perfil;
    clienteId: string | null;
    versaoSessao: number;
  }
}

// Replica os mesmos campos no token JWT que mantém a sessão entre requisições.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    perfil: Perfil;
    clienteId: string | null;
    versaoSessao: number;
  }
}
