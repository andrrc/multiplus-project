import { z } from "zod";
import type { Perfil } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verificarSenha } from "@/lib/senha";
import { finalizarLimites, reservarLimites } from "@/lib/rate-limit-banco";

const LIMITE_LOGIN_EMAIL = 5;
const LIMITE_LOGIN_IP = 20;

function ipConfiavel(request?: Request): string | null {
  // O Caddy sobrescreve X-Real-IP com o endereço do peer da conexão. Não usar
  // X-Forwarded-For: um cliente pode fornecer esse cabeçalho antes do proxy.
  const valor = request?.headers.get("x-real-ip")?.trim();
  return valor && valor.length <= 64 ? valor : null;
}

const credenciaisSchema = z.object({
  email: z.string().max(320).email(),
  senha: z.string().min(1).max(1024),
});

export type UsuarioAutenticado = {
  id: string;
  name: string;
  email: string;
  perfil: Perfil;
  clienteId: string | null;
  versaoSessao: number;
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
  // Sem endereço confiável, pedidos compartilham um limite restritivo de origem desconhecida.
  const ip = ipConfiavel(request);
  const chaveEmail = email ? `login:email:${email}` : null;
  const chaveIp = `login:ip:${ip ?? "desconhecido"}`;

  const limites = [
    ...(chaveEmail ? [{ chave: chaveEmail, limite: LIMITE_LOGIN_EMAIL }] : []),
    { chave: chaveIp, limite: LIMITE_LOGIN_IP },
  ];
  const reserva = await reservarLimites(limites, true);
  if (!reserva) return null;

  if (!parsed.success) {
    // Entrada malformada ainda conta para o endereço de origem, quando disponível.
    await finalizarLimites(reserva, false);
    return null;
  }

  // A autenticação acontece antes de existir sessão e usa a conexão de serviço.
  const usuario = await prisma.usuario.findUnique({
    where: { email: parsed.data.email },
  });

  if (!usuario || !usuario.ativo || !usuario.senhaHash) {
    // Mantém a mesma resposta para conta inexistente, inativa ou sem senha configurada.
    await finalizarLimites(reserva, false);
    return null;
  }

  const senhaOk = await verificarSenha(parsed.data.senha, usuario.senhaHash);
  if (!senhaOk) {
    // Falha de senha incrementa os dois limites para não revelar qual parte da conta falhou.
    await finalizarLimites(reserva, false);
    return null;
  }

  // O sucesso libera sua reserva sem apagar falhas registradas em paralelo.
  await finalizarLimites(reserva, true);

  return {
    id: usuario.id,
    name: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
    clienteId: usuario.clienteId,
    versaoSessao: usuario.versaoSessao,
  };
}
