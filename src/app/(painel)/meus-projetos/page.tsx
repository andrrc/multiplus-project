import Link from "next/link";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { listarProjetosAtribuidos } from "@/lib/projetos-tarefas";
import { IndicadorSemaforoProjeto } from "@/ui/indicador-dias-restantes";
import { buscarLimitesSemaforo } from "@/lib/semaforo";
import { calcularPercentualConclusao } from "@/lib/regras-projetos-tarefas";
import { codigoProjeto } from "@/lib/identificadores-hierarquicos";
import { AnelProgresso, StatusPonto, Vazio } from "@/ui/lista";
import { interpretarBuscaLista } from "@/lib/busca-lista";
import { interpretarOrdemMeusProjetos, interpretarSituacaoMeusProjetos, prepararMeusProjetos, tarefaEmAberto } from "@/lib/lista-meus-projetos";
import { FiltrosMeusProjetos } from "./filtros-meus-projetos";

const status: Record<string, string> = { A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", CANCELADO: "Cancelado" };
const data = (v: Date | null) => v ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(v) : null;

export default async function MeusProjetosPage({ searchParams }: { searchParams: Promise<{ busca?: string | string[]; cliente?: string; situacao?: string | string[]; ordem?: string | string[] }> }) {
  const ctx = await exigirAcessoARota("/meus-projetos");
  const parametros = await searchParams;
  const [projetos, limites] = await Promise.all([listarProjetosAtribuidos(ctx), buscarLimitesSemaforo(ctx)]);

  // Busca, cliente, aba e ordem valem sobre os projetos que a RLS já entregou a este colaborador.
  const busca = interpretarBuscaLista(parametros.busca);
  const situacao = interpretarSituacaoMeusProjetos(parametros.situacao);
  const ordem = interpretarOrdemMeusProjetos(parametros.ordem);
  const clienteId = typeof parametros.cliente === "string" ? parametros.cliente : "";
  const { contagens, visiveis } = prepararMeusProjetos(projetos, { busca, clienteId, situacao, ordem });
  const clientes = [...new Map(projetos.map((p) => [p.clienteId, p.cliente.razaoSocial])).entries()]
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <div className="w-full max-w-[1280px]">
      <h1 className="text-2xl">Meus projetos</h1>
      <p className="mt-1 text-sm text-cinza">Projetos em que você tem uma tarefa ou subtarefa atribuída.</p>
      <FiltrosMeusProjetos
        key={`${clienteId}|${situacao}|${ordem}`}
        buscaInicial={busca}
        clienteInicial={clienteId}
        situacaoInicial={situacao}
        ordemInicial={ordem}
        clientes={clientes}
        contagens={contagens}
        total={visiveis.length}
      />

      {visiveis.length === 0 ? (
        <Vazio
          titulo={projetos.length === 0 ? "Nenhum projeto por enquanto." : "Nenhum projeto nesta seleção."}
          descricao={projetos.length === 0 ? "Quando uma tarefa ou subtarefa for atribuída a você, o projeto aparece aqui." : "Ajuste a busca, o cliente ou a aba."}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {visiveis.map((p) => {
            const conclusao = calcularPercentualConclusao(p.tarefas);
            const abertas = p.tarefas.filter(tarefaEmAberto);
            // A próxima entrega é a tarefa em aberto com o prazo mais próximo.
            const proxima = abertas.filter((t) => t.prazo).sort((a, b) => a.prazo!.getTime() - b.prazo!.getTime())[0];
            return (
              <li key={p.id} className="relative min-w-0 rounded-cartao border border-linha bg-branco hover:border-linha-forte">
                <div className="flex items-start justify-between gap-4 px-5 pt-[18px]">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2.5 text-[13px] text-cinza">
                      <span className="truncate">{p.cliente.razaoSocial}</span>
                      <StatusPonto status={p.status}>{status[p.status] ?? p.status}</StatusPonto>
                    </p>
                    <h2 className="mt-1 break-words text-base font-semibold">
                      <Link href={`/meus-projetos/${p.id}`} className="before:absolute before:inset-0 before:content-[''] hover:text-azul-esc">{p.nome}</Link>
                    </h2>
                    <p className="mt-0.5 text-xs tabular-nums text-faint">{codigoProjeto(p.cliente.numeroIdentificacao, p.numeroLocal)}</p>
                  </div>
                  <AnelProgresso percentual={conclusao.percentual} />
                </div>
                <p className="flex flex-wrap items-center gap-2 px-5 pb-4 pt-2.5 text-[13px] text-cinza">
                  Prazo
                  {p.dataPrevistaConclusao ? <b className="font-semibold tabular-nums text-ink">{data(p.dataPrevistaConclusao)}</b> : <span className="text-faint">sem previsão</span>}
                  <IndicadorSemaforoProjeto prazo={p.dataPrevistaConclusao} status={p.status} limites={limites} />
                </p>
                <dl className="grid grid-cols-3 border-t border-linha">
                  {[
                    { rotulo: "Minhas pendências", valor: p.minhasPendencias, alerta: false },
                    { rotulo: "Minhas atrasadas", valor: p.minhasAtrasadas, alerta: p.minhasAtrasadas > 0 },
                    { rotulo: "Abertas na equipe", valor: abertas.length, alerta: false },
                  ].map((numero) => (
                    <div key={numero.rotulo} className="min-w-0 border-l border-linha px-3.5 py-3 first:border-l-0">
                      <dt className="truncate text-xs text-cinza">{numero.rotulo}</dt>
                      <dd className={`mt-0.5 text-xl font-semibold tabular-nums ${numero.alerta ? "text-critico" : numero.valor === 0 ? "text-faint" : "text-ink"}`}>{numero.valor}</dd>
                    </div>
                  ))}
                </dl>
                <div className="flex items-center justify-between gap-3 border-t border-linha px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-xs text-cinza">Próxima entrega</p>
                    <p className="truncate text-[13.5px] font-medium">{proxima ? proxima.nome : <span className="font-normal text-faint">Nenhuma tarefa em aberto</span>}</p>
                  </div>
                  {proxima && <IndicadorSemaforoProjeto prazo={proxima.prazo} status={proxima.status} limites={limites} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
