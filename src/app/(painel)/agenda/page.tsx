/**
 * Agenda da administração (protótipo 09-agenda): calendário mensal ou lista dos prazos de todos os projetos, com filtros
 * de cliente, projeto e visitas. A apresentação é a de `visao-agenda.tsx`, compartilhada com `/minha-agenda`.
 */
import { exigirAcessoARota } from "@/server/auth/contexto";
import { listarClientesParaProjeto, listarItensAgenda, listarProjetos } from "@/lib/projetos-tarefas";
import { buscarLimitesSemaforo } from "@/lib/semaforo";
import { FiltrosAgenda } from "./filtros-agenda";
import { intervaloDoMes, VisaoAgenda, type ParametrosAgenda } from "./visao-agenda";

export default async function AgendaPage({ searchParams }: { searchParams: Promise<ParametrosAgenda> }) {
  const ctx = await exigirAcessoARota("/agenda");
  const filtros = await searchParams;
  const periodo = intervaloDoMes(filtros.mes);
  // Carrega itens, opções de filtro e limites do semáforo em paralelo.
  const [itens, projetos, clientes, limites] = await Promise.all([
    listarItensAgenda(ctx, periodo.inicio, periodo.fim, { projetoId: filtros.projeto, clienteId: filtros.cliente, visitas: filtros.visitas === "1" }),
    listarProjetos(ctx),
    listarClientesParaProjeto(ctx),
    buscarLimitesSemaforo(ctx),
  ]);
  const visao = filtros.visao === "lista" ? "lista" : "mes";

  return (
    <VisaoAgenda
      rotaBase="/agenda"
      hrefTarefa={(tarefaId) => `/tarefas/${tarefaId}`}
      itens={itens}
      diasAmareloAte={limites.diasAmareloAte}
      parametros={filtros}
      periodo={periodo}
      filtrosUi={
        <FiltrosAgenda
          key={`${filtros.cliente ?? ""}|${filtros.projeto ?? ""}|${filtros.visitas ?? ""}|${filtros.mes ?? ""}|${visao}`}
          mes={filtros.mes}
          visao={visao}
          clienteInicial={filtros.cliente ?? ""}
          projetoInicial={filtros.projeto ?? ""}
          apenasVisitasInicial={filtros.visitas === "1"}
          clientes={clientes.map(({ id, razaoSocial }) => ({ id, razaoSocial }))}
          projetos={projetos.map(({ id, nome }) => ({ id, nome }))}
        />
      }
    />
  );
}
