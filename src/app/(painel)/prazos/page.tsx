import { redirect } from "next/navigation";

/** Mantém links antigos funcionando depois da mudança para /subtarefas. */
export default function PrazosAntigosPage() {
  redirect("/subtarefas");
}
