/**
 * Painel (protótipo 02-painel da administradora): resumo do dia com o que está atrasado, o que vence
 * nos próximos dias, as conclusões aguardando confirmação e os projetos em andamento. Usa só as
 * consultas que já existem; não cria dados novos.
 */
import Link from "next/link";
import { auth } from "@/server/auth";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { PainelInterno } from "./painel-interno";
import { listarPrazos, listarProjetos, listarSolicitacoesConclusaoPendentes, listarSubtarefasPrazos } from "@/lib/projetos-tarefas";
import { buscarLimitesSemaforo, type LimitesSemaforo } from "@/lib/semaforo";
import { calcularPercentualConclusao } from "@/lib/regras-projetos-tarefas";
import { agruparPorDia, percentualEmDia, separarItensPainel, type ItemPainel, type ItemPainelComDias } from "@/lib/painel";
import { decidirSolicitacaoConclusaoFormAction } from "@/app/(painel)/projetos/actions";
import { IndicadorSemaforoProjeto } from "@/ui/indicador-dias-restantes";
import { botaoDiscretoPequeno, botaoPrimarioPequeno } from "@/ui/botoes";
import { Cartao } from "@/ui/cartao";

const DIAS_ADIANTE = 7;
const STATUS_TAREFA: Record<string, string> = { A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", AGUARDANDO_DOCUMENTO_CLIENTE: "Aguardando documento do cliente", VISITA_REUNIAO_AGENDADA: "Visita/reunião agendada", PROTOCOLADO: "Protocolado", SOB_ANALISE_ORGAO_AMBIENTAL: "Sob análise do órgão", COM_EXIGENCIA_A_CUMPRIR: "Com exigência a cumprir" };

const dataLonga = (agora: Date) => {
  const texto = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" }).format(agora);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};
const diaCurto = (d: Date) => new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(d);
const dataBr = (d: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(d);

function LinhaItem({ item, limites }: { item: ItemPainelComDias; limites: LimitesSemaforo }) {
  return (
    <li className="relative grid gap-1.5 border-t border-linha px-5 py-3.5 first:border-t-0 hover:bg-cabecalho sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-5">
      <div className="min-w-0">
        <p className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.04em] text-faint">{item.visita ? "Visita" : item.tipo}</span>
          <Link href={item.href} className="truncate font-medium text-ink before:absolute before:inset-0 before:content-[''] hover:text-azul-esc">{item.titulo}</Link>
        </p>
        <p className="mt-px truncate text-[12.5px] text-cinza">{item.contexto}{item.responsavel ? ` · ${item.responsavel}` : ""}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
        <span className="text-xs text-cinza">{item.statusRotulo}</span>
        <IndicadorSemaforoProjeto prazo={item.prazo} status="EM_ANDAMENTO" limites={limites} />
      </div>
    </li>
  );
}

export default async function PainelPage() {
  const ctx = await exigirAcessoARota("/painel");
  // O colaborador interno tem um painel próprio, com o que está atribuído a ele.
  if (ctx.perfil === "ADMIN_INTERNO") {
    const sessao = await auth();
    return <PainelInterno ctx={ctx} nome={sessao?.user?.name ?? ""} />;
  }
  const agora = new Date();
  const [tarefas, subtarefas, solicitacoes, projetos, limites] = await Promise.all([
    listarPrazos(ctx, { pendentes: true }),
    listarSubtarefasPrazos(ctx, { pendentes: true }),
    listarSolicitacoesConclusaoPendentes(ctx),
    listarProjetos(ctx),
    buscarLimitesSemaforo(ctx),
  ]);

  const itens: ItemPainel[] = [
    ...tarefas.map((t): ItemPainel => ({
      id: t.id, tipo: "Tarefa", titulo: t.nome, href: `/tarefas/${t.id}`,
      contexto: `${t.projeto.cliente.razaoSocial} · ${t.projeto.nome}`,
      responsavel: t.responsavel?.nome ?? t.responsavelUsuario?.nome ?? null,
      prazo: t.prazo, statusRotulo: STATUS_TAREFA[t.status] ?? t.status, visita: t.status === "VISITA_REUNIAO_AGENDADA",
    })),
    ...subtarefas.map((s): ItemPainel => ({
      id: s.id, tipo: "Subtarefa", titulo: s.titulo, href: `/tarefas/${s.tarefa.id}?subtarefa=${s.id}`,
      contexto: `${s.tarefa.projeto.cliente.razaoSocial} · ${s.tarefa.projeto.nome}`,
      responsavel: s.atribuidoA?.nome ?? s.atribuidoAUsuario?.nome ?? null,
      prazo: s.prazo, statusRotulo: "Em andamento", visita: false,
    })),
  ];
  const { atrasados, proximos } = separarItensPainel(itens, DIAS_ADIANTE, agora);
  const emDia = percentualEmDia(itens.length, atrasados.length);
  const gruposProximos = agruparPorDia(proximos as Array<ItemPainelComDias & { prazo: Date }>);
  const emAndamento = projetos.filter((p) => p.ativo && p.status === "EM_ANDAMENTO");

  const indicadores = [
    { rotulo: "Atrasados", valor: String(atrasados.length), cor: atrasados.length > 0 ? "text-critico" : "text-ink", detalhe: "tarefas e subtarefas vencidas", href: "/tarefas?situacao=atrasado" },
    { rotulo: `Vencem em ${DIAS_ADIANTE} dias`, valor: String(proximos.length), cor: proximos.length > 0 ? "text-ambar" : "text-ink", detalhe: "veja na agenda", href: "/agenda" },
    { rotulo: "Aguardando sua confirmação", valor: String(solicitacoes.length), cor: "text-ink", detalhe: "conclusões enviadas", href: "#confirmacoes" },
    { rotulo: "Itens em dia", valor: emDia === null ? "—" : `${emDia}%`, cor: "text-ink", detalhe: `${itens.length - atrasados.length} de ${itens.length} itens abertos`, href: "/subtarefas" },
  ];

  return (
    <div className="w-full max-w-[1280px]">
      <div className="mb-6">
        <h1 className="text-2xl">Painel</h1>
        <p className="mt-1 text-sm text-cinza">{dataLonga(agora)}</p>
      </div>

      <section aria-label="Indicadores" className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {indicadores.map((indicador) => (
          <Link key={indicador.rotulo} href={indicador.href} className="block rounded-cartao border border-linha bg-branco px-5 py-[18px] hover:border-linha-forte hover:shadow-sm">
            <p className="text-[13px] font-medium text-cinza">{indicador.rotulo}</p>
            <p className={`mt-2 text-[30px] font-semibold leading-tight tabular-nums ${indicador.cor}`}>{indicador.valor}</p>
            <p className="mt-1 text-[13px] text-cinza">{indicador.detalhe}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          {solicitacoes.length > 0 && (
            <Cartao id="confirmacoes" titulo={<>Aguardando sua confirmação <span className="rounded-full bg-papel px-2 py-px text-xs font-semibold tabular-nums text-ink">{solicitacoes.length}</span></>} semMargem>
              <ul>
                {solicitacoes.map((pedido) => {
                  const ehTarefa = !!pedido.tarefa;
                  const titulo = pedido.tarefa?.nome ?? pedido.subtarefa?.titulo ?? "Item";
                  const tarefaId = pedido.tarefa?.id ?? pedido.subtarefa?.tarefa.id;
                  const projeto = pedido.tarefa?.projeto ?? pedido.subtarefa?.tarefa.projeto;
                  const href = tarefaId ? `/tarefas/${tarefaId}${ehTarefa ? "" : `?subtarefa=${pedido.subtarefaId}`}` : "/subtarefas";
                  return (
                    <li key={pedido.id} className="grid gap-3 border-t border-linha px-5 py-3.5 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-5">
                      <div className="min-w-0">
                        <p className="flex min-w-0 items-baseline gap-2">
                          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.04em] text-faint">{ehTarefa ? "Tarefa" : "Subtarefa"}</span>
                          <Link href={href} className="truncate font-medium text-ink hover:text-azul-esc">{titulo}</Link>
                        </p>
                        <p className="mt-px truncate text-[12.5px] text-cinza">{projeto?.cliente.razaoSocial} · {projeto?.nome}</p>
                        <p className="mt-0.5 text-xs text-cinza">Enviado por {pedido.solicitadoPor?.nome ?? pedido.solicitadoPorNome}</p>
                      </div>
                      <form action={decidirSolicitacaoConclusaoFormAction.bind(null, pedido.id)} className="flex flex-wrap items-center gap-1.5">
                        <button name="decisao" value="REJEITAR" className={botaoDiscretoPequeno}>Rejeitar</button>
                        <button name="decisao" value="APROVAR" className={botaoPrimarioPequeno}>Confirmar</button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            </Cartao>
          )}

          <Cartao
            titulo={<>Atrasados <span className="rounded-full bg-critico-cl px-2 py-px text-xs font-semibold tabular-nums text-critico">{atrasados.length}</span></>}
            semMargem
            acao={atrasados.length > 0 ? <Link href="/tarefas?situacao=atrasado" className="text-[13px] font-medium text-azul-esc hover:underline">Ver todos</Link> : undefined}
          >
            {atrasados.length === 0 ? <p className="px-5 py-8 text-center text-sm text-cinza">Nada atrasado. Tudo em dia.</p> : <ul>{atrasados.slice(0, 5).map((item) => <LinhaItem key={`${item.tipo}-${item.id}`} item={item} limites={limites} />)}</ul>}
          </Cartao>

          <Cartao
            titulo={<>Vencem nos próximos {DIAS_ADIANTE} dias <span className="rounded-full bg-ambar-cl px-2 py-px text-xs font-semibold tabular-nums text-ambar">{proximos.length}</span></>}
            semMargem
            acao={<Link href="/agenda" className="text-[13px] font-medium text-azul-esc hover:underline">Abrir agenda</Link>}
          >
            {proximos.length === 0 ? <p className="px-5 py-8 text-center text-sm text-cinza">Nada vence nos próximos {DIAS_ADIANTE} dias.</p> : gruposProximos.map((grupo) => (
              <section key={grupo.dia.toISOString()} aria-label={diaCurto(grupo.dia)}>
                <h3 className="border-t border-linha bg-cabecalho px-5 py-2 text-xs font-semibold uppercase tracking-[0.04em] text-faint first:border-t-0">{diaCurto(grupo.dia)}</h3>
                <ul>{grupo.itens.map((item) => <LinhaItem key={`${item.tipo}-${item.id}`} item={item} limites={limites} />)}</ul>
              </section>
            ))}
          </Cartao>
        </div>

        <Cartao
          titulo="Projetos em andamento"
          semMargem
          acao={<Link href="/projetos" className="text-[13px] font-medium text-azul-esc hover:underline">Ver todos</Link>}
        >
          {emAndamento.length === 0 ? <p className="px-5 py-8 text-center text-sm text-cinza">Nenhum projeto em andamento.</p> : (
            <ul>
              {emAndamento.slice(0, 6).map((p) => {
                const conclusao = calcularPercentualConclusao(p.tarefas);
                return (
                  <li key={p.id} className="relative border-t border-linha px-5 py-3.5 first:border-t-0 hover:bg-cabecalho">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/projetos/${p.id}`} className="block truncate font-medium text-ink before:absolute before:inset-0 before:content-[''] hover:text-azul-esc">{p.nome}</Link>
                        <p className="mt-px truncate text-[12.5px] text-cinza">{p.cliente.razaoSocial}</p>
                      </div>
                      <IndicadorSemaforoProjeto prazo={p.dataPrevistaConclusao} status={p.status} limites={limites} />
                    </div>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-linha" role="img" aria-label={conclusao.total ? `${conclusao.concluidas} de ${conclusao.total} tarefas concluídas` : "Sem tarefas ativas"}>
                      <span className="block h-full bg-verde" style={{ width: `${conclusao.percentual ?? 0}%` }} />
                    </div>
                    <p className="mt-1.5 flex justify-between gap-3 text-xs tabular-nums text-cinza">
                      <span>{conclusao.total ? `${conclusao.concluidas} de ${conclusao.total} tarefas` : "Sem tarefas ativas"}</span>
                      {p.dataPrevistaConclusao && <span>prazo {dataBr(p.dataPrevistaConclusao)}</span>}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Cartao>
      </div>
    </div>
  );
}
