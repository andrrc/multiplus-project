import { redirect } from "next/navigation";

export default function TarefaAliasPage() {
  // Preserva links antigos e encaminha para a rota atual da listagem de tarefas.
  redirect("/tarefas");
}
