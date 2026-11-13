/**
 * Agenda do colaborador interno (protótipo interno/07-agenda): os prazos das tarefas dos projetos a que ele tem acesso,
 * em modo só de leitura e sem os filtros da administração. A consulta (`listarItensAgendaColaborador`) usa a RLS do
 * perfil, então só entram tarefas do escopo dele; esta página não amplia nada.
 */
import { exigirAcessoARota } from "@/server/auth/contexto";
import { listarItensAgendaColaborador } from "@/lib/projetos-tarefas";
import { buscarLimitesSemaforo } from "@/lib/semaforo";
import { intervaloDoMes, VisaoAgenda, type ParametrosAgenda } from "../agenda/visao-agenda";

export default async function MinhaAgendaPage({ searchParams }: { searchParams: Promise<ParametrosAgenda> }) {
  const ctx = await exigirAcessoARota("/minha-agenda");
  const parametros = await searchParams;
  const periodo = intervaloDoMes(parametros.mes);
  const [itens, limites] = await Promise.all([listarItensAgendaColaborador(ctx, periodo.inicio, periodo.fim), buscarLimitesSemaforo(ctx)]);
  // Os filtros de cliente, projeto e visita da administração não valem aqui.
  return (
    <VisaoAgenda
      rotaBase="/minha-agenda"
      hrefTarefa={(tarefaId) => `/minhas-tarefas/${tarefaId}`}
      itens={itens}
      diasAmareloAte={limites.diasAmareloAte}
      parametros={{ mes: parametros.mes, visao: parametros.visao, dia: parametros.dia }}
      periodo={periodo}
    />
  );
}
