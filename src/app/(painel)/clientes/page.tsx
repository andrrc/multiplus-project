/**
 * Página da rota `src/app/(painel)/clientes/page.tsx`. Recebe os parâmetros da URL ou da rota, valida o acesso no servidor, obtém os dados necessários e compõe a resposta visual; as regras de negócio permanecem nas funções de domínio chamadas por ela.
 */
import Link from "next/link";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { listarClientes, listarCidadesComCliente, listarSegmentosComCliente } from "@/lib/clientes";
import { clienteIncompleto } from "@/lib/clientes-cadastro";
import { ROTULO_STATUS_PORTAL } from "@/lib/status-portal-cliente";
import { documentoCliente, numeroCliente } from "@/lib/formatacao";
import { botaoPrimario } from "@/ui/botoes";
import { NaoInformado } from "@/ui/cartao";
import { CelulaLista, LinhaLista, StatusPonto, TabelaLista, TextoPrincipal, TextoSecundario, TituloLinha, Vazio } from "@/ui/lista";
import { FiltrosClientes } from "./filtros-clientes";

const COLUNAS = [
  { titulo: "ID", largura: "7%" },
  { titulo: "Cliente", largura: "29%" },
  { titulo: "Segmento", largura: "15%" },
  { titulo: "Cidade", largura: "15%" },
  { titulo: "Projetos ativos", largura: "11%" },
  { titulo: "Portal do cliente", largura: "14%" },
];
// A situação (ativo ou desativado) só aparece quando a lista inclui os desativados.
const COLUNA_SITUACAO = { titulo: "Situação", largura: "9%" };
const STATUS_DO_PORTAL = { ATIVO: "ATIVO", PENDENTE: "PENDENTE", SEM_ACESSO: "DESATIVADO" } as const;

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; cidade?: string; desativados?: string; laudo?: string; segmento?: string; situacao?: string }>;
}) {
  const { busca, cidade, desativados, laudo, segmento, situacao: situacaoParametro } = await searchParams;
  const ctx = await exigirAcessoARota("/clientes");

  // RF-039 — só o Administrador reativa, então só ele tem o toggle; para os demais a RLS
  // já não devolve cliente desativado, e o parâmetro na URL não muda nada.
  const filtroLaudo = ctx.perfil === "ADMIN" && (laudo === "com" || laudo === "sem") ? laudo : undefined;
  const mostrarDesativados = desativados === "1" && ctx.perfil === "ADMIN";

  const [clientesDaConsulta, cidades, segmentos] = await Promise.all([
    listarClientes(ctx, busca, cidade, mostrarDesativados, filtroLaudo, segmento),
    listarCidadesComCliente(ctx),
    listarSegmentosComCliente(ctx),
  ]);
  // A situação (com ou sem projeto ativo) é aplicada aqui; as contagens dos botões usam a lista antes dela.
  const situacao = situacaoParametro === "com" || situacaoParametro === "sem" || situacaoParametro === "atraso" || situacaoParametro === "incompleto" ? situacaoParametro : "";
  const contagens = {
    todos: clientesDaConsulta.length,
    com: clientesDaConsulta.filter((c) => c.projetosAtivos > 0).length,
    sem: clientesDaConsulta.filter((c) => c.projetosAtivos === 0).length,
    atraso: clientesDaConsulta.filter((c) => c.emAtraso).length,
    incompleto: clientesDaConsulta.filter(clienteIncompleto).length,
  };
  const clientes = situacao === "com" ? clientesDaConsulta.filter((c) => c.projetosAtivos > 0)
    : situacao === "sem" ? clientesDaConsulta.filter((c) => c.projetosAtivos === 0)
    : situacao === "atraso" ? clientesDaConsulta.filter((c) => c.emAtraso)
    : situacao === "incompleto" ? clientesDaConsulta.filter(clienteIncompleto)
    : clientesDaConsulta;
  const colunas = mostrarDesativados ? [...COLUNAS, COLUNA_SITUACAO] : COLUNAS;
  const comFiltro = Boolean(busca || cidade || segmento || filtroLaudo || situacao);

  return (
    <div className="w-full max-w-[1280px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl">Clientes</h1>
        {ctx.perfil === "ADMIN" && <Link href="/clientes/novo" className={botaoPrimario}>+ Novo cliente</Link>}
      </div>

      <FiltrosClientes
        key={`${cidade ?? ""}|${segmento ?? ""}|${situacao}|${mostrarDesativados ? "1" : ""}|${filtroLaudo ?? ""}`}
        laudoInicial={filtroLaudo}
        buscaInicial={busca}
        cidadeInicial={cidade}
        segmentoInicial={segmento}
        situacaoInicial={situacao}
        mostrarDesativadosInicial={mostrarDesativados}
        cidades={cidades}
        segmentos={segmentos}
        contagens={contagens}
        podeMostrarDesativados={ctx.perfil === "ADMIN"}
        total={clientes.length}
      />

      {clientes.length === 0 ? (
        <Vazio
          titulo={comFiltro ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}
          descricao={comFiltro ? "Nenhum cliente encontrado para esse filtro." : "Cadastre o primeiro para começar a acompanhar prazos e projetos ambientais."}
        />
      ) : (
        <TabelaLista rotulo="Tabela de clientes" colunas={colunas}>
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
                <CelulaLista rotulo="Projetos ativos">
                  <span className={`tabular-nums ${cliente.projetosAtivos === 0 ? "text-faint" : "text-ink"}`}>{cliente.projetosAtivos}</span>
                </CelulaLista>
                <CelulaLista rotulo="Portal do cliente">
                  <StatusPonto status={STATUS_DO_PORTAL[cliente.portal]}>{ROTULO_STATUS_PORTAL[cliente.portal]}</StatusPonto>
                </CelulaLista>
                {mostrarDesativados && (
                  <CelulaLista rotulo="Situação">
                    <StatusPonto status={cliente.ativo ? "CONCLUIDO" : "CANCELADO"}>{cliente.ativo ? "Ativo" : "Desativado"}</StatusPonto>
                  </CelulaLista>
                )}
              </LinhaLista>
            );
          })}
        </TabelaLista>
      )}
    </div>
  );
}
