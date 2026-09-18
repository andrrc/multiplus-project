import Link from "next/link";
import { listarClientesContextuais } from "@/lib/clientes";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { Etiqueta } from "@/ui/campo";

const status: Record<string, string> = {
  A_INICIAR: "A iniciar",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

export default async function MeusClientesPage() {
  const ctx = await exigirAcessoARota("/meus-clientes");
  const clientes = await listarClientesContextuais(ctx);

  return (
    <div className="w-full max-w-[1000px]">
      <h1 className="text-[28px]">Clientes</h1>
      <p className="mt-1.5 max-w-[62ch] text-[15px] text-cinza">
        Clientes dos projetos em que você tem uma tarefa ou subtarefa atribuída. Dados de contato e valores não aparecem nesta área.
      </p>

      {clientes.length === 0 ? (
        <div className="mt-8 border border-dashed border-linha bg-branco px-8 py-14 text-center text-[15px] text-cinza">
          Nenhum cliente está relacionado às suas atribuições ainda.
        </div>
      ) : (
        <ul className="mt-7 grid gap-4 md:grid-cols-2">
          {clientes.map((cliente) => (
            <li key={cliente.id} className="border border-linha border-l-[3px] border-l-azul bg-branco p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-[family-name:var(--font-interface)] text-[17px] font-semibold text-tinta">
                    {cliente.razaoSocial}
                  </p>
                  <p className="mt-1 text-[14px] text-cinza">
                    {cliente.projetos.length} {cliente.projetos.length === 1 ? "projeto acessível" : "projetos acessíveis"}
                  </p>
                </div>
              </div>

              <ul className="mt-5 divide-y divide-linha border-y border-linha">
                {cliente.projetos.map((projeto) => (
                  <li key={projeto.id} className="flex items-center justify-between gap-3 py-3">
                    <Link href={`/meus-projetos/${projeto.id}`} className="min-w-0 font-[family-name:var(--font-interface)] text-[14px] font-medium text-azul-esc hover:underline">
                      {projeto.nome}
                    </Link>
                    <Etiqueta tom={projeto.status === "CONCLUIDO" ? "positivo" : undefined}>
                      {status[projeto.status] ?? projeto.status}
                    </Etiqueta>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
