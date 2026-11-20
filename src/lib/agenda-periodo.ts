import { dataDeHojeEmSaoPaulo } from "@/lib/datas";

/** Aceita somente ano-mês válido; parâmetros ausentes ou malformados caem no mês atual. */
const dataMes = (valor: string | undefined, agora: Date) => {
  if (!valor || !/^\d{4}-\d{2}$/.test(valor)) return { ano: agora.getUTCFullYear(), mes: agora.getUTCMonth() };
  const [ano, mes] = valor.split("-").map(Number);
  return { ano, mes: Math.min(11, Math.max(0, mes - 1)) };
};

/**
 * Intervalo mensal da agenda, em UTC; o dia de hoje é o civil de São Paulo, ainda que o processo rode em outro fuso.
 * A tela da agenda e a exportação em PDF usam esta mesma conta para mostrar o mesmo mês.
 */
export function intervaloDoMes(mes: string | undefined) {
  const hoje = new Date();
  const hojeCivil = new Date(dataDeHojeEmSaoPaulo(hoje));
  const atual = dataMes(mes, hojeCivil);
  const inicio = new Date(Date.UTC(atual.ano, atual.mes, 1));
  const fim = new Date(Date.UTC(atual.ano, atual.mes + 1, 0, 23, 59, 59));
  return { hoje, hojeCivil, atual, inicio, fim };
}
