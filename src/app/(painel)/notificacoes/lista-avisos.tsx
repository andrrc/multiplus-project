/**
 * Lista de avisos agrupada por período (protótipo 10-avisos). É usada pela caixa de avisos da
 * Administradora (`/notificacoes`) e pela dos colaboradores (`/minhas-notificacoes`), que
 * mostram os mesmos avisos próprios do usuário.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import type { EventoNotificacao } from "@prisma/client";
import { formatarDataHoraBrasilia } from "@/lib/datas";
import { agruparAvisos } from "@/lib/avisos-agrupamento";
import { botaoDiscretoPequeno, botaoSecundarioPequeno } from "@/ui/botoes";
import { marcarNotificacaoLidaAction } from "./actions";

export const ROTULO_EVENTO: Record<EventoNotificacao, string> = {
  PRAZO_PROXIMO: "Prazo próximo",
  TAREFA_CONCLUIDA: "Tarefa concluída",
  CONCLUSAO_SOLICITADA: "Solicitação de conclusão",
  PROJETO_CONCLUIDO: "Projeto concluído",
  NOVO_COMENTARIO: "Novo comentário",
  ATRIBUICAO_RECEBIDA: "Atribuição recebida",
};

export type ItemAviso = {
  id: string;
  evento: EventoNotificacao;
  titulo: string;
  mensagem: string;
  url: string | null;
  lida: boolean;
  criadaEm: Date;
};

const SVG = (children: ReactNode) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);

/** Ícone e cores de cada tipo de aviso: a cor só carrega significado (atenção, conclusão, comentário). */
const ESTILO_EVENTO: Record<EventoNotificacao, { icone: ReactNode; cores: string }> = {
  CONCLUSAO_SOLICITADA: { icone: SVG(<><path d="M9 11l3 3 8-8" /><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" /></>), cores: "bg-ambar-cl text-ambar" },
  PRAZO_PROXIMO: { icone: SVG(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>), cores: "bg-ambar-cl text-ambar" },
  ATRIBUICAO_RECEBIDA: { icone: SVG(<><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0" /><path d="M19 8v6M16 11h6" /></>), cores: "bg-azul-cl text-azul-esc" },
  NOVO_COMENTARIO: { icone: SVG(<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12Z" />), cores: "bg-papel text-cinza" },
  TAREFA_CONCLUIDA: { icone: SVG(<path d="m5 12 5 5 9-10" />), cores: "bg-verde-cl text-verde-esc" },
  PROJETO_CONCLUIDO: { icone: SVG(<path d="m5 12 5 5 9-10" />), cores: "bg-verde-cl text-verde-esc" },
};

export function ListaAvisos({ itens, filtrado }: { itens: ItemAviso[]; filtrado: boolean }) {
  if (itens.length === 0) {
    return (
      <div className="rounded-cartao border border-linha bg-branco px-5 py-12 text-center text-cinza">
        <b className="mb-1 block font-semibold text-ink">{filtrado ? "Tudo em dia" : "Nenhum aviso por enquanto"}</b>
        {filtrado ? "Nenhum aviso com esses filtros." : "Quando houver um prazo, comentário ou atribuição, o aviso aparecerá aqui."}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-cartao border border-linha bg-branco">
      {agruparAvisos(itens).map(({ periodo, itens: doPeriodo }) => (
        <section key={periodo} aria-label={periodo}>
          <h2 className="border-t border-linha bg-cabecalho px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-faint first:border-t-0">{periodo}</h2>
          <ul>
            {doPeriodo.map((item) => {
              const estilo = ESTILO_EVENTO[item.evento];
              return (
                <li key={item.id} className={`relative grid grid-cols-[36px_minmax(0,1fr)] gap-x-3.5 gap-y-2 border-t border-linha px-5 py-3.5 first:border-t-0 sm:grid-cols-[36px_minmax(0,1fr)_auto] sm:items-start ${item.lida ? "" : "bg-azul-cl/40"}`}>
                  {!item.lida && <span role="img" aria-label="Não lida" className="absolute left-2 top-7 size-[7px] rounded-full bg-azul" />}
                  <span aria-hidden="true" className={`flex size-9 items-center justify-center rounded-cartao ${estilo.cores}`}>{estilo.icone}</span>
                  <div className="min-w-0">
                    <p className={`break-words text-[13px] ${item.lida ? "text-cinza" : "font-semibold text-ink"}`}>{ROTULO_EVENTO[item.evento]}</p>
                    <p className={`mt-0.5 break-words font-medium ${item.lida ? "text-cinza" : "text-ink"}`}>{item.titulo}</p>
                    <p className="mt-0.5 break-words text-sm text-cinza">{item.mensagem}</p>
                    <p className="mt-1 text-xs tabular-nums text-faint"><time dateTime={item.criadaEm.toISOString()}>{formatarDataHoraBrasilia(item.criadaEm)}</time></p>
                  </div>
                  <div className="col-span-full flex flex-wrap items-center gap-1.5 sm:col-span-1 sm:col-start-3 sm:justify-end">
                    {item.url && <Link href={item.url} className={botaoSecundarioPequeno}>Abrir registro</Link>}
                    {!item.lida && (
                      <form action={marcarNotificacaoLidaAction.bind(null, item.id)}>
                        <button className={botaoDiscretoPequeno}>Marcar como lida</button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Opções do seletor de tipo, na ordem em que os tipos são declarados. */
export const OPCOES_TIPO_AVISO = (Object.entries(ROTULO_EVENTO) as Array<[EventoNotificacao, string]>).map(([valor, rotulo]) => ({ valor, rotulo }));

/**
 * Aplica os filtros da URL (`lidos=nao` e `tipo=<evento>`). Valores desconhecidos são ignorados
 * em vez de esvaziar a lista; as contagens dos botões usam sempre a lista inteira.
 */
export function filtrarAvisos(itens: ItemAviso[], parametros: { lidos?: string | string[]; tipo?: string | string[] }) {
  const apenasNaoLidos = parametros.lidos === "nao";
  const tipo = OPCOES_TIPO_AVISO.find((opcao) => opcao.valor === parametros.tipo)?.valor ?? "";
  const visiveis = itens.filter((item) => (!apenasNaoLidos || !item.lida) && (!tipo || item.evento === tipo));
  return { visiveis, apenasNaoLidos, tipo, filtrado: apenasNaoLidos || tipo !== "" };
}
