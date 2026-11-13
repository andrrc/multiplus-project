import Link from "next/link";
import { calcularDiasRestantes, dataDeHojeEmSaoPaulo } from "@/lib/datas";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { listarClientesParaProjeto, listarItensAgenda, listarProjetos } from "@/lib/projetos-tarefas";
import { buscarLimitesSemaforo } from "@/lib/semaforo";
import { classeDoItemAgenda, COR_BARRA_AGENDA, COR_ITEM_AGENDA, ROTULO_CLASSE_AGENDA } from "@/lib/agenda-itens";
import { botaoSecundario } from "@/ui/botoes";
import { Cartao } from "@/ui/cartao";
import { FiltrosAgenda } from "./filtros-agenda";

const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const semana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const diasPorExtenso = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const dataCurta = (v: Date) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(v);
const dataLonga = (v: Date) => `${new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(v)} · ${diasPorExtenso[v.getUTCDay()]}`;
// Aceita somente ano-mês válido; parâmetros ausentes ou malformados caem no mês atual.
const dataMes = (valor: string | undefined, agora: Date) => { if (!valor || !/^\d{4}-\d{2}$/.test(valor)) return { ano: agora.getUTCFullYear(), mes: agora.getUTCMonth() }; const [ano, mes] = valor.split("-").map(Number); return { ano, mes: Math.min(11, Math.max(0, mes - 1)) }; };

