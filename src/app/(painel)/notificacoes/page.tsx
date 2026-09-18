import Link from "next/link";
import { EventoNotificacao } from "@prisma/client";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { buscarConfiguracaoNotificacao, listarNotificacoes, listarPreferenciasNotificacao } from "@/lib/notificacoes";
import { inputClass } from "@/ui/campo";
import { atualizarAntecedenciaAction, atualizarPreferenciaAction, marcarNotificacaoLidaAction, marcarTodasNotificacoesLidasAction } from "./actions";

const eventoLabel: Record<EventoNotificacao, string> = {
  PRAZO_PROXIMO: "Prazo próximo",
  TAREFA_CONCLUIDA: "Tarefa concluída",
  PROJETO_CONCLUIDO: "Projeto concluído",
  NOVO_COMENTARIO: "Novo comentário",
  ATRIBUICAO_RECEBIDA: "Atribuição recebida",
};
const perfilLabel = { ADMIN: "Administrador", ADMIN_INTERNO: "Colaborador Interno", ADMIN_EXTERNO: "Colaborador Externo", CLIENTE: "Cliente" } as const;
const eventos = Object.values(EventoNotificacao);
const perfis = Object.keys(perfilLabel) as (keyof typeof perfilLabel)[];
const quando = (data: Date) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(data);

export default async function NotificacoesPage() {
  const ctx = await exigirAcessoARota("/notificacoes");
  const [{ itens, naoLidas }, preferencias, configuracao] = await Promise.all([listarNotificacoes(ctx), listarPreferenciasNotificacao(ctx), buscarConfiguracaoNotificacao(ctx)]);
  const mapa = new Map(preferencias.map((preferencia) => [`${preferencia.perfil}:${preferencia.evento}`, preferencia]));
  return <div className="w-full max-w-[1180px]">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-[family-name:var(--font-interface)] text-[11px] font-semibold uppercase tracking-[0.12em] text-azul-esc">Caixa de trabalho</p><h1 className="mt-1 text-[28px]">Notificações</h1><p className="mt-1.5 text-[15px] text-cinza">Avisos importantes, sem perder o fio do que precisa de atenção.</p></div>{naoLidas > 0 && <form action={marcarTodasNotificacoesLidasAction}><button className="rounded-[3px] border border-linha px-4 py-2.5 font-[family-name:var(--font-interface)] text-[13px] hover:border-azul">Marcar todas como lidas</button></form>}</div>
    <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section aria-labelledby="avisos" className="min-w-0"><div className="flex items-center justify-between border-b-2 border-tinta pb-3"><h2 id="avisos" className="text-[20px]">Avisos recentes</h2>{naoLidas > 0 && <span className="rounded-full bg-verde px-3 py-1 font-[family-name:var(--font-interface)] text-[12px] font-semibold">{naoLidas} não lida{naoLidas === 1 ? "" : "s"}</span>}</div>{itens.length === 0 ? <div className="border-b border-linha bg-branco px-6 py-14 text-center"><p className="text-[17px]">Nenhuma notificação por enquanto.</p><p className="mt-2 text-[14px] text-cinza">Quando houver um prazo, comentário ou atribuição, o aviso aparecerá aqui.</p><Link href="/prazos" className="mt-5 inline-block font-[family-name:var(--font-interface)] text-[13px] text-azul-esc hover:underline">Ver Painel de Prazos</Link></div> : <ol className="divide-y divide-linha border-b border-linha">{itens.map((item) => <li key={item.id} className={`relative px-4 py-4 pl-6 ${item.lida ? "bg-papel/50" : "bg-branco"}`}>{!item.lida && <span className="absolute inset-y-0 left-0 w-1 bg-verde" aria-label="Não lida" />}<div className="flex flex-wrap items-start justify-between gap-3"><div><p className={`font-[family-name:var(--font-interface)] text-[13px] ${item.lida ? "text-cinza" : "font-semibold text-tinta"}`}>{eventoLabel[item.evento]}</p><p className="mt-1 text-[16px]">{item.titulo}</p><p className="mt-1 text-[14px] text-cinza">{item.mensagem}</p></div><time className="shrink-0 font-[family-name:var(--font-interface)] text-[11px] text-cinza">{quando(item.criadaEm)}</time></div><div className="mt-3 flex flex-wrap gap-4 font-[family-name:var(--font-interface)] text-[12px]">{item.url && <Link href={item.url} className="text-azul-esc hover:underline">Abrir registro</Link>}{!item.lida && <form action={marcarNotificacaoLidaAction.bind(null, item.id)}><button className="text-cinza hover:text-tinta">Marcar como lida</button></form>}</div></li>)}</ol>}</section>
      <aside className="space-y-6"><section className="border-t-2 border-tinta bg-branco p-5"><h2 className="text-[18px]">Antecedência de prazo</h2><p className="mt-2 text-[13px] leading-5 text-cinza">O padrão vale para tarefas sem uma configuração própria.</p><form action={atualizarAntecedenciaAction} className="mt-4 flex items-end gap-2"><label className="flex-1 font-[family-name:var(--font-interface)] text-[13px]">Dias<input name="dias" type="number" min="1" max="365" defaultValue={configuracao.diasAntecedenciaPadrao} className={`${inputClass} mt-1`} /></label><button className="min-h-11 rounded-[3px] bg-verde px-4 font-[family-name:var(--font-interface)] text-[13px] font-semibold">Salvar</button></form></section>
      <section className="border-t-2 border-tinta bg-branco p-5"><h2 className="text-[18px]">Preferências por perfil</h2><p className="mt-2 text-[13px] leading-5 text-cinza">Escolha se cada perfil recebe o aviso por e-mail, dentro do sistema ou pelos dois canais.</p><div className="mt-5 space-y-5">{perfis.map((perfil) => <div key={perfil}><h3 className="font-[family-name:var(--font-interface)] text-[13px] font-semibold">{perfilLabel[perfil]}</h3><div className="mt-2 space-y-2">{eventos.map((evento) => { const p = mapa.get(`${perfil}:${evento}`); return <form key={evento} action={atualizarPreferenciaAction} className="flex items-center justify-between gap-3 border-b border-linha pb-2 text-[13px]"><input type="hidden" name="perfil" value={perfil} /><input type="hidden" name="evento" value={evento} /><span>{eventoLabel[evento]}</span><span className="flex items-center gap-2 font-[family-name:var(--font-interface)] text-[11px] text-cinza"><label className="flex items-center gap-1"><input type="checkbox" name="email" defaultChecked={p?.email} /> E-mail</label><label className="flex items-center gap-1"><input type="checkbox" name="inApp" defaultChecked={p?.inApp} /> App</label><button className="text-azul-esc hover:underline">Salvar</button></span></form>; })}</div></div>)}</div></section></aside>
    </div>
  </div>;
}
