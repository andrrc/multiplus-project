import Link from "next/link";
import { obterContexto } from "@/server/auth/contexto";
import { listarClientes } from "@/lib/clientes";
import { formatarCnpj } from "@/lib/formatacao";
import { Etiqueta } from "./campo";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string }>;
}) {
  const { busca } = await searchParams;
  const ctx = await obterContexto();
  const clientes = await listarClientes(ctx, busca);

  return (
    <div className="max-w-[1000px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px]">Clientes</h1>
          <p className="mt-1.5 text-[15px] text-cinza">
            {clientes.length === 0
              ? "Nenhum cliente cadastrado ainda."
              : `${clientes.length} ${clientes.length === 1 ? "cliente cadastrado" : "clientes cadastrados"}.`}
          </p>
        </div>
        {ctx.perfil === "ADMIN" && (
          <Link
            href="/clientes/novo"
            className="shrink-0 rounded-[3px] bg-verde px-5 py-2.5 font-[family-name:var(--font-interface)] text-[14px] font-semibold text-tinta hover:bg-verde-esc hover:text-branco"
          >
            + Novo cliente
          </Link>
        )}
      </div>

      <form className="mt-7 max-w-md">
        <input
          type="search"
          name="busca"
          defaultValue={busca}
          placeholder="Buscar por razão social ou CNPJ"
          className="w-full rounded-[3px] border border-linha bg-branco px-4 py-2.5 font-[family-name:var(--font-interface)] text-[14.5px] placeholder:text-cinza focus:border-azul focus:outline-none"
        />
      </form>

      {clientes.length === 0 ? (
        <div className="mt-8 rounded-[3px] border border-linha bg-branco px-8 py-14 text-center">
          <p className="max-w-[46ch] mx-auto text-[16px] text-cinza">
            {busca
              ? "Nenhum cliente encontrado para essa busca."
              : "Nenhum cliente cadastrado ainda. Cadastre o primeiro para começar a acompanhar prazos e projetos ambientais."}
          </p>
        </div>
      ) : (
        <table className="mt-7 w-full border-collapse font-[family-name:var(--font-interface)] text-[14px]">
          <thead>
            <tr className="bg-tinta text-left text-branco">
              <th className="rounded-l-[3px] px-5 py-3 text-[11.5px] font-semibold tracking-[0.06em] uppercase">
                Razão social
              </th>
              <th className="px-5 py-3 text-[11.5px] font-semibold tracking-[0.06em] uppercase">CNPJ</th>
              <th className="px-5 py-3 text-[11.5px] font-semibold tracking-[0.06em] uppercase">Segmento</th>
              <th className="rounded-r-[3px] px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {clientes.map((cliente) => (
              <tr key={cliente.id} className="border-t border-linha bg-branco transition-colors hover:bg-verde-cl">
                <td className="px-5 py-4 font-medium text-tinta">
                  <Link href={`/clientes/${cliente.id}`} className="hover:text-azul-esc">
                    {cliente.razaoSocial}
                  </Link>
                </td>
                <td className="px-5 py-4 tabular-nums text-cinza">{formatarCnpj(cliente.cnpj)}</td>
                <td className="px-5 py-4">
                  <Etiqueta>{cliente.segmento}</Etiqueta>
                </td>
                <td className="px-5 py-4 text-right">
                  <Link href={`/clientes/${cliente.id}`} className="text-azul-esc hover:underline">
                    Ver detalhe
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
