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
  // Rejeita entrada fora do formato antes de consultar o banco.
  const parsed = credenciaisSchema.safeParse(credenciais);
  // Normaliza somente a chave de rate limit; a busca usa o e-mail validado recebido.
  const email = parsed.success ? parsed.data.email.trim().toLowerCase() : null;
  // A chave por IP só existe quando o proxy confiável forneceu um endereço utilizável.
  const ip = ipConfiavel(request);
  const chaveEmail = email ? `login:email:${email}` : null;
  const chaveIp = ip ? `login:ip:${ip}` : null;

  if (
    // Um limite por conta reduz enumeração de senha; o limite por IP reduz ataques distribuídos por conta.
    (chaveEmail && limiteAtingido(chaveEmail, LIMITE_LOGIN_EMAIL)) ||
    (chaveIp && limiteAtingido(chaveIp, LIMITE_LOGIN_IP))
  ) {
    return null;
  }

  if (!parsed.success) {
    // Entrada malformada ainda conta para o endereço de origem, quando disponível.
    if (chaveIp) registrarFalha(chaveIp, JANELA_LOGIN_MS);
    return null;
  }

  // A autenticação acontece antes de existir sessão e usa a conexão de serviço.
  const usuario = await prisma.usuario.findUnique({
    where: { email: parsed.data.email },
  });

  if (!usuario || !usuario.ativo || !usuario.senhaHash) {
    // Mantém a mesma resposta para conta inexistente, inativa ou sem senha configurada.
    if (chaveEmail) registrarFalha(chaveEmail, JANELA_LOGIN_MS);
    if (chaveIp) registrarFalha(chaveIp, JANELA_LOGIN_MS);
    return null;
  }

  const senhaOk = await verificarSenha(parsed.data.senha, usuario.senhaHash);
  if (!senhaOk) {
    // Falha de senha incrementa os dois limites para não revelar qual parte da conta falhou.
    if (chaveEmail) registrarFalha(chaveEmail, JANELA_LOGIN_MS);
    if (chaveIp) registrarFalha(chaveIp, JANELA_LOGIN_MS);
    return null;
  }

  // Um login válido reinicia os limites de conta e origem.
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
