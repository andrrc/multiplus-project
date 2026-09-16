import Link from "next/link";
import { obterContexto } from "@/server/auth/contexto";
import { listarClientes, listarCidadesComCliente } from "@/lib/clientes";
import { documentoCliente } from "@/lib/formatacao";
import { Etiqueta, inputClass } from "@/ui/campo";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; cidade?: string }>;
}) {
  const { busca, cidade } = await searchParams;
  const ctx = await obterContexto();
  const [clientes, cidades] = await Promise.all([
    listarClientes(ctx, busca, cidade),
    listarCidadesComCliente(ctx),
  ]);

  return (
    <div className="w-full max-w-[1000px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] sm:text-[28px]">Clientes</h1>
          <p className="mt-1.5 text-[15px] text-cinza">
            {clientes.length === 0
              ? "Nenhum cliente cadastrado ainda."
              : `${clientes.length} ${clientes.length === 1 ? "cliente cadastrado" : "clientes cadastrados"}.`}
          </p>
        </div>
        {ctx.perfil === "ADMIN" && (
          <Link
            href="/clientes/novo"
            className="flex min-h-11 shrink-0 items-center rounded-[3px] bg-verde px-5 py-2.5 font-[family-name:var(--font-interface)] text-[14px] font-semibold text-tinta hover:bg-verde-esc hover:text-branco"
          >
            + Novo cliente
          </Link>
        )}
      </div>

      <form className="mt-7 flex flex-wrap gap-3">
        <input
          type="search"
          name="busca"
          defaultValue={busca}
          placeholder="Buscar por razão social, CNPJ, CPF ou cidade"
          className={`${inputClass} placeholder:text-cinza sm:max-w-md`}
        />
        <select name="cidade" defaultValue={cidade ?? ""} className={`${inputClass} sm:w-auto`}>
          <option value="">Todas as cidades</option>
          {cidades.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="min-h-11 w-full rounded-[3px] border border-linha px-4 py-2.5 text-[14px] font-medium text-tinta hover:border-azul sm:w-auto"
        >
          Filtrar
        </button>
      </form>

      {clientes.length === 0 ? (
        <div className="mt-8 rounded-[3px] border border-linha bg-branco px-8 py-14 text-center">
          <p className="max-w-[46ch] mx-auto text-[16px] text-cinza">
            {busca || cidade
              ? "Nenhum cliente encontrado para esse filtro."
              : "Nenhum cliente cadastrado ainda. Cadastre o primeiro para começar a acompanhar prazos e projetos ambientais."}
          </p>
        </div>
      ) : (
        <>
        <ul className="mt-7 flex flex-col gap-3 md:hidden">
          {clientes.map((cliente) => (
            <li key={cliente.id}>
              <Link
                href={`/clientes/${cliente.id}`}
                className="block rounded-[3px] border border-linha bg-branco px-4 py-4 font-[family-name:var(--font-interface)] hover:border-azul"
              >
                <p className="text-[15px] font-medium text-tinta">{cliente.razaoSocial}</p>
                <p className="mt-1 text-[14px] tabular-nums text-cinza">{documentoCliente(cliente)}</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <Etiqueta>{cliente.segmento}</Etiqueta>
                  <span className="text-[14px] text-cinza">{cliente.municipio ?? "—"}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <table className="mt-7 hidden w-full border-collapse font-[family-name:var(--font-interface)] text-[14px] md:table">
          <thead>
            <tr className="bg-tinta text-left text-branco">
              <th className="rounded-l-[3px] px-5 py-3 text-[11.5px] font-semibold tracking-[0.06em] uppercase">
                Razão social
              </th>
              <th className="px-5 py-3 text-[11.5px] font-semibold tracking-[0.06em] uppercase">CNPJ/CPF</th>
              <th className="px-5 py-3 text-[11.5px] font-semibold tracking-[0.06em] uppercase">Segmento</th>
              <th className="px-5 py-3 text-[11.5px] font-semibold tracking-[0.06em] uppercase">Cidade</th>
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
                <td className="px-5 py-4 tabular-nums text-cinza">{documentoCliente(cliente)}</td>
                <td className="px-5 py-4">
                  <Etiqueta>{cliente.segmento}</Etiqueta>
                </td>
                <td className="px-5 py-4 text-cinza">{cliente.municipio ?? "—"}</td>
                <td className="px-5 py-4 text-right">
                  <Link href={`/clientes/${cliente.id}`} className="text-azul-esc hover:underline">
                    Ver detalhe
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </>
      )}
    </div>
  );
}
