/**
 * Tela inicial do colaborador externo (protótipo sistema-gestao-multiplus-colaborador-externo/01-minhas-tarefas):
 * saudação, resumo em pílulas e tarefas em cartões grandes, pensados para o celular. Mostra as mesmas
 * tarefas e os mesmos dados que ele já via; a restrição do que o externo enxerga depende de uma análise
 * de permissão à parte e não faz parte desta tela.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { calcularDiasRestantes } from "@/lib/datas";
import { classeDoItemAgenda, COR_BARRA_AGENDA } from "@/lib/agenda-itens";
import type { LimitesSemaforo } from "@/lib/semaforo";
import { IndicadorSemaforoProjeto } from "@/ui/indicador-dias-restantes";

type TarefaExterno = {
  id: string;
  nome: string;
  prazo: Date | null;
  status: string;
  periodicidade: string | null;
  projeto: { nome: string };
  subtarefas: Array<{ status: string }>;
};

const RECORRENCIA: Record<string, string> = { SEMANAL: "Toda semana", MENSAL: "Todo mês", TRIMESTRAL: "Todo trimestre", SEMESTRAL: "Todo semestre", ANUAL: "Todo ano" };
const formatarData = (v: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(v);

const icone = (caminhos: ReactNode) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" className="shrink-0 text-faint" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{caminhos}</svg>
);

function Pilula({ children, tom }: { children: ReactNode; tom: "critico" | "ambar" | "neutro" }) {
  const cores = tom === "critico" ? "border-critico/25 bg-critico-cl text-critico" : tom === "ambar" ? "border-ambar/25 bg-ambar-cl text-ambar" : "border-linha bg-branco text-ink";
  return <span className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-semibold tabular-nums ${cores}`}>{children}</span>;
}

function Grupo({ titulo, total, children }: { titulo: string; total: number; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="mt-7">
      <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-cinza">
        {titulo}
        <span className="rounded-full bg-selecionado px-2 py-px text-xs font-semibold tabular-nums text-ink">{total}</span>
      </h2>
      <ul className="flex flex-col gap-3">{children}</ul>
    </section>
  );
}

export function TelaTarefasExterno({
  nome,
  tarefas,
  limites,
}: {
  nome: string;
  tarefas: TarefaExterno[];
  limites: LimitesSemaforo;
}) {
  const fechada = (t: TarefaExterno) => t.status === "CONCLUIDO" || t.status === "CANCELADO";
  const abertas = tarefas.filter((t) => !fechada(t));
  const concluidas = tarefas.filter(fechada);
  const dias = (t: TarefaExterno) => (t.prazo ? calcularDiasRestantes(t.prazo) : null);
  const atrasadas = abertas.filter((t) => (dias(t) ?? 0) < 0).length;
  const proximas = abertas.filter((t) => { const d = dias(t); return d !== null && d >= 0 && d <= limites.diasAmareloAte; }).length;
  const primeiroNome = nome.trim().split(/\s+/)[0] || "colaborador";

  const cartao = (t: TarefaExterno, esmaecido: boolean) => {
    const d = dias(t);
    const classe = classeDoItemAgenda({ status: t.status, projetada: false }, d ?? 9999, limites.diasAmareloAte);
    const concluidasSub = t.subtarefas.filter((s) => s.status === "CONCLUIDO").length;
    return (
      <li key={t.id} className={`relative overflow-hidden rounded-cartao border border-linha bg-branco ${esmaecido ? "opacity-75" : ""}`}>
        <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${COR_BARRA_AGENDA[classe]}`} />
        <Link href={`/minhas-tarefas/${t.id}`} className="flex min-h-11 items-center gap-3 py-4 pl-5 pr-4 hover:bg-cabecalho">
          <span className="min-w-0 flex-1">
            <span className="block break-words text-base font-semibold text-ink">{t.nome}</span>
            <span className="mt-1 block truncate text-[13px] text-cinza">{t.projeto.nome}</span>
            <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-cinza">
              {t.prazo && <span className="inline-flex items-center gap-1.5 tabular-nums text-ink">{icone(<><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>)}{formatarData(t.prazo)}</span>}
              {!esmaecido && <IndicadorSemaforoProjeto prazo={t.prazo} status={t.status} limites={limites} />}
              {t.subtarefas.length > 0 && <span className="inline-flex items-center gap-1.5 tabular-nums">{icone(<><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>)}{concluidasSub}/{t.subtarefas.length} subtarefas</span>}
              {t.periodicidade && <span className="inline-flex items-center gap-1.5">{icone(<><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></>)}{RECORRENCIA[t.periodicidade] ?? t.periodicidade}</span>}
            </span>
          </span>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" className="shrink-0 text-ink" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        </Link>
      </li>
    );
  };

  return (
    <div className="mx-auto w-full max-w-[640px]">
      <h1 className="text-[26px]">Olá, {primeiroNome}</h1>
      <p className="mt-1 text-sm text-cinza">Colaborador externo · suas tarefas em ordem de prazo.</p>

      <div className="mt-5 flex flex-wrap gap-2.5" aria-label="Resumo das tarefas">
        {atrasadas > 0 && <Pilula tom="critico">{atrasadas} {atrasadas === 1 ? "atrasada" : "atrasadas"}</Pilula>}
        {proximas > 0 && <Pilula tom="ambar">{proximas} {proximas === 1 ? "vence" : "vencem"} em breve</Pilula>}
        <Pilula tom="neutro">{abertas.length} para fazer</Pilula>
      </div>

      {tarefas.length === 0 && (
        <div className="mt-7 rounded-cartao border border-linha bg-branco px-5 py-12 text-center text-cinza">
          <b className="mb-1 block font-semibold text-ink">Nenhuma tarefa atribuída a você ainda.</b>
          Quando uma tarefa for atribuída a você, ela aparece aqui.
        </div>
      )}
      {abertas.length > 0 && <Grupo titulo="Para fazer" total={abertas.length}>{abertas.map((t) => cartao(t, false))}</Grupo>}
      {concluidas.length > 0 && <Grupo titulo="Concluídas" total={concluidas.length}>{concluidas.map((t) => cartao(t, true))}</Grupo>}
    </div>
  );
}
