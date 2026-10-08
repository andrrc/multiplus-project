import { z } from "zod";
import type { Perfil } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verificarSenha } from "@/lib/senha";
import { limparChaveRateLimit, limiteAtingido, registrarFalha } from "@/lib/rate-limit";

const LIMITE_LOGIN_EMAIL = 5;
const LIMITE_LOGIN_IP = 20;
const JANELA_LOGIN_MS = 15 * 60 * 1000;

function ipConfiavel(request?: Request): string | null {
  // O Caddy sobrescreve X-Real-IP com o endereço do peer da conexão. Não usar
  // X-Forwarded-For: um cliente pode fornecer esse cabeçalho antes do proxy.
  const valor = request?.headers.get("x-real-ip")?.trim();
  return valor && valor.length <= 64 ? valor : null;
}

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
  request?: Request,
): Promise<UsuarioAutenticado | null> {
  const parsed = credenciaisSchema.safeParse(credenciais);
  const email = parsed.success ? parsed.data.email.trim().toLowerCase() : null;
  const ip = ipConfiavel(request);
  const chaveEmail = email ? `login:email:${email}` : null;
  const chaveIp = ip ? `login:ip:${ip}` : null;

  if (
    (chaveEmail && limiteAtingido(chaveEmail, LIMITE_LOGIN_EMAIL)) ||
    (chaveIp && limiteAtingido(chaveIp, LIMITE_LOGIN_IP))
  ) {
    return null;
  }

  if (!parsed.success) {
    if (chaveIp) registrarFalha(chaveIp, JANELA_LOGIN_MS);
    return null;
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email: parsed.data.email },
  });

  if (!usuario || !usuario.ativo || !usuario.senhaHash) {
    if (chaveEmail) registrarFalha(chaveEmail, JANELA_LOGIN_MS);
    if (chaveIp) registrarFalha(chaveIp, JANELA_LOGIN_MS);
    return null;
  }

  const senhaOk = await verificarSenha(parsed.data.senha, usuario.senhaHash);
  if (!senhaOk) {
    if (chaveEmail) registrarFalha(chaveEmail, JANELA_LOGIN_MS);
    if (chaveIp) registrarFalha(chaveIp, JANELA_LOGIN_MS);
    return null;
  }

  if (chaveEmail) limparChaveRateLimit(chaveEmail);
  if (chaveIp) limparChaveRateLimit(chaveIp);

  return {
    id: usuario.id,
    name: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
    clienteId: usuario.clienteId,
  };
}
