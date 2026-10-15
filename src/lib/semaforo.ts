import { comContextoDeUsuario, type ContextoUsuario } from "@/lib/prisma-app";

/** Vermelho só para prazo vencido; âmbar de "vence hoje" até `diasAmareloAte`; verde acima. */
export type LimitesSemaforo = { diasAmareloAte: number };
export const LIMITES_SEMAFORO_PADRAO: LimitesSemaforo = { diasAmareloAte: 5 };

export async function buscarLimitesSemaforo(ctx: ContextoUsuario): Promise<LimitesSemaforo> {
  return comContextoDeUsuario(ctx, async (tx) => {
    const configuracao = await tx.configuracaoSemaforo.findUnique({ where: { id: 1 } });
    return configuracao ? { diasAmareloAte: configuracao.diasAmareloAte } : LIMITES_SEMAFORO_PADRAO;
  });
}

export async function atualizarLimitesSemaforo(ctx: ContextoUsuario, limites: LimitesSemaforo) {
  if (ctx.perfil !== "ADMIN") throw new Error("Ação restrita ao Administrador.");
  const { diasAmareloAte } = limites;
  if (!Number.isInteger(diasAmareloAte) || diasAmareloAte < 0 || diasAmareloAte > 365) {
    throw new Error("Informe o limite amarelo como um número inteiro de dias entre 0 e 365.");
  }
  return comContextoDeUsuario(ctx, (tx) => tx.configuracaoSemaforo.update({
    where: { id: 1 }, data: { diasAmareloAte },
  }));
}
