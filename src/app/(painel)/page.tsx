import { redirect } from "next/navigation";
import { obterContexto } from "@/server/auth/contexto";
import { telaInicial } from "@/lib/navegacao";

/**
 * RF-043 — a raiz não é uma tela: ela manda cada perfil para a própria tela inicial.
 * Mantê-la como um painel genérico adiaria em um clique a informação que define o
 * trabalho do dia, que é justamente o que o RF-043 evita.
 */
export default async function Home() {
  const ctx = await obterContexto();
  redirect(telaInicial(ctx.perfil));
}
