import Link from "next/link";
import { notFound } from "next/navigation";
import { buscarClienteContextual } from "@/lib/clientes";
import { documentoCliente } from "@/lib/formatacao";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { Etiqueta } from "@/ui/campo";

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return <section className="rounded-[3px] border border-linha bg-branco px-5 py-[22px] sm:px-6"><h2 className="text-[16px]">{titulo}</h2><div className="mt-4">{children}</div></section>;
}

function Campo({ label, valor }: { label: string; valor: React.ReactNode }) {
  return <div><p className="font-[family-name:var(--font-interface)] text-[11.5px] font-medium tracking-[0.04em] text-cinza uppercase">{label}</p><p className="mt-1 font-[family-name:var(--font-interface)] text-[14.5px] text-tinta">{valor}</p></div>;
}

const status: Record<string, string> = { A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", CANCELADO: "Cancelado" };
const data = (valor: Date | null) => valor ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(valor) : "—";

export default async function MeuClienteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await exigirAcessoARota("/meus-clientes");
  const { id } = await params;
  const cliente = await buscarClienteContextual(ctx, id);
  if (!cliente) notFound();

  return <div className="flex w-full max-w-[880px] flex-col gap-5">
    <Link href="/meus-clientes" className="self-start font-[family-name:var(--font-interface)] text-[14px] text-azul-esc hover:underline">← Clientes</Link>
    <div className="flex flex-col gap-4 rounded-[4px] px-6 py-7 sm:flex-row sm:items-start sm:justify-between sm:px-10 sm:py-9" style={{ background: "linear-gradient(112deg, #0B2530 0%, #14485C 58%, #12703F 130%)" }}><div><h1 className="text-[24px] text-branco sm:text-[30px]">{cliente.razaoSocial}</h1><div className="mt-3 flex flex-wrap items-center gap-3 font-[family-name:var(--font-interface)] text-[14px]"><span className="tabular-nums text-[#C4DCE4]">{documentoCliente(cliente)}</span><span className="rounded-[2px] bg-verde px-2.5 py-1 text-[13px] font-medium text-tinta">{cliente.segmento}</span></div></div></div>
    <Bloco titulo={cliente.tipo === "PESSOA_JURIDICA" ? "Dados da empresa" : "Dados pessoais"}><div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{cliente.origemContato && <Campo label="Origem do contato" valor={cliente.origemContato} />}{cliente.endereco && <Campo label="Endereço" valor={cliente.endereco} />}{cliente.municipio && <Campo label="Município" valor={cliente.estado ? `${cliente.municipio} - ${cliente.estado}` : cliente.municipio} />}{cliente.atividadePrincipal && <Campo label="Atividade principal" valor={cliente.atividadePrincipal} />}{cliente.tipo === "PESSOA_JURIDICA" && cliente.porte && <Campo label="Porte" valor={cliente.porte} />}{cliente.tipo === "PESSOA_FISICA" && <>{cliente.rg && <Campo label="RG" valor={cliente.rg} />}{cliente.cep && <Campo label="CEP" valor={cliente.cep} />}</>}</div></Bloco>
    <Bloco titulo="Drive">{cliente.documentos.length === 0 ? <p className="font-[family-name:var(--font-leitura)] text-[14.5px] text-cinza">Nenhum link do Drive vinculado a este cliente.</p> : <ul className="flex flex-col gap-2">{cliente.documentos.map((doc) => <li key={doc.id} className="border-b border-linha py-2 last:border-b-0"><a href={doc.link} target="_blank" rel="noreferrer" className="font-[family-name:var(--font-interface)] text-[14.5px] text-azul-esc hover:underline">{doc.nome} ↗</a></li>)}</ul>}</Bloco>
    <Bloco titulo="Projetos acessíveis">{cliente.projetos.length === 0 ? <p className="font-[family-name:var(--font-leitura)] text-[14.5px] text-cinza">Nenhum projeto disponível para você.</p> : <ul className="flex flex-col gap-2">{cliente.projetos.map((projeto) => <li key={projeto.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-linha py-3 last:border-b-0"><div><Link href={`/meus-projetos/${projeto.id}`} className="font-[family-name:var(--font-interface)] text-[14.5px] font-medium text-azul-esc hover:underline">{projeto.nome}</Link><p className="mt-1 text-[13px] text-cinza">Previsão: {data(projeto.dataPrevistaConclusao)}</p></div><Etiqueta tom={projeto.status === "CONCLUIDO" ? "positivo" : undefined}>{status[projeto.status] ?? projeto.status}</Etiqueta></li>)}</ul>}</Bloco>
  </div>;
}