const SETA_ESQUERDA = <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>;
const SETA_DIREITA = <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>;
const classeNavegacao = "flex size-11 items-center justify-center rounded-controle border border-linha-forte bg-branco text-ink hover:bg-papel md:size-9";

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ mes?: string; projeto?: string; cliente?: string; visitas?: string; visao?: string; dia?: string }> }) {
  // Usa o dia civil de São Paulo para destacar hoje, ainda que o processo rode em outro fuso.
  const hoje = new Date(); const hojeCivil = new Date(dataDeHojeEmSaoPaulo(hoje));
  // Constrói o intervalo mensal em UTC e carrega itens, opções de filtro e cliente em paralelo.
  const ctx = await exigirAcessoARota("/agenda"); const filtros = await searchParams; const atual = dataMes(filtros.mes, hojeCivil); const inicio = new Date(Date.UTC(atual.ano, atual.mes, 1)); const fim = new Date(Date.UTC(atual.ano, atual.mes + 1, 0, 23, 59, 59));
  const [itens, projetos, clientes, limites] = await Promise.all([listarItensAgenda(ctx, inicio, fim, { projetoId: filtros.projeto, clienteId: filtros.cliente, visitas: filtros.visitas === "1" }), listarProjetos(ctx), listarClientesParaProjeto(ctx), buscarLimitesSemaforo(ctx)]);
  // Gera células suficientes para semanas completas e agrupa compromissos pelo dia do mês.
  const primeiroDia = inicio.getUTCDay(); const quantidadeDias = fim.getUTCDate(); const celulas = Array.from({ length: Math.ceil((primeiroDia + quantidadeDias) / 7) * 7 }, (_, i) => i - primeiroDia + 1); const porDia = new Map<number, typeof itens>(); for (const item of itens) { const dia = item.prazo.getUTCDate(); porDia.set(dia, [...(porDia.get(dia) ?? []), item]); }

  const visao = filtros.visao === "lista" ? "lista" : "mes";
  const classeDe = (item: (typeof itens)[number]) => classeDoItemAgenda(item, calcularDiasRestantes(item.prazo, hoje), limites.diasAmareloAte);
  // Dia aberto no painel: o escolhido na URL, ou hoje quando o mês exibido é o atual.
  const diaEscolhido = Number(filtros.dia);
  const mesAtualExibido = hojeCivil.getUTCFullYear() === atual.ano && hojeCivil.getUTCMonth() === atual.mes;
  const diaSelecionado = Number.isInteger(diaEscolhido) && diaEscolhido >= 1 && diaEscolhido <= quantidadeDias ? diaEscolhido : mesAtualExibido ? hojeCivil.getUTCDate() : null;

  // Links preservam o mês, os filtros e a visualização ao navegar.
  const href = (opcoes: { data?: Date; visao?: string; dia?: number }) => {
    const d = opcoes.data ?? inicio;
    const parametros = new URLSearchParams({ mes: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}` });
    if (filtros.cliente) parametros.set("cliente", filtros.cliente);
    if (filtros.projeto) parametros.set("projeto", filtros.projeto);
    if (filtros.visitas) parametros.set("visitas", "1");
    if ((opcoes.visao ?? visao) === "lista") parametros.set("visao", "lista");
    if (opcoes.dia) parametros.set("dia", String(opcoes.dia));
    return `/agenda?${parametros}`;
  };
  const anterior = new Date(Date.UTC(atual.ano, atual.mes - 1, 1)); const proximo = new Date(Date.UTC(atual.ano, atual.mes + 1, 1));

  const listaPorDia = (
    <div className="overflow-hidden rounded-cartao border border-linha bg-branco">
      {Array.from(porDia.entries()).sort(([a], [b]) => a - b).map(([dia, doDia]) => (
        <section key={dia} aria-label={`Prazos em ${dataCurta(doDia[0].prazo)}`}>
          <h3 className="border-t border-linha bg-cabecalho px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-faint first:border-t-0">{dataLonga(doDia[0].prazo)}</h3>
          <ul>
            {doDia.map((item) => {
              const classe = classeDe(item);
              return (
                <li key={item.id} className="grid grid-cols-[4px_minmax(0,1fr)] gap-3 border-t border-linha px-5 py-3 first:border-t-0">
                  <span aria-hidden="true" className={`rounded-sm ${COR_BARRA_AGENDA[classe]}`} />
                  <div className="min-w-0">
                    {item.projetada ? <p className="break-words font-medium text-ink">{item.nome}</p> : <Link href={`/tarefas/${item.id}`} className="block break-words font-medium text-ink hover:text-azul-esc">{item.nome}</Link>}
                    <p className="mt-0.5 break-words text-[12.5px] text-cinza">{item.projeto.cliente.razaoSocial} · {item.projeto.nome}</p>
                    <p className="mt-1 text-xs text-cinza">{ROTULO_CLASSE_AGENDA[classe]}{item.responsavel ? ` · ${item.responsavel.nome}` : ""}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );

  const doDiaSelecionado = diaSelecionado ? porDia.get(diaSelecionado) ?? [] : [];

  return <div className="w-full max-w-[1240px]">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><h1 className="text-2xl">Agenda</h1></div>

    <FiltrosAgenda
      key={`${filtros.cliente ?? ""}|${filtros.projeto ?? ""}|${filtros.visitas ?? ""}|${filtros.mes ?? ""}|${visao}`}
      mes={filtros.mes}
      visao={visao}
      clienteInicial={filtros.cliente ?? ""}
      projetoInicial={filtros.projeto ?? ""}
      apenasVisitasInicial={filtros.visitas === "1"}
      clientes={clientes}
      projetos={projetos}
    />

    <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
      <Link href={href({ data: anterior })} aria-label="Mês anterior" className={classeNavegacao}>{SETA_ESQUERDA}</Link>
      <Link href={href({ data: proximo })} aria-label="Próximo mês" className={classeNavegacao}>{SETA_DIREITA}</Link>
      <h2 className="order-first w-full min-w-[170px] text-lg font-semibold md:order-none md:w-auto">{nomesMeses[atual.mes]} {atual.ano}</h2>
      <Link href={href({ data: hojeCivil })} className={botaoSecundario}>Hoje</Link>
      <span className="flex-1" />
      <div role="group" aria-label="Visualização" className="hidden overflow-hidden rounded-controle border border-linha-forte bg-branco md:inline-flex">
        {([["mes", "Mês"], ["lista", "Lista"]] as const).map(([valor, rotulo]) => (
          <Link key={valor} href={href({ visao: valor })} aria-current={visao === valor ? "true" : undefined} className={`inline-flex h-9 items-center px-3.5 text-[13px] hover:bg-papel hover:text-ink ${visao === valor ? "bg-selecionado font-semibold text-ink" : "font-medium text-cinza"}`}>{rotulo}</Link>
        ))}
      </div>
    </div>

    <div className={`grid gap-6 ${visao === "mes" ? "lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start" : ""}`}>
      <div className="min-w-0">
        {visao === "mes" && <div className="hidden overflow-hidden rounded-cartao border border-linha bg-branco md:block">
          <div className="grid grid-cols-7 border-b border-linha bg-cabecalho text-xs font-semibold text-cinza">{semana.map(d => <div key={d} className="px-2.5 py-2">{d}</div>)}</div>
          <div className="grid grid-cols-7">{celulas.map((dia, i) => {
            if (dia < 1 || dia > quantidadeDias) return <div key={`vazio-${i}`} className="min-h-[118px] border-r border-t border-linha bg-cabecalho/60 [&:nth-child(-n+7)]:border-t-0 [&:nth-child(7n)]:border-r-0" />;
            const data = new Date(Date.UTC(atual.ano, atual.mes, dia)); const doDia = porDia.get(dia) ?? []; const hojeCell = data.getTime() === hojeCivil.getTime();
            return <div key={dia} className={`flex min-h-[118px] min-w-0 flex-col gap-[3px] border-r border-t border-linha p-1.5 pb-2 [&:nth-child(-n+7)]:border-t-0 [&:nth-child(7n)]:border-r-0 ${diaSelecionado === dia ? "ring-2 ring-inset ring-azul" : ""}`}>
              <Link href={href({ dia })} aria-label={`Ver o dia ${dia}`} className={`mb-0.5 grid size-6 place-items-center rounded-full text-[12.5px] tabular-nums hover:bg-papel ${hojeCell ? "bg-tinta font-semibold text-branco hover:bg-tinta" : "font-medium text-ink"}`}>{dia}</Link>
              {doDia.slice(0, 3).map(item => {
                const classe = classeDe(item);
                const estilo = `block truncate rounded-selo px-1.5 py-[3px] text-xs leading-tight ${COR_ITEM_AGENDA[classe]}`;
                return item.projetada
                  ? <div key={item.id} className={estilo} title={`${item.nome} — Tarefa recorrente`}>{item.nome}</div>
                  : <Link key={item.id} href={`/tarefas/${item.id}`} title={`${item.nome} — ${item.projeto.cliente.razaoSocial}`} className={`${estilo} hover:brightness-95`}>{item.nome}</Link>;
              })}
              {doDia.length > 3 && <Link href={href({ dia })} className="px-1.5 text-xs font-medium text-azul-esc hover:underline">+{doDia.length - 3} mais</Link>}
            </div>;
          })}</div>
        </div>}

        {/* No celular, e na visualização em lista, os prazos aparecem agrupados por dia. */}
        {itens.length > 0 && <div className={visao === "mes" ? "mt-0 md:hidden" : ""}>{listaPorDia}</div>}
        {itens.length === 0 && <p className="mt-2 rounded-cartao border border-linha bg-branco px-5 py-10 text-center text-sm text-cinza">Nenhum prazo neste mês.</p>}

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-cinza">
          {([["atrasado", "Atrasado"], ["proximo", `Vence em até ${limites.diasAmareloAte} ${limites.diasAmareloAte === 1 ? "dia" : "dias"}`], ["prazo", "No prazo"], ["visita", "Visita ou reunião"], ["futura", "Próxima ocorrência de tarefa recorrente"]] as const).map(([classe, rotulo]) => (
            <span key={classe} className="inline-flex items-center gap-1.5"><i aria-hidden="true" className={`inline-block size-3 rounded-[3px] ${COR_ITEM_AGENDA[classe].replace("line-through", "")}`} />{rotulo}</span>
          ))}
        </div>
      </div>

      {visao === "mes" && <div className="hidden md:block">
        <Cartao titulo={diaSelecionado ? dataLonga(new Date(Date.UTC(atual.ano, atual.mes, diaSelecionado))) : "Dia"} semMargem>
          {!diaSelecionado ? <p className="px-5 py-7 text-center text-[13.5px] text-cinza">Selecione um dia no calendário para ver os prazos.</p>
            : doDiaSelecionado.length === 0 ? <p className="px-5 py-7 text-center text-[13.5px] text-cinza">Nenhum prazo neste dia.</p>
            : <ul>{doDiaSelecionado.map((item) => {
                const classe = classeDe(item);
                return <li key={item.id} className="grid grid-cols-[4px_minmax(0,1fr)] gap-3 border-t border-linha px-5 py-3 first:border-t-0">
                  <span aria-hidden="true" className={`rounded-sm ${COR_BARRA_AGENDA[classe]}`} />
                  <div className="min-w-0">
                    {item.projetada ? <p className="break-words font-medium text-ink">{item.nome}</p> : <Link href={`/tarefas/${item.id}`} className="block break-words font-medium text-ink hover:text-azul-esc">{item.nome}</Link>}
                    <p className="mt-0.5 break-words text-[12.5px] text-cinza">{item.projeto.cliente.razaoSocial} · {item.projeto.nome}</p>
                    <p className="mt-1 text-xs text-cinza">{ROTULO_CLASSE_AGENDA[classe]}{item.responsavel ? ` · ${item.responsavel.nome}` : ""}</p>
                  </div>
                </li>;
              })}</ul>}
        </Cartao>
      </div>}
    </div>
  </div>;
}
