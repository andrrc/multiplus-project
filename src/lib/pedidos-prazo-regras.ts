import type { StatusPedidoPrazo, TipoPedidoPrazo } from "@prisma/client";
import { dataDeHojeEmSaoPaulo } from "@/lib/datas";
import { calcularProximaOcorrencia, type PeriodicidadeLike } from "@/lib/regras-projetos-tarefas";

export const LIMITE_TEXTO_PEDIDO = 2000;

export type PrazoDoItem = {
  prazo: Date | null;
  periodicidade: PeriodicidadeLike | null;
  ancora: Date | null;
  dia_semana: number | null;
};

export function lerDataPedido(valor: string): Date {
  const data = new Date(valor + "T00:00:00.000Z");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor.startsWith("0000-") ||
      !Number.isFinite(data.getTime()) || data.toISOString().slice(0, 10) !== valor) {
    throw new Error("Informe uma nova data válida.");
  }
  return data;
}

export function validarNovaDataPedido(item: PrazoDoItem, novaData: Date, agora = new Date()) {
  if (!item.prazo) throw new Error("O item não tem prazo. Informe um impedimento.");
  const atual = lerDataPedido(item.prazo.toISOString().slice(0, 10));
  if (novaData <= atual) throw new Error("A nova data precisa ser posterior ao prazo atual.");
  if (novaData.getTime() < dataDeHojeEmSaoPaulo(agora)) throw new Error("A nova data não pode ser anterior a hoje.");
  const proxima = calcularProximaOcorrencia(atual, item.periodicidade, item.ancora ?? atual, item.dia_semana);
  if (proxima && novaData >= proxima) throw new Error("A nova data precisa ser anterior à próxima ocorrência.");
}

export function validarTextoPedido(valor: string, mensagem: string, obrigatorio: boolean): string | null {
  const texto = valor.trim();
  if ((obrigatorio && !texto) || [...texto].length > LIMITE_TEXTO_PEDIDO) throw new Error(mensagem);
  return texto || null;
}

export function rotuloTipoPedido(tipo: TipoPedidoPrazo): string {
  return tipo === "PRAZO" ? "Pedido de prazo" : "Impedimento";
}

export function rotuloStatusPedido(tipo: TipoPedidoPrazo, status: StatusPedidoPrazo): string {
  const estados: Record<StatusPedidoPrazo, string> = {
    PENDENTE: "aguardando decisão",
    APROVADO: tipo === "PRAZO" ? "aprovado" : "aceito",
    RECUSADO: "recusado",
    CANCELADO: "cancelado",
  };
  return `${rotuloTipoPedido(tipo)}: ${estados[status]}`;
}

export function motivoBloqueioPedido(estado: { fechado: boolean; conferencia: boolean; pendente: boolean }): string | null {
  if (estado.fechado) return "O item está fechado ou indisponível.";
  if (estado.conferencia) return "O item está em conferência de comprovantes.";
  if (estado.pendente) return "Já existe um pedido pendente para este item.";
  return null;
}
