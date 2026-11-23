/**
 * Agenda da administração (protótipo 09-agenda): calendário mensal ou lista dos prazos de todos os projetos, com filtros
 * de cliente, projeto e visitas. A apresentação é a de `visao-agenda.tsx`, compartilhada com `/minha-agenda`.
 */
import { exigirAcessoARota } from "@/server/auth/contexto";
import { contarAtrasadosAnterioresAgenda, listarClientesParaProjeto, listarItensAgenda, listarProjetos, listarResponsaveisParaFiltro } from "@/lib/projetos-tarefas";
import { buscarLimitesSemaforo } from "@/lib/semaforo";
import { FiltrosAgenda } from "./filtros-agenda";
import { intervaloDoMes, VisaoAgenda, type ParametrosAgenda } from "./visao-agenda";

export default async function AgendaPage({ searchParams }: { searchParams: Promise<ParametrosAgenda> }) {
  const ctx = await exigirAcessoARota("/agenda");
  const filtros = await searchParams;
  const periodo = intervaloDoMes(filtros.mes);
  // Carrega itens, opções de filtro e limites do semáforo em paralelo.
  const [itens, projetos, clientes, limites, responsaveis, totalAtrasadosAnteriores] = await Promise.all([
    listarItensAgenda(ctx, periodo.inicio, periodo.fim, { projetoId: filtros.projeto, clienteId: filtros.cliente, responsavel: filtros.responsavel, visitas: filtros.visitas === "1" }),
    listarProjetos(ctx),
    listarClientesParaProjeto(ctx),
    buscarLimitesSemaforo(ctx),
    listarResponsaveisParaFiltro(ctx, "tarefas", { projetoId: filtros.projeto, clienteId: filtros.cliente, pendentes: false }),
    contarAtrasadosAnterioresAgenda(ctx, periodo.inicio, { projetoId: filtros.projeto, clienteId: filtros.cliente, responsavel: filtros.responsavel, visitas: filtros.visitas === "1" }),
  ]);
  // "Ver atrasados" abre a lista de tarefas atrasadas, com os mesmos filtros de cliente, projeto e responsável.
  const parametrosAtrasados = new URLSearchParams({ situacao: "atrasado" });
  if (filtros.cliente) parametrosAtrasados.set("cliente", filtros.cliente);
  if (filtros.projeto) parametrosAtrasados.set("projeto", filtros.projeto);
  if (typeof filtros.responsavel === "string" && filtros.responsavel) parametrosAtrasados.set("responsavel", filtros.responsavel);
  // Valor repetido na URL (lista) não é um responsável válido: a consulta devolve nada e o seletor mostra "Filtro inválido".
  const responsavelInicial = typeof filtros.responsavel === "string" ? filtros.responsavel : filtros.responsavel ? "invalido" : "";
  const visao = filtros.visao === "lista" ? "lista" : "mes";

  return (
    <VisaoAgenda
      rotaBase="/agenda"
      hrefTarefa={(tarefaId) => `/tarefas/${tarefaId}`}
      itens={itens}
      diasAmareloAte={limites.diasAmareloAte}
      parametros={filtros}
      periodo={periodo}
      atrasadosAnteriores={{ total: totalAtrasadosAnteriores, href: `/tarefas?${parametrosAtrasados}` }}
      filtrosUi={
        <FiltrosAgenda
          key={`${filtros.cliente ?? ""}|${filtros.projeto ?? ""}|${responsavelInicial}|${filtros.visitas ?? ""}|${filtros.mes ?? ""}|${visao}`}
          mes={filtros.mes}
          visao={visao}
          clienteInicial={filtros.cliente ?? ""}
          projetoInicial={filtros.projeto ?? ""}
          responsavelInicial={responsavelInicial}
          responsaveis={responsaveis}
          apenasVisitasInicial={filtros.visitas === "1"}
          clientes={clientes.map(({ id, razaoSocial }) => ({ id, razaoSocial }))}
          projetos={projetos.map(({ id, nome }) => ({ id, nome }))}
        />
      }
    />
  );
}
