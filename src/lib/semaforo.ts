import { comContextoDeUsuario, type ContextoUsuario } from "@/lib/prisma-app";

export type LimitesSemaforo = { diasVermelhoAte: number; diasAmareloAte: number };
export const LIMITES_SEMAFORO_PADRAO: LimitesSemaforo = { diasVermelhoAte: 5, diasAmareloAte: 10 };

export async function buscarLimitesSemaforo(ctx: ContextoUsuario): Promise<LimitesSemaforo> {
  return comContextoDeUsuario(ctx, async (tx) => {
    const configuracao = await tx.configuracaoSemaforo.findUnique({ where: { id: 1 } });
    return configuracao ?? LIMITES_SEMAFORO_PADRAO;
  });
}

export async function atualizarLimitesSemaforo(ctx: ContextoUsuario, limites: LimitesSemaforo) {
  if (ctx.perfil !== "ADMIN") throw new Error("Ação restrita ao Administrador.");
  const { diasVermelhoAte, diasAmareloAte } = limites;
  if (!Number.isInteger(diasVermelhoAte) || !Number.isInteger(diasAmareloAte)
    || diasVermelhoAte < 0 || diasVermelhoAte > 365 || diasAmareloAte < 0 || diasAmareloAte > 365 || diasVermelhoAte >= diasAmareloAte) {
    throw new Error("Informe limites inteiros entre 0 e 365, com o limite vermelho menor que o amarelo.");
  }
  return comContextoDeUsuario(ctx, (tx) => tx.configuracaoSemaforo.update({
    where: { id: 1 }, data: { diasVermelhoAte, diasAmareloAte },
  }));
}
