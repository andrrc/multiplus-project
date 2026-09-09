import Link from "next/link";
import { auth } from "@/server/auth";
import { obterContexto } from "@/server/auth/contexto";
import { listarClientes } from "@/lib/clientes";

export default async function Home() {
  const session = await auth();
  const usuario = session!.user;
  const ctx = await obterContexto();
  const clientes = await listarClientes(ctx);

  return (
    <div>
      <h1 className="text-[26px]">Olá, {usuario.name?.split(" ")[0] ?? usuario.email}</h1>
      <p className="mt-2 max-w-[60ch] text-[15px] text-cinza">
        Este é o painel da Múltiplus. Por enquanto, o cadastro de clientes é o módulo
        disponível — os módulos de projetos, tarefas e prazos chegam nas próximas sprints.
      </p>

      <Link
        href="/clientes"
        className="mt-8 flex max-w-sm items-center justify-between rounded-[3px] border border-linha bg-branco px-6 py-5 hover:border-azul"
      >
        <span>
          <span className="block font-[family-name:var(--font-interface)] text-[15px] font-semibold text-tinta">
            Clientes
          </span>
          <span className="mt-0.5 block text-[14px] text-cinza">
            {clientes.length === 0
              ? "Nenhum cadastrado ainda"
              : `${clientes.length} ${clientes.length === 1 ? "cadastrado" : "cadastrados"}`}
          </span>
        </span>
      </Link>
    </div>
  );
}
