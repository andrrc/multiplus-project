import type { PedidoPrazo } from "@prisma/client";
import { dataDeHojeEmSaoPaulo, formatarDataCadastro, formatarDataHoraBrasilia } from "@/lib/datas";
import type { AlvoPedidoPrazo } from "@/lib/pedidos-prazo";
import { motivoBloqueioPedido, rotuloStatusPedido } from "@/lib/pedidos-prazo-regras";
import { Cartao } from "@/ui/cartao";
import { DecidirPrazo, RetirarPrazo, SolicitarPrazo } from "./formularios";

type Props = {
  tarefaId: string;
  alvo: AlvoPedidoPrazo;
  prazoVigente: Date | null;
  prazoDaTarefa?: Date | null;
  previsaoDoProjeto?: Date | null;
  estado?: { fechado: boolean; conferencia: boolean; pendente: boolean; prazo: Date | null };
  pedidos: PedidoPrazo[];
  podeDecidir: boolean;
  podeRetirar: boolean;
};

const data = (prazo: Date | null) => prazo ? formatarDataCadastro(prazo) : "Sem prazo";

function diasDeProrrogacao(atual: Date, novo: Date) {
  const dias = Math.round((novo.getTime() - atual.getTime()) / 86_400_000);
  return dias > 0 ? ` · ${dias} ${dias === 1 ? "dia a mais" : "dias a mais"}` : "";
}

export function CartaoPedidosPrazo({
  tarefaId, alvo, prazoVigente, prazoDaTarefa, previsaoDoProjeto, estado, pedidos, podeDecidir, podeRetirar,
}: Props) {
  const temPendenteVisivel = pedidos.some((pedido) => pedido.status === "PENDENTE");
  const bloqueio = estado ? motivoBloqueioPedido(estado) : null;
  if (!estado && pedidos.length === 0) return null;
  const dataMinima = new Date(Math.max(
    dataDeHojeEmSaoPaulo(),
    estado?.prazo ? Date.parse(estado.prazo.toISOString().slice(0, 10)) + 86_400_000 : 0,
  )).toISOString().slice(0, 10);
  return (
    <div className="min-w-0 space-y-3">
      {estado && !bloqueio && <SolicitarPrazo tarefaId={tarefaId} alvo={alvo} temPrazo={!!estado.prazo} dataMinima={dataMinima} />}
      {bloqueio && (!temPendenteVisivel || estado?.conferencia) && (
        <p className="text-sm text-cinza">{bloqueio}</p>
      )}
      {pedidos.length > 0 && <Cartao titulo="Pedidos de prazo" semMargem>
        <ul className="divide-y divide-linha">
          {pedidos.map((pedido) => {
            const pendente = pedido.status === "PENDENTE";
            const prazoMudou = pedido.tipo === "PRAZO" && pendente &&
              prazoVigente?.getTime() !== pedido.prazoAtual?.getTime();
            const prazoBase = pendente ? prazoVigente : pedido.prazoSubstituido ?? pedido.prazoAtual;
            const ultrapassaTarefa = pedido.prazoNovo && prazoDaTarefa && pedido.prazoNovo > prazoDaTarefa;
            const ultrapassaProjeto = pedido.prazoNovo && previsaoDoProjeto && pedido.prazoNovo > previsaoDoProjeto;
            return (
              <li key={pedido.id} id={`pedido-prazo-${pedido.id}`} className="min-w-0 space-y-3 p-4 [overflow-wrap:anywhere]">
                <div>
                  <h3 className="text-sm font-semibold text-ink">{rotuloStatusPedido(pedido.tipo, pedido.status)}</h3>
                  <p className="mt-1 text-xs text-cinza">{pedido.solicitadoPorNome} · {formatarDataHoraBrasilia(pedido.solicitadoEm)}</p>
                </div>
                {pedido.prazoNovo && <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-cinza">{pendente && !prazoMudou ? "Prazo atual" : "Prazo na abertura"}</dt>
                    <dd>{data(pedido.prazoAtual)}</dd>
                  </div>
                  <div>
                    <dt className="text-cinza">Nova data pedida</dt>
                    <dd>{data(pedido.prazoNovo)}{prazoBase && diasDeProrrogacao(prazoBase, pedido.prazoNovo)}</dd>
                  </div>
                  {prazoMudou && <div><dt className="text-cinza">Prazo vigente</dt><dd>{data(prazoVigente)}</dd></div>}
                  {pedido.prazoSubstituido && pedido.prazoSubstituido.getTime() !== pedido.prazoAtual?.getTime() &&
                    <div><dt className="text-cinza">Prazo substituído</dt><dd>{data(pedido.prazoSubstituido)}</dd></div>}
                </dl>}
                <p className="whitespace-pre-wrap text-sm"><strong className="font-medium">Motivo:</strong> {pedido.motivo}</p>
                {pedido.respostaDecisao && <p className="whitespace-pre-wrap text-sm"><strong className="font-medium">Resposta:</strong> {pedido.respostaDecisao}</p>}
                {pedido.decididoEm && <p className="text-xs text-cinza">{pedido.decididoPorNome ? `${pedido.decididoPorNome} · ` : ""}{formatarDataHoraBrasilia(pedido.decididoEm)}</p>}
                {pendente && podeDecidir && (
                  <>
                    {prazoMudou && <p className="text-sm text-ambar">O prazo mudou desde o pedido. Confira a data vigente antes de aprovar.</p>}
                    {ultrapassaTarefa && <p className="text-sm text-ambar">A data pedida ultrapassa o prazo da tarefa principal.</p>}
                    {ultrapassaProjeto && <p className="text-sm text-ambar">A data pedida ultrapassa a previsão do projeto.</p>}
                    <DecidirPrazo tarefaId={tarefaId} alvo={alvo} pedidoId={pedido.id}
                      prazoConfirmado={prazoMudou ? prazoVigente?.toISOString() ?? "sem-prazo" : null} />
                  </>
                )}
                {pendente && podeRetirar && <RetirarPrazo tarefaId={tarefaId} alvo={alvo} pedidoId={pedido.id} />}
              </li>
            );
          })}
        </ul>
      </Cartao>}
    </div>
  );
}
