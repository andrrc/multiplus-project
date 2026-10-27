import { comContextoDeUsuario, type ContextoUsuario } from "@/lib/prisma-app";

/** Vermelho só para prazo vencido; âmbar de "vence hoje" até `diasAmareloAte`; verde acima. */
export type LimitesSemaforo = { diasAmareloAte: number };
export const LIMITES_SEMAFORO_PADRAO: LimitesSemaforo = { diasAmareloAte: 5 };

export async function buscarLimitesSemaforo(ctx: ContextoUsuario): Promise<LimitesSemaforo> {
  // Mantém a consulta sob a role e o contexto RLS do usuário autenticado.
  return comContextoDeUsuario(ctx, async (tx) => {
    // A configuração global usa um único registro, identificado pelo id fixo 1.
    const configuracao = await tx.configuracaoSemaforo.findUnique({ where: { id: 1 } });
    // Instalações sem configuração usam o padrão definido pelo produto.
    return configuracao ? { diasAmareloAte: configuracao.diasAmareloAte } : LIMITES_SEMAFORO_PADRAO;
  });
}

export async function atualizarLimitesSemaforo(ctx: ContextoUsuario, limites: LimitesSemaforo) {
  // A configuração afeta todos os prazos e por isso só a Administradora pode alterá-la.
  if (ctx.perfil !== "ADMIN") throw new Error("Ação restrita ao Administrador.");
  const { diasAmareloAte } = limites;
  // Repete no servidor o intervalo permitido, mesmo que o formulário já valide o campo.
  if (!Number.isInteger(diasAmareloAte) || diasAmareloAte < 0 || diasAmareloAte > 365) {
    throw new Error("Informe o limite amarelo como um número inteiro de dias entre 0 e 365.");
  }
  // Atualiza o registro singleton dentro do contexto autenticado.
  return comContextoDeUsuario(ctx, (tx) => tx.configuracaoSemaforo.update({
    where: { id: 1 }, data: { diasAmareloAte },
  }));
}
