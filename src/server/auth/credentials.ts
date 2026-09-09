import { z } from "zod";
import type { Perfil } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verificarSenha } from "@/lib/senha";

const credenciaisSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

export type UsuarioAutenticado = {
  id: string;
  name: string;
  email: string;
  perfil: Perfil;
  clienteId: string | null;
};

/**
 * Lógica de autenticação por credenciais (RF-014), separada do provider do
 * Auth.js só pra dar pra testar isoladamente (tests/smoke/autenticacao.smoke.test.ts)
 * sem precisar subir o Auth.js inteiro.
 */
export async function autenticarComCredenciais(
  credenciais: unknown,
): Promise<UsuarioAutenticado | null> {
  const parsed = credenciaisSchema.safeParse(credenciais);
  if (!parsed.success) return null;

  const usuario = await prisma.usuario.findUnique({
    where: { email: parsed.data.email },
  });

  if (!usuario || !usuario.ativo || !usuario.senhaHash) return null;

  const senhaOk = await verificarSenha(parsed.data.senha, usuario.senhaHash);
  if (!senhaOk) return null;

  return {
    id: usuario.id,
    name: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
    clienteId: usuario.clienteId,
  };
}
