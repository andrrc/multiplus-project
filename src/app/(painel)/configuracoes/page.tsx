/**
 * Configurações (protótipo 08-configuracoes): reúne o que vale para todo o sistema e hoje existia
 * ao lado da caixa de avisos. Abas: Prazos e avisos (semáforo e último envio), Notificações por
 * perfil (canais por tipo de aviso) e Etiquetas (a página que já existe). A régua de avisos
 * (primeiro aviso, lembrete, escalonamento) do protótipo depende de regras novas e não foi criada.
 */
import Link from "next/link";
import { EventoNotificacao } from "@prisma/client";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { buscarStatusJobPrazo, listarPreferenciasNotificacao } from "@/lib/notificacoes";
import { buscarLimitesSemaforo } from "@/lib/semaforo";
import { formatarDataHoraBrasilia } from "@/lib/datas";
import { inputClass } from "@/ui/campo";
import { botaoPrimario } from "@/ui/botoes";
import { Cartao } from "@/ui/cartao";
import { atualizarPreferenciaAction, atualizarSemaforoAction } from "../notificacoes/actions";
import { ROTULO_EVENTO } from "../notificacoes/lista-avisos";

const perfilLabel = { ADMIN: "Administração", ADMIN_INTERNO: "Colaborador interno", ADMIN_EXTERNO: "Colaborador externo", CLIENTE: "Cliente" } as const;
const perfis = Object.keys(perfilLabel) as (keyof typeof perfilLabel)[];
const eventos = Object.values(EventoNotificacao);
const quando = (data: Date) => formatarDataHoraBrasilia(data);

const COR_ESTADO_JOB: Record<string, string> = { SUCESSO: "text-verde-esc", EM_EXECUCAO: "text-ambar" };
const ROTULO_ESTADO_JOB: Record<string, string> = { SUCESSO: "Sucesso", EM_EXECUCAO: "Em execução" };

const ABAS = [
  { valor: "prazos", rotulo: "Prazos e avisos", href: "/configuracoes" },
  { valor: "notificacoes", rotulo: "Notificações por perfil", href: "/configuracoes?aba=notificacoes" },
  { valor: "etiquetas", rotulo: "Etiquetas", href: "/etiquetas" },
] as const;

