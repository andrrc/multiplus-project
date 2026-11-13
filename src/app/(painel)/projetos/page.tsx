/**
 * Página da rota `src/app/(painel)/projetos/page.tsx`. Recebe os parâmetros da URL ou da rota, valida o acesso no servidor, obtém os dados necessários e compõe a resposta visual; as regras de negócio permanecem nas funções de domínio chamadas por ela.
 */
import Link from "next/link";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { listarProjetos } from "@/lib/projetos-tarefas";
import { formatarMoeda } from "@/lib/formatacao";
import { buscarLimitesSemaforo } from "@/lib/semaforo";
import { calcularPercentualConclusao } from "@/lib/regras-projetos-tarefas";
import { calcularDiasRestantes } from "@/lib/datas";
import { contarSituacoes, interpretarSituacao, rotulosSituacao, situacaoDoPrazo } from "@/lib/situacao-prazo";
import { codigoProjeto } from "@/lib/identificadores-hierarquicos";
import { botaoPrimario } from "@/ui/botoes";
import { CelulaLista, CelulaPrazo, CodigoLinha, LinhaLista, LinkSecundario, ProgressoBarra, StatusPonto, TabelaLista, TextoPrincipal, TituloLinha, Vazio } from "@/ui/lista";
import { FiltrosProjetos } from "./filtros-projetos";

const status: Record<string, string> = { A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", CANCELADO: "Cancelado" };

const COLUNAS = [
  { titulo: "Projeto", largura: "25%" },
  { titulo: "Cliente", largura: "16%" },
  { titulo: "Proposta", largura: "9%" },
  { titulo: "Valor contratado", largura: "13%" },
  { titulo: "Progresso", largura: "13%" },
  { titulo: "Prazo", largura: "12%" },
  { titulo: "Status", largura: "12%" },
];

export default async function ProjetosPage({ searchParams }: { searchParams: Promise<{ desativados?: string; busca?: string; situacao?: string | string[] }> }) {
  const ctx = await exigirAcessoARota("/projetos");
  const { desativados, busca, situacao: situacaoParametro } = await searchParams;
  const incluir = desativados === "1";
  const [projetos, limites] = await Promise.all([listarProjetos(ctx, incluir, busca), buscarLimitesSemaforo(ctx)]);

  // Cada projeto recebe sua situação de prazo; as contagens dos botões usam a lista antes desse filtro.
  const situacaoFiltro = interpretarSituacao(situacaoParametro);
  const itens = projetos.map((projeto) => ({
    projeto,
    situacao: situacaoDoPrazo(
      { diasRestantes: projeto.dataPrevistaConclusao ? calcularDiasRestantes(projeto.dataPrevistaConclusao) : null, fechado: projeto.status === "CONCLUIDO" || projeto.status === "CANCELADO" || !projeto.ativo },
      limites.diasAmareloAte,
    ),
  }));
  const contagens = contarSituacoes(itens.map((item) => item.situacao));
  // Projetos abertos vêm antes dos concluídos, cancelados e desativados, mantendo a ordem da consulta.
  const visiveis = (situacaoFiltro === "todos" ? itens : itens.filter((item) => item.situacao === situacaoFiltro))
    .sort((a, b) => Number(a.situacao === "fechado") - Number(b.situacao === "fechado"));

  return (
    <div className="w-full max-w-[1280px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl">Projetos</h1>
        <Link href="/projetos/novo" className={botaoPrimario}>+ Novo projeto</Link>
      </div>

      <FiltrosProjetos
        key={`${busca ?? ""}|${situacaoFiltro}|${incluir}`}
        buscaInicial={busca ?? ""}
        desativadosInicial={incluir}
        situacaoInicial={situacaoFiltro}
        rotulosSituacao={rotulosSituacao(limites.diasAmareloAte)}
        contagens={contagens}
        total={visiveis.length}
      />

      {visiveis.length === 0 ? (
        <Vazio titulo="Nenhum projeto encontrado." descricao="Ajuste a busca ou os filtros, ou cadastre um projeto para acompanhar prazos ambientais." />
      ) : (
        <TabelaLista rotulo="Tabela de projetos" colunas={COLUNAS}>
          {visiveis.map(({ projeto: p }) => {
            const conclusao = calcularPercentualConclusao(p.tarefas);
            return (
              <LinhaLista key={p.id}>
                <CelulaLista larga>
                  <TituloLinha href={`/projetos/${p.id}`}>{p.nome}</TituloLinha>
                  <CodigoLinha>{codigoProjeto(p.cliente.numeroIdentificacao, p.numeroLocal)}</CodigoLinha>
                </CelulaLista>
                <CelulaLista larga>
                  <TextoPrincipal><LinkSecundario href={`/clientes/${p.cliente.id}`}>{p.cliente.razaoSocial}</LinkSecundario></TextoPrincipal>
                </CelulaLista>
                <CelulaLista rotulo="Proposta">
                  {p.numeroProposta ? <span className="tabular-nums">{p.numeroProposta}</span> : <span className="text-faint">Não informada</span>}
                </CelulaLista>
                <CelulaLista rotulo="Valor" alinharADireita>
                  {p.valorContratado
                    ? <span className="whitespace-nowrap tabular-nums">{formatarMoeda(p.valorContratado.valorContratado)}</span>
                    : <span className="text-faint">Não informado</span>}
                </CelulaLista>
                <CelulaLista rotulo="Progresso"><ProgressoBarra concluidas={conclusao.concluidas} total={conclusao.total} /></CelulaLista>
                <CelulaLista rotulo="Prazo"><CelulaPrazo prazo={p.dataPrevistaConclusao} status={p.status} ativo={p.ativo} limites={limites} /></CelulaLista>
                <CelulaLista rotulo="Status">
                  <StatusPonto status={p.ativo ? p.status : "CANCELADO"}>{p.ativo ? status[p.status] : "Desativado"}</StatusPonto>
                </CelulaLista>
              </LinhaLista>
            );
          })}
        </TabelaLista>
      )}
    </div>
  );
}
