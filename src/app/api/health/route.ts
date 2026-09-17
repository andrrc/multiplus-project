import { connection } from "next/server";
import { respostaDeSaude } from "@/lib/saude";

/**
 * Tarefa 0.1 — healthcheck do gate de deploy (`.github/workflows/ci.yml`) e do monitoramento
 * externo (UptimeRobot, tarefa 0.4). A decisão toda está em `src/lib/saude.ts`; aqui é casca.
 */
export async function GET() {
  // Sem isto o handler é candidato a prerender durante o `next build`, que roda dentro do
  // Docker sem banco nenhum. `connection()` é a forma atual de marcar "só existe em tempo de
  // requisição": `export const dynamic` sai de cena quando Cache Components é ligado
  // (Next 16, route-segment-config). É também o motivo de a lógica não morar aqui — esta
  // função não roda fora do escopo de uma requisição, nem em teste.
  await connection();

  return respostaDeSaude();
}
