import type { Perfil } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      perfil: Perfil;
      clienteId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    perfil: Perfil;
    clienteId: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    perfil: Perfil;
    clienteId: string | null;
  }
}