export default async function ConfiguracoesPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const ctx = await exigirAcessoARota("/configuracoes");
  const { aba } = await searchParams;
  const abaAtual = aba === "notificacoes" ? "notificacoes" : "prazos";
  const [limites, statusJob, preferencias] = await Promise.all([buscarLimitesSemaforo(ctx), buscarStatusJobPrazo(), listarPreferenciasNotificacao(ctx)]);
  const mapa = new Map(preferencias.map((preferencia) => [`${preferencia.perfil}:${preferencia.evento}`, preferencia]));
  const dias = limites.diasAmareloAte;

  return (
    <div className="w-full max-w-[1080px]">
      <h1 className="text-2xl">Configurações</h1>
      <p className="mt-1 text-sm text-cinza">Valem para todo o sistema. Só a administração acessa esta tela.</p>

      <nav aria-label="Seções das configurações" className="mb-6 mt-6 flex gap-1 overflow-x-auto border-b border-linha">
        {ABAS.map((item) => {
          const ativa = item.valor === abaAtual;
          return (
            <Link
              key={item.valor}
              href={item.href}
              aria-current={ativa ? "page" : undefined}
              className={`-mb-px inline-flex min-h-11 shrink-0 items-center border-b-2 px-3.5 text-sm font-medium hover:text-ink ${ativa ? "border-tinta font-semibold text-ink" : "border-transparent text-cinza"}`}
            >
              {item.rotulo}
            </Link>
          );
        })}
      </nav>

      {abaAtual === "prazos" && (
        <div className="flex flex-col gap-6">
          <Cartao titulo="Semáforo de prazos">
            <p className="text-[13px] text-cinza">Cor usada em projetos, tarefas e subtarefas, em todas as telas. Contagem em dias corridos, incluindo fins de semana e feriados.</p>
            <div className="mt-4 grid grid-cols-[1fr_2fr_3fr] overflow-hidden rounded-controle text-center text-[13px] font-semibold" aria-hidden="true">
              <span className="bg-critico-cl px-2 py-2 text-critico">Vencido</span>
              <span className="bg-ambar-cl px-2 py-2 text-ambar">Do dia do prazo até {dias} {dias === 1 ? "dia" : "dias"} antes</span>
              <span className="bg-verde-cl px-2 py-2 text-verde-esc">Mais de {dias} {dias === 1 ? "dia" : "dias"}</span>
            </div>
            <form action={atualizarSemaforoAction} className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-linha pt-4">
              <label htmlFor="diasAmareloAte" className="min-w-0 flex-1 basis-[320px]">
                <span className="block font-[family-name:var(--font-interface)] text-sm font-medium">Amarelo a partir de</span>
                <span className="mt-0.5 block text-[13px] text-cinza">Quantos dias antes do prazo o item passa de verde para amarelo. Também define o limite de &ldquo;Vencem em até N dias&rdquo; nas listas e no painel.</span>
              </label>
              <div className="flex items-center gap-2.5">
                <input id="diasAmareloAte" name="diasAmareloAte" type="number" min="0" max="365" required defaultValue={dias} className={`${inputClass} w-20 text-center tabular-nums`} />
                <span className="whitespace-nowrap text-sm text-cinza">dias antes</span>
                <button className={botaoPrimario}>Salvar</button>
              </div>
            </form>
          </Cartao>

          <Cartao titulo="Envio diário de prazos">
            <p className="text-[13px] text-cinza">Rotina que verifica os prazos e dispara os avisos. Execução diária prevista para 08:00 (horário de Brasília).</p>
            {!statusJob?.ultimaExecucaoPrazoEm ? <p className="mt-4 text-[13px] text-cinza">Ainda não executado.</p> : (
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-[13px] sm:grid-cols-3">
                <div><dt className="text-cinza">Estado</dt><dd className={`mt-0.5 font-semibold ${COR_ESTADO_JOB[statusJob.ultimaExecucaoPrazoStatus ?? ""] ?? "text-critico"}`}>{ROTULO_ESTADO_JOB[statusJob.ultimaExecucaoPrazoStatus ?? ""] ?? "Falha"}</dd></div>
                <div><dt className="text-cinza">Última tentativa</dt><dd className="mt-0.5 tabular-nums">{quando(statusJob.ultimaExecucaoPrazoEm)}</dd></div>
                <div><dt className="text-cinza">Último sucesso</dt><dd className="mt-0.5 tabular-nums">{statusJob.ultimoSucessoPrazoEm ? quando(statusJob.ultimoSucessoPrazoEm) : "—"}</dd></div>
                <div><dt className="text-cinza">Tarefas processadas</dt><dd className="mt-0.5 tabular-nums">{statusJob.ultimoSucessoPrazoTarefas ?? 0}</dd></div>
                <div><dt className="text-cinza">E-mails enviados</dt><dd className="mt-0.5 tabular-nums">{statusJob.ultimoSucessoPrazoEmailsEnviados ?? 0}</dd></div>
                <div><dt className="text-cinza">Avisos no sistema</dt><dd className="mt-0.5 tabular-nums">{statusJob.ultimoSucessoPrazoInAppCriados ?? 0}</dd></div>
              </dl>
            )}
          </Cartao>
        </div>
      )}

      {abaAtual === "notificacoes" && (
        <Cartao titulo="Notificações por perfil">
          <p className="text-[13px] leading-5 text-cinza">Escolha os canais por tipo de aviso. A preferência vale para todas as pessoas ativas do perfil e também controla as menções em comentários.</p>
          <div className="@container mt-5 space-y-6">
            {perfis.map((perfil) => (
              <div key={perfil}>
                <h3 className="font-[family-name:var(--font-interface)] text-[13px] font-semibold">{perfilLabel[perfil]}</h3>
                <div className="mt-2 space-y-2">
                  {eventos.map((evento) => {
                    const p = mapa.get(`${perfil}:${evento}`);
                    return (
                      <form key={evento} action={atualizarPreferenciaAction} className="grid min-w-0 gap-2 border-b border-linha pb-2 text-[13px] @sm:grid-cols-[minmax(0,1fr)_200px] @sm:items-center @sm:gap-3">
                        <input type="hidden" name="perfil" value={perfil} />
                        <input type="hidden" name="evento" value={evento} />
                        <span className="min-w-0 break-words">{ROTULO_EVENTO[evento]}</span>
                        <span className="flex w-full flex-nowrap items-center justify-between gap-2 font-[family-name:var(--font-interface)] text-xs text-cinza @sm:w-[200px] @sm:shrink-0">
                          <label className="flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap md:min-h-8"><input type="checkbox" name="email" defaultChecked={p?.email} className="accent-tinta" /> E-mail</label>
                          <label className="flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap md:min-h-8"><input type="checkbox" name="inApp" defaultChecked={p?.inApp} className="accent-tinta" /> Sistema</label>
                          <button className="min-h-11 shrink-0 whitespace-nowrap px-1 font-medium text-azul-esc hover:underline md:min-h-8">Salvar</button>
                        </span>
                      </form>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Cartao>
      )}
    </div>
  );
}
