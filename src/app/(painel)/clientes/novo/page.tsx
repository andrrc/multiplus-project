import { redirect } from "next/navigation";
import { obterContexto } from "@/server/auth/contexto";
import { NovoClienteForm } from "./novo-cliente-form";

export default async function NovoClientePage() {
  const ctx = await obterContexto();
  if (ctx.perfil !== "ADMIN") redirect("/clientes");

  return (
    <div>
      <h1 className="text-[28px]">Novo cliente</h1>
      <div className="mt-8">
        <NovoClienteForm />
      </div>
    </div>
  );
}
