const FUSO_HORARIO = "America/Sao_Paulo";

/**
 * Data de hoje no horário de Brasília, como meia-noite UTC (o mesmo formato em que os prazos são
 * gravados). Semáforo e regra de atraso usam esta função para virarem o dia juntos, à meia-noite
 * de Brasília, e não às 21h, quando o UTC já está no dia seguinte.
 */
export function dataDeHojeEmSaoPaulo(agora: Date = new Date()): number {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_HORARIO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(agora);
  const parte = (tipo: string) => Number(partes.find((item) => item.type === tipo)?.value);
  return Date.UTC(parte("year"), parte("month") - 1, parte("day"));
}
