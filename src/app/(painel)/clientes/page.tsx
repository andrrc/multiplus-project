/**
 * Página da rota `src/app/(painel)/clientes/page.tsx`. Recebe os parâmetros da URL ou da rota, valida o acesso no servidor, obtém os dados necessários e compõe a resposta visual; as regras de negócio permanecem nas funções de domínio chamadas por ela.
 */
import Link from "next/link";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { listarClientes, listarCidadesComCliente } from "@/lib/clientes";
import { documentoCliente, numeroCliente } from "@/lib/formatacao";
import { Etiqueta } from "@/ui/campo";
import { FiltrosClientes } from "./filtros-clientes";
import { RolagemHorizontal } from "@/ui/rolagem-horizontal";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; cidade?: string; desativados?: string; laudo?: string }>;
}) {
  const { busca, cidade, desativados, laudo } = await searchParams;
  const ctx = await exigirAcessoARota("/clientes");

  // RF-039 — só o Administrador reativa, então só ele tem o toggle; para os demais a RLS
  // já não devolve cliente desativado, e o parâmetro na URL não muda nada.
  const filtroLaudo = ctx.perfil === "ADMIN" && (laudo === "com" || laudo === "sem") ? laudo : undefined;
  const mostrarDesativados = desativados === "1" && ctx.perfil === "ADMIN";

  const [clientes, cidades] = await Promise.all([
    listarClientes(ctx, busca, cidade, mostrarDesativados, filtroLaudo),
    listarCidadesComCliente(ctx),
  ]);

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-linha pb-5">
        <div>
          <h1 className="text-[24px] sm:text-[28px]">Clientes</h1>
          <p className="mt-1.5 text-[14px] text-cinza">
            {clientes.length === 0
              ? "Nenhum cliente cadastrado ainda."
              : `${clientes.length} ${clientes.length === 1 ? "cliente cadastrado" : "clientes cadastrados"}.`}
          </p>
        </div>
        {ctx.perfil === "ADMIN" && (
          <Link
            href="/clientes/novo"
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-controle bg-tinta px-5 py-2.5 font-[family-name:var(--font-interface)] text-[14px] font-semibold text-branco hover:bg-tinta2"
          >
            + Novo cliente
          </Link>
        )}
      </div>

      <FiltrosClientes
        key={`${busca ?? ""}|${cidade ?? ""}|${mostrarDesativados ? "1" : ""}|${filtroLaudo ?? ""}`}
        laudoInicial={filtroLaudo}
        buscaInicial={busca}
        cidadeInicial={cidade}
        mostrarDesativadosInicial={mostrarDesativados}
        cidades={cidades}
        podeMostrarDesativados={ctx.perfil === "ADMIN"}
      />

      {clientes.length === 0 ? (
        <div className="mt-8 rounded-cartao border border-linha bg-branco px-8 py-14 text-center">
          <p className="max-w-[46ch] mx-auto text-[16px] text-cinza">
            {busca || cidade || filtroLaudo
              ? "Nenhum cliente encontrado para esse filtro."
              : "Nenhum cliente cadastrado ainda. Cadastre o primeiro para começar a acompanhar prazos e projetos ambientais."}
          </p>
        </div>
      ) : (
        <>
        <ul className="mt-5 flex flex-col gap-3 md:hidden">
          {clientes.map((cliente) => (
            <li key={cliente.id}>
              <div className="rounded-cartao border border-linha bg-branco px-4 py-4 font-[family-name:var(--font-interface)] hover:border-azul">
                <Link href={`/clientes/${cliente.id}`} className="block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azul-esc">
                  <p className={`text-[15px] font-medium ${cliente.ativo ? "text-tinta" : "text-cinza"}`}>
                    {cliente.razaoSocial}
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-interface)] text-[12px] font-semibold tracking-[0.04em] text-azul-esc">ID {numeroCliente(cliente.numeroIdentificacao)}</p>
                  <p className="mt-1 text-[14px] tabular-nums text-cinza">{documentoCliente(cliente) === "—" ? "Não informado" : documentoCliente(cliente)}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="flex flex-wrap items-center gap-2">
                      <Etiqueta>{cliente.segmento}</Etiqueta>
                      {!cliente.ativo && <Etiqueta tom="apagado">Desativado</Etiqueta>}
                    </span>
                    <span className="text-[14px] text-cinza">{cliente.municipio ?? "Não informada"}</span>
                  </div>
                </Link>
              </div>
            </li>
          ))}
        </ul>

        <RolagemHorizontal className="mt-5 hidden rounded-cartao border border-linha bg-branco md:block" rotulo="Tabela de clientes">
          <table className="w-full table-fixed border-collapse text-left font-[family-name:var(--font-interface)] text-[13px]">
            <thead><tr className="border-b border-linha bg-papel text-cinza"><th className="w-[10%] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.04em]">ID</th><th className="w-[30%] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.04em]">Cliente</th><th className="w-[24%] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.04em]">CNPJ/CPF</th><th className="w-[18%] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.04em]">Segmento</th><th className="w-[18%] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.04em]">Cidade</th></tr></thead>
            <tbody>{clientes.map((cliente) => <tr key={cliente.id} className={`border-t border-linha align-top hover:bg-papel ${cliente.ativo ? "bg-branco" : "bg-papel"}`}>
              <td className="px-4 py-4 tabular-nums text-cinza">{numeroCliente(cliente.numeroIdentificacao)}</td>
              <td className="break-words px-4 py-4"><Link href={`/clientes/${cliente.id}`} className="inline-flex min-h-11 items-center font-semibold text-tinta hover:text-azul-esc hover:underline">{cliente.razaoSocial}</Link>{!cliente.ativo && <span className="mt-1 inline-block"><Etiqueta tom="apagado">Desativado</Etiqueta></span>}</td>
              <td className="break-all px-4 py-4 tabular-nums text-cinza">{documentoCliente(cliente) === "—" ? "Não informado" : documentoCliente(cliente)}</td>
              <td className="break-words px-4 py-4"><div className="[&_span]:max-w-full [&_span]:break-words"><Etiqueta>{cliente.segmento}</Etiqueta></div></td>
              <td className="break-words px-4 py-4 text-cinza">{cliente.municipio ?? "Não informada"}</td>
            </tr>)}</tbody>
          </table>
        </RolagemHorizontal>
        </>
      )}
    </div>
  );
}
