/**
 * Página da rota `src/app/(painel)/notificacoes/page.tsx`. Recebe os parâmetros da URL ou da rota, valida o acesso no servidor, obtém os dados necessários e compõe a resposta visual; as regras de negócio permanecem nas funções de domínio chamadas por ela.
 */
import { formatarDataHoraBrasilia } from "@/lib/datas";
import { EventoNotificacao } from "@prisma/client";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { buscarStatusJobPrazo, listarNotificacoes, listarPreferenciasNotificacao } from "@/lib/notificacoes";
import { buscarLimitesSemaforo } from "@/lib/semaforo";
import { podeGerarToastsDemonstracao } from "@/lib/notificacoes-toasts";
import { inputClass } from "@/ui/campo";
import { botaoPrimario, botaoSecundario } from "@/ui/botoes";
import { Cartao } from "@/ui/cartao";
import { BotaoGerarToastsDemonstracao } from "../toast-notifications";
import { atualizarSemaforoAction, atualizarPreferenciaAction, marcarTodasNotificacoesLidasAction } from "./actions";
import { FiltrosAvisos } from "./filtros-avisos";
import { filtrarAvisos, ListaAvisos, OPCOES_TIPO_AVISO, ROTULO_EVENTO } from "./lista-avisos";

const perfilLabel = { ADMIN: "Administrador", ADMIN_INTERNO: "Colaborador interno", ADMIN_EXTERNO: "Colaborador externo", CLIENTE: "Cliente" } as const;
const eventos = Object.values(EventoNotificacao);
const perfis = Object.keys(perfilLabel) as (keyof typeof perfilLabel)[];
const quando = (data: Date) => formatarDataHoraBrasilia(data);

const COR_ESTADO_JOB: Record<string, string> = { SUCESSO: "text-verde-esc", EM_EXECUCAO: "text-ambar" };
const ROTULO_ESTADO_JOB: Record<string, string> = { SUCESSO: "Sucesso", EM_EXECUCAO: "Em execução" };

