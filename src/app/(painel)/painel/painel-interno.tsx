/**
 * Painel do colaborador interno (protótipo colaborador-interno/01-painel). Resume o que está com ele:
 * a semana, o que está atrasado e o que vence, as tarefas por prazo e os projetos. Usa só as consultas
 * existentes; o que depende de dados novos (comprovantes, "aguardando outras pessoas") não aparece.
 */
import Link from "next/link";
import { calcularDiasRestantes } from "@/lib/datas";
import { listarProjetosAtribuidos, listarTarefasAtribuidas } from "@/lib/projetos-tarefas";
import { buscarLimitesSemaforo } from "@/lib/semaforo";
import { calcularPercentualConclusao } from "@/lib/regras-projetos-tarefas";
import { codigoTarefa } from "@/lib/identificadores-hierarquicos";
import type { ContextoUsuario } from "@/lib/prisma-app";
import { Cartao } from "@/ui/cartao";
import { IndicadorSemaforoProjeto } from "@/ui/indicador-dias-restantes";
import { StatusPonto } from "@/ui/status-ponto";

const DIAS_ADIANTE = 7;
const STATUS_TAREFA: Record<string, string> = { A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", AGUARDANDO_DOCUMENTO_CLIENTE: "Aguardando documento", VISITA_REUNIAO_AGENDADA: "Visita/reunião agendada", PROTOCOLADO: "Protocolado", SOB_ANALISE_ORGAO_AMBIENTAL: "Sob análise do órgão", COM_EXIGENCIA_A_CUMPRIR: "Com exigência" };

const saudacao = (agora: Date) => {
  const hora = Number(new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" }).format(agora));
  return hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
};
const dataLonga = (agora: Date) => {
  const texto = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(agora);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};
const diaDaSemana = (indice: number, agora: Date) => {
  const base = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate() + indice));
  return { texto: new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" }).format(base).replace(".", ""), numero: base.getUTCDate() };
};

export async function PainelInterno({ ctx, nome }: { ctx: ContextoUsuario; nome: string }) {
  const agora = new Date();
  const [tarefas, projetos, limites] = await Promise.all([listarTarefasAtribuidas(ctx), listarProjetosAtribuidos(ctx), buscarLimitesSemaforo(ctx)]);
  const abertas = tarefas.filter((t) => t.status !== "CONCLUIDO" && t.status !== "CANCELADO");
  const dias = (t: { prazo: Date | null }) => (t.prazo ? calcularDiasRestantes(t.prazo, agora) : null);
  const atrasadas = abertas.filter((t) => (dias(t) ?? 0) < 0);
  const vencem = abertas.filter((t) => { const d = dias(t); return d !== null && d >= 0 && d < DIAS_ADIANTE; });
  const primeiroNome = nome.trim().split(/\s+/)[0] || "colaborador";
  const semana = Array.from({ length: DIAS_ADIANTE }, (_, i) => ({ ...diaDaSemana(i, agora), total: abertas.filter((t) => dias(t) === i).length }));
  const fazerAgora = abertas.slice(0, 8);

  const indicadores = [
    { rotulo: "Atrasadas comigo", valor: atrasadas.length, cor: atrasadas.length > 0 ? "text-critico" : "text-ink", detalhe: "Resolver primeiro", href: "/minhas-tarefas?situacao=atrasado" },
    { rotulo: `Vencem em ${DIAS_ADIANTE} dias`, valor: vencem.length, cor: vencem.length > 0 ? "text-ambar" : "text-ink", detalhe: "Tarefas com prazo na semana", href: "/minhas-tarefas?situacao=proximo" },
    { rotulo: "Meus projetos", valor: projetos.length, cor: "text-ink", detalhe: "Com tarefa atribuída a você", href: "/meus-projetos" },
  ];

  return (
    <div className="w-full max-w-[1280px]">
      <div className="mb-6">
        <h1 className="text-2xl">{saudacao(agora)}, {primeiroNome}</h1>
        <p className="mt-1 text-sm text-cinza">
          {dataLonga(agora)}. {atrasadas.length > 0 ? <b className="font-semibold text-ink">{atrasadas.length} {atrasadas.length === 1 ? "tarefa atrasada" : "tarefas atrasadas"}</b> : "Nenhuma tarefa atrasada"}.
        </p>
      </div>

      <section aria-label="Semana" className="mb-6 grid grid-cols-4 gap-2.5 sm:grid-cols-7">
        {semana.map((d, i) => (
          <div key={i} className={`rounded-cartao border bg-branco px-3 py-2.5 ${i === 0 ? "border-tinta" : "border-linha"}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-cinza">{i === 0 ? "Hoje" : d.texto}</p>
            <p className={`text-xl font-semibold tabular-nums ${d.total === 0 ? "text-faint" : "text-ink"}`}>{d.numero}</p>
            <p className="mt-0.5 text-xs text-cinza">{d.total === 0 ? "Livre" : `${d.total} ${d.total === 1 ? "entrega" : "entregas"}`}</p>
          </div>
        ))}
      </section>

      <section aria-label="Indicadores" className="mb-6 grid gap-4 sm:grid-cols-3">
        {indicadores.map((indicador) => (
          <Link key={indicador.rotulo} href={indicador.href} className="block rounded-cartao border border-linha bg-branco px-5 py-[18px] hover:border-linha-forte">
            <p className="text-[13px] font-medium text-cinza">{indicador.rotulo}</p>
            <p className={`mt-2 text-[30px] font-semibold leading-tight tabular-nums ${indicador.cor}`}>{indicador.valor}</p>
            <p className="mt-1 text-[13px] text-cinza">{indicador.detalhe}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <Cartao
          titulo={<>Fazer agora <span className="rounded-full bg-papel px-2 py-px text-xs font-semibold tabular-nums text-ink">{abertas.length}</span></>}
          semMargem
          acao={abertas.length > 8 ? <Link href="/minhas-tarefas" className="text-[13px] font-medium text-azul-esc hover:underline">Ver todas</Link> : undefined}
        >
          {fazerAgora.length === 0 ? <p className="px-5 py-8 text-center text-sm text-cinza">Nenhuma tarefa em aberto. Bom trabalho!</p> : (
            <ul>
              {fazerAgora.map((t) => (
                <li key={t.id} className="relative grid gap-1.5 border-t border-linha px-5 py-3.5 first:border-t-0 hover:bg-cabecalho sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-5">
                  <div className="min-w-0">
                    <Link href={`/minhas-tarefas/${t.id}`} className="block truncate font-medium text-ink before:absolute before:inset-0 before:content-[''] hover:text-azul-esc">{t.nome}</Link>
                    <p className="mt-px truncate text-[12.5px] text-cinza"><span className="tabular-nums text-faint">{codigoTarefa(t.projeto.cliente.numeroIdentificacao, t.projeto.numeroLocal, t.numeroLocal)}</span> · {t.projeto.cliente.razaoSocial} · {t.projeto.nome}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
                    <StatusPonto status={t.status}>{STATUS_TAREFA[t.status] ?? t.status}</StatusPonto>
                    <IndicadorSemaforoProjeto prazo={t.prazo} status={t.status} limites={limites} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <Cartao titulo="Meus projetos" semMargem acao={<Link href="/meus-projetos" className="text-[13px] font-medium text-azul-esc hover:underline">Ver todos</Link>}>
          {projetos.length === 0 ? <p className="px-5 py-8 text-center text-sm text-cinza">Nenhum projeto por enquanto.</p> : (
            <ul>
              {projetos.slice(0, 6).map((p) => {
                const conclusao = calcularPercentualConclusao(p.tarefas);
                return (
                  <li key={p.id} className="relative border-t border-linha px-5 py-3.5 first:border-t-0 hover:bg-cabecalho">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/meus-projetos/${p.id}`} className="block truncate font-medium text-ink before:absolute before:inset-0 before:content-[''] hover:text-azul-esc">{p.nome}</Link>
                        <p className="mt-px truncate text-[12.5px] text-cinza">{p.cliente.razaoSocial}</p>
                      </div>
                      <IndicadorSemaforoProjeto prazo={p.dataPrevistaConclusao} status={p.status} limites={limites} />
                    </div>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-linha" role="img" aria-label={conclusao.total ? `${conclusao.concluidas} de ${conclusao.total} tarefas concluídas` : "Sem tarefas ativas"}>
                      <span className="block h-full bg-verde" style={{ width: `${conclusao.percentual ?? 0}%` }} />
                    </div>
                    <p className="mt-1.5 text-xs tabular-nums text-cinza">{conclusao.total ? `${conclusao.concluidas} de ${conclusao.total} tarefas` : "Sem tarefas ativas"}</p>
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
