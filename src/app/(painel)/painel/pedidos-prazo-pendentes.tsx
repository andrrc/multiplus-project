import Link from "next/link";
import { rotaPedidoPrazo, type PedidoComAlvo } from "@/lib/pedidos-prazo";
import { rotuloTipoPedido } from "@/lib/pedidos-prazo-regras";
import { Cartao } from "@/ui/cartao";

export function PedidosPrazoPendentes({
  pedidos, perfil,
}: { pedidos: PedidoComAlvo[]; perfil: "ADMIN" | "ADMIN_INTERNO" }) {
  if (pedidos.length === 0) return null;
  return (
    <Cartao id="pedidos-prazo" titulo="Aguardando sua decisão" semMargem>
      <ul className="divide-y divide-linha">
        {pedidos.map((pedido) => {
          const tarefa = pedido.tarefa ?? pedido.subtarefa?.tarefa;
          if (!tarefa) return null;
          return (
            <li key={pedido.id} className="min-w-0 px-5 py-3.5 [overflow-wrap:anywhere]">
              <p className="text-xs text-cinza">{rotuloTipoPedido(pedido.tipo)} · {pedido.solicitadoPorNome}</p>
              <Link href={rotaPedidoPrazo(perfil, tarefa.id, pedido.subtarefaId, pedido.id)}
                className="text-sm font-medium text-azul-esc hover:underline">
                {pedido.tarefa?.nome ?? pedido.subtarefa?.titulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </Cartao>
  );
}
