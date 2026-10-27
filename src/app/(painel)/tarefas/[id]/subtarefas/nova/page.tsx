/**
 * Página da rota `src/app/(painel)/tarefas/[id]/subtarefas/nova/page.tsx`. Recebe os parâmetros da URL ou da rota, valida o acesso no servidor, obtém os dados necessários e compõe a resposta visual; as regras de negócio permanecem nas funções de domínio chamadas por ela.
 */
import { notFound } from "next/navigation";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { buscarTarefa, listarPessoasParaProjeto } from "@/lib/projetos-tarefas";
import { listarEtiquetas } from "@/lib/etiquetas";
import { FormNovaSubtarefa } from "../form-nova-subtarefa";

export default async function NovaSubtarefaPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await exigirAcessoARota("/tarefas");
  const { id } = await params;
  const tarefa = await buscarTarefa(ctx, id);
  if (!tarefa) notFound();
  const [opcoesResponsavel, etiquetas] = await Promise.all([
    listarPessoasParaProjeto(ctx, tarefa.projeto.clienteId),
    listarEtiquetas(ctx),
  ]);

  return <FormNovaSubtarefa tarefaId={tarefa.id} tarefaNome={tarefa.nome} ehAdmin opcoesResponsavel={opcoesResponsavel} etiquetas={etiquetas} />;
}
