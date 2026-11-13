import Link from "next/link";
import { notFound } from "next/navigation";
import { buscarClienteContextual } from "@/lib/clientes";
import { documentoCliente, numeroCliente } from "@/lib/formatacao";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { BlocoLateral, Cartao, CartaoLateral, ListaChaveValor, NaoInformado, Trilha } from "@/ui/cartao";
import { StatusPonto } from "@/ui/lista";

const status: Record<string, string> = { A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", CANCELADO: "Cancelado" };
const data = (valor: Date | null) => valor ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(valor) : null;
const ouNaoInformado = (valor: React.ReactNode) => (valor ? valor : <NaoInformado />);

export default async function MeuClienteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await exigirAcessoARota("/meus-clientes");
  const { id } = await params;
  const cliente = await buscarClienteContextual(ctx, id);
  if (!cliente) notFound();

  const documento = documentoCliente(cliente);
  return <div className="w-full max-w-[1280px]">
    <Trilha itens={[{ rotulo: "Clientes", href: "/meus-clientes" }, { rotulo: `${numeroCliente(cliente.numeroIdentificacao)} · ${cliente.razaoSocial}` }]} />

    <div className="mb-5">
      <h1 className="break-words text-[26px]">{cliente.razaoSocial}</h1>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] text-cinza">
        <span className="font-medium tabular-nums text-ink">ID {numeroCliente(cliente.numeroIdentificacao)}</span>
        {documento !== "—" && <span className="tabular-nums">{documento}</span>}
        <span>{cliente.segmento}{cliente.tipo === "PESSOA_JURIDICA" && cliente.porte ? ` · ${cliente.porte}` : ""}</span>
        {cliente.municipio && <span>{cliente.estado ? `${cliente.municipio}/${cliente.estado}` : cliente.municipio}</span>}
      </div>
    </div>

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <Cartao titulo={<>Projetos acessíveis <span className="rounded-full bg-papel px-2 py-px text-xs font-semibold tabular-nums text-ink">{cliente.projetos.length}</span></>} semMargem>
        {cliente.projetos.length === 0 ? <p className="px-5 py-8 text-center text-sm text-cinza">Nenhum projeto disponível para você.</p> : (
          <ul>
            {cliente.projetos.map((projeto) => (
              <li key={projeto.id} className="relative grid gap-2 border-t border-linha px-5 py-3.5 first:border-t-0 hover:bg-cabecalho sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-5">
                <div className="min-w-0">
                  <Link href={`/meus-projetos/${projeto.id}`} className="block break-words font-medium text-ink before:absolute before:inset-0 before:content-[''] hover:text-azul-esc">{projeto.nome}</Link>
                  <p className="mt-px text-[12.5px] tabular-nums text-cinza">Previsão: {data(projeto.dataPrevistaConclusao) ?? "sem previsão"}</p>
                </div>
                <StatusPonto status={projeto.status}>{status[projeto.status] ?? projeto.status}</StatusPonto>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      <CartaoLateral>
        <BlocoLateral titulo={cliente.tipo === "PESSOA_JURIDICA" ? "Dados da empresa" : "Dados pessoais"}>
          <ListaChaveValor
            itens={[
              { rotulo: "Atividade principal", valor: ouNaoInformado(cliente.atividadePrincipal) },
              ...(cliente.tipo === "PESSOA_JURIDICA" ? [{ rotulo: "Porte", valor: ouNaoInformado(cliente.porte) }] : []),
              { rotulo: "Município", valor: ouNaoInformado(cliente.municipio ? (cliente.estado ? `${cliente.municipio} - ${cliente.estado}` : cliente.municipio) : null) },
              { rotulo: "Origem do contato", valor: ouNaoInformado(cliente.origemContato) },
            ]}
          />
        </BlocoLateral>
        <BlocoLateral titulo="Documentos">
          {cliente.documentos.length === 0 ? <p className="text-[13px] text-cinza">Nenhum link do Drive vinculado a este cliente.</p> : (
            <ul className="flex flex-col gap-2">
              {cliente.documentos.map((doc) => (
                <li key={doc.id} className="min-w-0 text-[13.5px]">
                  <a href={doc.link} target="_blank" rel="noreferrer" className="break-words text-azul-esc hover:underline">{doc.nome} <span className="text-faint">↗</span></a>
                </li>
              ))}
            </ul>
          )}
        </BlocoLateral>
      </CartaoLateral>
    </div>
  </div>;
}