export default async function NotificacoesPage({ searchParams }: { searchParams: Promise<{ lidos?: string | string[]; tipo?: string | string[] }> }) {
  const ctx = await exigirAcessoARota("/notificacoes");
  const parametros = await searchParams;
  const [{ itens, naoLidas }, preferencias, limites, statusJob] = await Promise.all([listarNotificacoes(ctx), listarPreferenciasNotificacao(ctx), buscarLimitesSemaforo(ctx), buscarStatusJobPrazo()]);
  const mapa = new Map(preferencias.map((preferencia) => [`${preferencia.perfil}:${preferencia.evento}`, preferencia]));
  const demoDisponivel = podeGerarToastsDemonstracao(ctx.perfil, process.env.NODE_ENV);
  const { visiveis, apenasNaoLidos, tipo, filtrado } = filtrarAvisos(itens, parametros);

  return <div className="w-full max-w-[1180px]">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <h1 className="text-2xl">Avisos</h1>
      <div className="flex flex-wrap items-center gap-2">
        <BotaoGerarToastsDemonstracao habilitado={demoDisponivel} />
        {naoLidas > 0 && <form action={marcarTodasNotificacoesLidasAction}><button className={botaoSecundario}>Marcar todas como lidas</button></form>}
      </div>
    </div>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
      <section aria-label="Avisos recentes" className="min-w-0">
        <FiltrosAvisos
          key={`${apenasNaoLidos}|${tipo}`}
          rota="/notificacoes"
          apenasNaoLidosInicial={apenasNaoLidos}
          tipoInicial={tipo}
          opcoesTipo={OPCOES_TIPO_AVISO}
          totalTodos={itens.length}
          totalNaoLidos={naoLidas}
        />
        <ListaAvisos itens={visiveis} filtrado={filtrado} />
      </section>

      <div className="flex min-w-0 flex-col gap-6">
        <Cartao titulo="Último envio de prazos">
          <p className="break-words text-[13px] leading-5 text-cinza">Execução diária prevista para 08:00 (horário de Brasília). Horários abaixo em Brasília.</p>
          {!statusJob?.ultimaExecucaoPrazoEm ? <p className="mt-4 text-[13px] text-cinza">Ainda não executado.</p> : (
            <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-[13px]">
              <dt className="text-cinza">Estado</dt>
              <dd className={`min-w-0 break-words text-right font-semibold ${COR_ESTADO_JOB[statusJob.ultimaExecucaoPrazoStatus ?? ""] ?? "text-critico"}`}>{ROTULO_ESTADO_JOB[statusJob.ultimaExecucaoPrazoStatus ?? ""] ?? "Falha"}</dd>
              <dt className="text-cinza">Última tentativa</dt>
              <dd className="min-w-0 break-words text-right tabular-nums">{quando(statusJob.ultimaExecucaoPrazoEm)}</dd>
              <dt className="text-cinza">Último sucesso</dt>
              <dd className="min-w-0 break-words text-right tabular-nums">{statusJob.ultimoSucessoPrazoEm ? quando(statusJob.ultimoSucessoPrazoEm) : "—"}</dd>
              <dt className="text-cinza">Tarefas processadas</dt>
              <dd className="min-w-0 break-words text-right tabular-nums">{statusJob.ultimoSucessoPrazoTarefas ?? 0}</dd>
              <dt className="text-cinza">E-mails enviados</dt>
              <dd className="min-w-0 break-words text-right tabular-nums">{statusJob.ultimoSucessoPrazoEmailsEnviados ?? 0}</dd>
              <dt className="text-cinza">Avisos no app</dt>
              <dd className="min-w-0 break-words text-right tabular-nums">{statusJob.ultimoSucessoPrazoInAppCriados ?? 0}</dd>
            </dl>
          )}
        </Cartao>

        <Cartao titulo="Semáforo de prazos">
          <p className="break-words text-[13px] leading-5 text-cinza">Vale para projetos, tarefas e subtarefas. Vermelho só para prazo vencido. Contagem em dias corridos, incluindo fins de semana e feriados.</p>
          <form action={atualizarSemaforoAction} className="mt-4 space-y-3">
            <label className="block font-[family-name:var(--font-interface)] text-[13px]">Amarelo até (dias)
              <input name="diasAmareloAte" type="number" min="0" max="365" required defaultValue={limites.diasAmareloAte} className={`${inputClass} mt-1`} />
            </label>
            <p className="break-words text-xs text-cinza">Amarelo do dia do prazo até este limite; verde acima dele.</p>
            <button className={botaoPrimario}>Salvar</button>
          </form>
        </Cartao>

        <section className="@container min-w-0 rounded-cartao border border-linha bg-branco p-5">
          <h2 className="break-words text-base font-semibold">Preferências por perfil</h2>
          <p className="mt-2 break-words text-[13px] leading-5 text-cinza">Escolha os canais por tipo de aviso. A preferência vale para todas as pessoas ativas do perfil e também controla as menções em comentários.</p>
          <div className="mt-5 space-y-5">
            {perfis.map((perfil) => <div key={perfil}>
              <h3 className="break-words font-[family-name:var(--font-interface)] text-[13px] font-semibold">{perfilLabel[perfil]}</h3>
              <div className="mt-2 space-y-2">
                {eventos.map((evento) => {
                  const p = mapa.get(`${perfil}:${evento}`);
                  return <form key={evento} action={atualizarPreferenciaAction} className="grid min-w-0 gap-2 border-b border-linha pb-2 text-[13px] @sm:grid-cols-[minmax(0,1fr)_164px] @sm:items-center @sm:gap-3">
                    <input type="hidden" name="perfil" value={perfil} />
                    <input type="hidden" name="evento" value={evento} />
                    <span className="min-w-0 break-words">{ROTULO_EVENTO[evento]}</span>
                    <span className="flex w-full flex-nowrap items-center justify-between gap-2 font-[family-name:var(--font-interface)] text-[11px] text-cinza @sm:w-[164px] @sm:shrink-0">
                      <label className="flex min-h-11 shrink-0 items-center gap-1 whitespace-nowrap"><input type="checkbox" name="email" defaultChecked={p?.email} className="accent-tinta" /> E-mail</label>
                      <label className="flex min-h-11 shrink-0 items-center gap-1 whitespace-nowrap"><input type="checkbox" name="inApp" defaultChecked={p?.inApp} className="accent-tinta" /> App</label>
                      <button className="min-h-11 shrink-0 whitespace-nowrap px-1 text-azul-esc hover:underline">Salvar</button>
                    </span>
                  </form>;
                })}
              </div>
            </div>)}
          </div>
        </section>
      </div>
    </div>
  </div>;
}
