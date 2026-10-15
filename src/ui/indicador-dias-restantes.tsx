import { LIMITES_SEMAFORO_PADRAO, type LimitesSemaforo } from "@/lib/semaforo";

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

/** Conta dias corridos entre hoje (no fuso de São Paulo) e o prazo; negativo quando já venceu. */
export function calcularDiasRestantes(prazo: Date, hoje = new Date()) {
  const prazoUTC = Date.UTC(prazo.getUTCFullYear(), prazo.getUTCMonth(), prazo.getUTCDate());
  return Math.round((prazoUTC - dataLocalHoje(hoje)) / DIA_MS);
}

export function IndicadorSemaforoProjeto({
  prazo,
  status,
  ativo = true,
  limites = LIMITES_SEMAFORO_PADRAO,
}: {
  prazo: Date | null;
  status: string;
  ativo?: boolean;
  limites?: LimitesSemaforo;
}) {
  let texto: string;
  let cores: string;

  if (!ativo) {
    texto = "Desativado";
    cores = "border-linha bg-papel text-cinza";
  } else if (status === "CONCLUIDO") {
    texto = "Concluído";
    cores = "border-verde-borda bg-verde-cl text-verde-esc";
  } else if (status === "CANCELADO") {
    texto = "Cancelado";
    cores = "border-linha bg-papel text-cinza";
  } else if (!prazo) {
    texto = "Sem prazo";
    cores = "border-linha bg-branco text-cinza";
  } else {
    const dias = calcularDiasRestantes(prazo);
    // Vermelho só para prazo vencido; do dia do prazo até o limite configurado, âmbar.
    cores = dias < 0
      ? "border-critico bg-critico text-branco"
      : dias <= limites.diasAmareloAte
        ? "border-ambar/30 bg-ambar/8 text-ambar"
        : "border-verde-borda bg-verde-cl text-verde-esc";
    texto = dias < 0
      ? `Atrasado ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia" : "dias"}`
      : dias === 0
        ? "Vence hoje"
        : `${dias} ${dias === 1 ? "dia" : "dias"}`;
  }

  return (
    <span className={`inline-flex items-center rounded-[3px] border px-2.5 py-1 font-[family-name:var(--font-interface)] text-[13px] font-semibold tabular-nums ${cores}`}>
      {texto}
    </span>
  );
}
