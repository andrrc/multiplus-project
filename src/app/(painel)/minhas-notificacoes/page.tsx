/**
 * Página da rota `src/app/(painel)/minhas-notificacoes/page.tsx`. Recebe os parâmetros da URL ou da rota, valida o acesso no servidor, obtém os dados necessários e compõe a resposta visual; as regras de negócio permanecem nas funções de domínio chamadas por ela.
 */
import Link from "next/link";
import { formatarDataHoraBrasilia } from "@/lib/datas";
import { listarNotificacoes } from "@/lib/notificacoes";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { marcarNotificacaoLidaAction, marcarTodasNotificacoesLidasAction } from "../notificacoes/actions";

const eventoLabel: Record<string, string> = {
  PRAZO_PROXIMO: "Prazo próximo",
  TAREFA_CONCLUIDA: "Tarefa concluída",
  CONCLUSAO_SOLICITADA: "Solicitação de conclusão",
  PROJETO_CONCLUIDO: "Projeto concluído",
  NOVO_COMENTARIO: "Novo comentário",
  ATRIBUICAO_RECEBIDA: "Atribuição recebida",
};

export default async function MinhasNotificacoesPage() {
  const ctx = await exigirAcessoARota("/minhas-notificacoes");
  const { itens, naoLidas } = await listarNotificacoes(ctx);

  return <div className="w-full max-w-[900px]">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="font-[family-name:var(--font-interface)] text-[28px]">Notificações</h1><p className="mt-1.5 text-[15px] text-cinza">Avisos sobre suas tarefas e solicitações.</p></div>
      {naoLidas > 0 && <form action={marcarTodasNotificacoesLidasAction}><button className="min-h-11 rounded-[3px] border border-linha bg-branco px-4 font-[family-name:var(--font-interface)] text-[13px] font-medium">Marcar todas como lidas</button></form>}
    </div>
    {itens.length === 0 ? <div className="mt-7 border border-dashed border-linha bg-branco px-6 py-14 text-center"><p className="text-[17px]">Nenhuma notificação por enquanto.</p><p className="mt-2 text-[14px] text-cinza">Quando houver um prazo, comentário ou decisão, o aviso aparecerá aqui.</p></div> : <ol className="mt-7 divide-y divide-linha border-y border-linha">{itens.map((item) => <li key={item.id} className={`relative px-4 py-4 pl-6 ${item.lida ? "bg-papel/50" : "bg-branco"}`}>{!item.lida && <span className="absolute inset-y-0 left-0 w-1 bg-verde" aria-label="Não lida" />}<div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className={`font-[family-name:var(--font-interface)] text-[13px] ${item.lida ? "text-cinza" : "font-semibold text-tinta"}`}>{eventoLabel[item.evento] ?? "Aviso"}</p><p className="mt-1 break-words text-[16px]">{item.titulo}</p><p className="mt-1 break-words text-[14px] text-cinza">{item.mensagem}</p></div><time className="shrink-0 font-[family-name:var(--font-interface)] text-[11px] text-cinza">{formatarDataHoraBrasilia(item.criadaEm)}</time></div><div className="mt-3 flex flex-wrap gap-4 font-[family-name:var(--font-interface)] text-[12px]">{item.url && <Link href={item.url} className="inline-flex min-h-11 items-center text-azul-esc hover:underline">Abrir registro</Link>}{!item.lida && <form action={marcarNotificacaoLidaAction.bind(null, item.id)}><button className="min-h-11 text-cinza hover:text-tinta">Marcar como lida</button></form>}</div></li>)}</ol>}
  </div>;
}
