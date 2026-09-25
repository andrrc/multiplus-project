const DIA_MS = 24 * 60 * 60 * 1000;
const FUSO_HORARIO = "America/Sao_Paulo";

function dataLocalHoje(hoje: Date) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_HORARIO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(hoje);
  const parte = (tipo: string) => Number(partes.find((item) => item.type === tipo)?.value);
  return Date.UTC(parte("year"), parte("month") - 1, parte("day"));
}

export function calcularDiasRestantes(prazo: Date, hoje = new Date()) {
  const prazoUTC = Date.UTC(prazo.getUTCFullYear(), prazo.getUTCMonth(), prazo.getUTCDate());
  return Math.round((prazoUTC - dataLocalHoje(hoje)) / DIA_MS);
}

export function IndicadorDiasRestantes({ prazo }: { prazo: Date | null }) {
  if (!prazo) return <span className="text-[13px] text-cinza">Sem prazo</span>;

  const dias = calcularDiasRestantes(prazo);
  const cores = dias <= 5
    ? "border-critico/30 bg-critico/8 text-critico"
    : dias <= 10
      ? "border-ambar/30 bg-ambar/8 text-ambar"
      : "border-verde-borda bg-verde-cl text-verde-esc";
  const texto = dias < 0
    ? `Atrasado ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia" : "dias"}`
    : dias === 0
      ? "Vence hoje"
      : `${dias} ${dias === 1 ? "dia" : "dias"}`;

  return (
    <span className={`inline-flex items-center rounded-[3px] border px-2.5 py-1 font-[family-name:var(--font-interface)] text-[13px] font-semibold tabular-nums ${cores}`}>
      {texto}
    </span>
  );
}
