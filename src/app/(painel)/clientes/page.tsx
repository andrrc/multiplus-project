import Link from "next/link";
import { obterContexto } from "@/server/auth/contexto";
import { listarClientes, listarCidadesComCliente } from "@/lib/clientes";
import { documentoCliente, numeroCliente } from "@/lib/formatacao";
import { Etiqueta } from "@/ui/campo";
import { FiltrosClientes } from "./filtros-clientes";
import { BotaoDesativarCliente } from "./[id]/acoes-cliente";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; cidade?: string; desativados?: string }>;
}) {
  const { busca, cidade, desativados } = await searchParams;
  const ctx = await obterContexto();

  // RF-039 — só o Administrador reativa, então só ele tem o toggle; para os demais a RLS
  // já não devolve cliente desativado, e o parâmetro na URL não muda nada.
  const mostrarDesativados = desativados === "1" && ctx.perfil === "ADMIN";

  const [clientes, cidades] = await Promise.all([
    listarClientes(ctx, busca, cidade, mostrarDesativados),
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

      <FiltrosClientes
        key={`${busca ?? ""}|${cidade ?? ""}|${mostrarDesativados ? "1" : ""}`}
        buscaInicial={busca}
        cidadeInicial={cidade}
        mostrarDesativadosInicial={mostrarDesativados}
        cidades={cidades}
        podeMostrarDesativados={ctx.perfil === "ADMIN"}
      />

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
              <div className="rounded-[3px] border border-linha bg-branco px-4 py-4 font-[family-name:var(--font-interface)] hover:border-azul">
                <Link href={`/clientes/${cliente.id}`} className="block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azul-esc">
                  <p className={`text-[15px] font-medium ${cliente.ativo ? "text-tinta" : "text-cinza"}`}>
                    {cliente.razaoSocial}
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-interface)] text-[12px] font-semibold tracking-[0.04em] text-azul-esc">ID {numeroCliente(cliente.numeroIdentificacao)}</p>
                  <p className="mt-1 text-[14px] tabular-nums text-cinza">{documentoCliente(cliente)}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="flex flex-wrap items-center gap-2">
                      <Etiqueta>{cliente.segmento}</Etiqueta>
                      {!cliente.ativo && <Etiqueta tom="apagado">Desativado</Etiqueta>}
                    </span>
                    <span className="text-[14px] text-cinza">{cliente.municipio ?? "—"}</span>
                  </div>
                </Link>
                {ctx.perfil === "ADMIN" && (
                  <div className="mt-4 border-t border-linha pt-3">
                    <BotaoDesativarCliente clienteId={cliente.id} nome={cliente.razaoSocial} ativo={cliente.ativo} instancia="lista-movel" />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>

        <table className="mt-7 hidden w-full border-collapse font-[family-name:var(--font-interface)] text-[14px] md:table">
          <thead>
            <tr className="bg-tinta text-left text-branco">
              <th className="rounded-l-[3px] px-5 py-3 text-[11.5px] font-semibold tracking-[0.06em] uppercase">ID</th>
              <th className="px-5 py-3 text-[11.5px] font-semibold tracking-[0.06em] uppercase">
                Razão social
              </th>
              <th className="px-5 py-3 text-[11.5px] font-semibold tracking-[0.06em] uppercase">CNPJ/CPF</th>
              <th className="px-5 py-3 text-[11.5px] font-semibold tracking-[0.06em] uppercase">Segmento</th>
              <th className="px-5 py-3 text-[11.5px] font-semibold tracking-[0.06em] uppercase">Cidade</th>
              <th className="rounded-r-[3px] px-5 py-3 text-right text-[11.5px] font-semibold tracking-[0.06em] uppercase">
                {ctx.perfil === "ADMIN" ? "Ações" : ""}
              </th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((cliente) => (
              <tr
                key={cliente.id}
                className={`border-t border-linha transition-colors hover:bg-verde-cl ${
                  cliente.ativo ? "bg-branco" : "bg-papel"
                }`}
              >
                <td className="px-5 py-4 font-[family-name:var(--font-interface)] font-semibold tabular-nums text-azul-esc">{numeroCliente(cliente.numeroIdentificacao)}</td>
                <td className="px-5 py-4 font-medium text-tinta">
                  <Link href={`/clientes/${cliente.id}`} className="hover:text-azul-esc">
                    {cliente.razaoSocial}
                  </Link>
                  {!cliente.ativo && (
                    <span className="ml-2 align-middle">
                      <Etiqueta tom="apagado">Desativado</Etiqueta>
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 tabular-nums text-cinza">{documentoCliente(cliente)}</td>
                <td className="px-5 py-4">
                  <Etiqueta>{cliente.segmento}</Etiqueta>
                </td>
                <td className="px-5 py-4 text-cinza">{cliente.municipio ?? "—"}</td>
                <td className="px-5 py-4 text-right">
                  <div className="flex flex-col items-end gap-2">
                    <Link href={`/clientes/${cliente.id}`} className="text-azul-esc hover:underline">
                      Ver detalhe
                    </Link>
                    {ctx.perfil === "ADMIN" && (
                      <BotaoDesativarCliente clienteId={cliente.id} nome={cliente.razaoSocial} ativo={cliente.ativo} instancia="lista-tabela" />
                    )}
                  </div>
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
