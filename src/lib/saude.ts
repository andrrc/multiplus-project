import { prisma } from "@/lib/prisma";

/**
 * Tarefa 0.1 — a verificação que sustenta `GET /api/health`.
 *
 * Vive fora do route handler porque o handler precisa chamar `connection()`, que só funciona
 * dentro do escopo de uma requisição e portanto não é exercitável em teste. Aqui fica tudo o
 * que tem decisão — o que conta como "de pé", que status sai, o que a resposta revela — e lá
 * fica só a casca.
 *
 * "De pé" são duas afirmações, e as duas precisam ser verdadeiras: o processo responde, e ele
 * alcança o Postgres. Um healthcheck que só devolvesse `{ ok: true }` daria 200 para um
 * container que subiu mas perdeu o banco — que é o estado que uma migration quebrada deixa
 * para trás, e exatamente o que o gate de deploy precisa pegar.
 */
export async function respostaDeSaude(): Promise<Response> {
  const cabecalhos = { "Cache-Control": "no-store" };

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (erro) {
    console.error("[health] Postgres inacessível:", erro);
    // A rota é pública: o `matcher` do proxy exclui `/api` inteiro (src/proxy.ts) e o
    // UptimeRobot não faz login. A resposta diz que caiu, nunca o que caiu — o detalhe fica
    // no log do container, que já é onde se investiga.
    return Response.json({ status: "indisponivel" }, { status: 503, headers: cabecalhos });
  }

  return Response.json({ status: "ok" }, { status: 200, headers: cabecalhos });
}
