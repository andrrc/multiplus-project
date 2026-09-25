import Link from "next/link";
import { listarClientesContextuais } from "@/lib/clientes";
import { documentoCliente } from "@/lib/formatacao";
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
      <p className="mt-1.5 text-[15px] text-cinza">
        {clientes.length === 0 ? "Nenhum cliente relacionado às suas atribuições." : `${clientes.length} ${clientes.length === 1 ? "cliente acessível" : "clientes acessíveis"}.`}
      </p>

      {clientes.length === 0 ? (
        <div className="mt-8 border border-dashed border-linha bg-branco px-8 py-14 text-center text-[15px] text-cinza">
          Nenhum cliente está relacionado às suas atribuições ainda.
        </div>
      ) : (
        <>
        <ul className="mt-7 flex flex-col gap-3 md:hidden">
          {clientes.map((cliente) => (
            <li key={cliente.id}>
              <Link href={`/meus-clientes/${cliente.id}`} className="block rounded-[3px] border border-linha bg-branco px-4 py-4 font-[family-name:var(--font-interface)] hover:border-azul">
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
          <thead><tr className="bg-tinta text-left text-branco"><th className="rounded-l-[3px] px-5 py-3 text-[11.5px] font-semibold tracking-[0.06em] uppercase">Razão social</th><th className="px-5 py-3 text-[11.5px] font-semibold tracking-[0.06em] uppercase">CNPJ/CPF</th><th className="px-5 py-3 text-[11.5px] font-semibold tracking-[0.06em] uppercase">Segmento</th><th className="px-5 py-3 text-[11.5px] font-semibold tracking-[0.06em] uppercase">Cidade</th><th className="rounded-r-[3px] px-5 py-3" /></tr></thead>
          <tbody>{clientes.map((cliente) => <tr key={cliente.id} className="border-t border-linha bg-branco transition-colors hover:bg-verde-cl"><td className="px-5 py-4 font-medium text-tinta"><Link href={`/meus-clientes/${cliente.id}`} className="hover:text-azul-esc">{cliente.razaoSocial}</Link></td><td className="px-5 py-4 tabular-nums text-cinza">{documentoCliente(cliente)}</td><td className="px-5 py-4"><Etiqueta>{cliente.segmento}</Etiqueta></td><td className="px-5 py-4 text-cinza">{cliente.municipio ?? "—"}</td><td className="px-5 py-4 text-right"><Link href={`/meus-clientes/${cliente.id}`} className="text-azul-esc hover:underline">Ver detalhe</Link></td></tr>)}</tbody>
        </table>
        </>
      )}
    </div>
  );
}
