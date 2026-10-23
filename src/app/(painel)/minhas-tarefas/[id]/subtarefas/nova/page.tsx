import { notFound } from "next/navigation";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { buscarTarefaParaColaborador } from "@/lib/projetos-tarefas";
import { listarEtiquetas } from "@/lib/etiquetas";
import { FormNovaSubtarefa } from "@/app/(painel)/tarefas/[id]/subtarefas/form-nova-subtarefa";

export default async function NovaSubtarefaColaboradorPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await exigirAcessoARota("/minhas-tarefas");
  const { id } = await params;
  const tarefa = await buscarTarefaParaColaborador(ctx, id);
  if (!tarefa || !tarefa.podeCriarSubtarefas) notFound();
  const etiquetas = await listarEtiquetas(ctx);

  return <FormNovaSubtarefa tarefaId={tarefa.id} tarefaNome={tarefa.nome} ehAdmin={false} etiquetas={etiquetas} />;
}
