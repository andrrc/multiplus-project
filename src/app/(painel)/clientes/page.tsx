/**
 * Página da rota `src/app/(painel)/clientes/page.tsx`. Recebe os parâmetros da URL ou da rota, valida o acesso no servidor, obtém os dados necessários e compõe a resposta visual; as regras de negócio permanecem nas funções de domínio chamadas por ela.
 */
import Link from "next/link";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { listarClientes, listarCidadesComCliente } from "@/lib/clientes";
import { documentoCliente, numeroCliente } from "@/lib/formatacao";
import { botaoPrimario } from "@/ui/botoes";
import { NaoInformado } from "@/ui/cartao";
import { CelulaLista, LinhaLista, StatusPonto, TabelaLista, TextoPrincipal, TextoSecundario, TituloLinha, Vazio } from "@/ui/lista";
import { FiltrosClientes } from "./filtros-clientes";

const COLUNAS = [
  { titulo: "ID", largura: "8%" },
  { titulo: "Cliente", largura: "38%" },
  { titulo: "Segmento", largura: "20%" },
  { titulo: "Cidade", largura: "20%" },
  { titulo: "Situação", largura: "14%" },
];

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
    <div className="w-full max-w-[1280px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl">Clientes</h1>
        {ctx.perfil === "ADMIN" && <Link href="/clientes/novo" className={botaoPrimario}>+ Novo cliente</Link>}
      </div>

      <FiltrosClientes
        key={`${busca ?? ""}|${cidade ?? ""}|${mostrarDesativados ? "1" : ""}|${filtroLaudo ?? ""}`}
        laudoInicial={filtroLaudo}
        buscaInicial={busca}
        cidadeInicial={cidade}
        mostrarDesativadosInicial={mostrarDesativados}
        cidades={cidades}
        podeMostrarDesativados={ctx.perfil === "ADMIN"}
        total={clientes.length}
      />

      {clientes.length === 0 ? (
        <Vazio
          titulo={busca || cidade || filtroLaudo ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}
          descricao={busca || cidade || filtroLaudo ? "Nenhum cliente encontrado para esse filtro." : "Cadastre o primeiro para começar a acompanhar prazos e projetos ambientais."}
        />
      ) : (
        <TabelaLista rotulo="Tabela de clientes" colunas={COLUNAS}>
          {clientes.map((cliente) => {
            const documento = documentoCliente(cliente);
            return (
              <LinhaLista key={cliente.id}>
                <CelulaLista rotulo="ID">
                  <span className="font-semibold tabular-nums text-ink">{numeroCliente(cliente.numeroIdentificacao)}</span>
                </CelulaLista>
                <CelulaLista larga>
                  <TituloLinha href={`/clientes/${cliente.id}`}>{cliente.razaoSocial}</TituloLinha>
                  <TextoSecundario><span className="tabular-nums">{documento === "—" ? "Documento não informado" : documento}</span></TextoSecundario>
                </CelulaLista>
                <CelulaLista rotulo="Segmento">
                  {cliente.segmento ? <TextoPrincipal>{cliente.segmento}</TextoPrincipal> : <NaoInformado />}
                </CelulaLista>
                <CelulaLista rotulo="Cidade">
                  {cliente.municipio ? <TextoPrincipal>{cliente.municipio}</TextoPrincipal> : <NaoInformado />}
                </CelulaLista>
                <CelulaLista rotulo="Situação">
                  <StatusPonto status={cliente.ativo ? "CONCLUIDO" : "CANCELADO"}>{cliente.ativo ? "Ativo" : "Desativado"}</StatusPonto>
                </CelulaLista>
              </LinhaLista>
            );
          })}
        </TabelaLista>
      )}
    </div>
  );
}
