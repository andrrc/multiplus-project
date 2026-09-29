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

/** Conta dias de segunda a sexta entre hoje e o prazo; feriados contam como dias normais. */
export function calcularDiasUteisRestantes(prazo: Date, hoje = new Date()) {
  const prazoUTC = Date.UTC(prazo.getUTCFullYear(), prazo.getUTCMonth(), prazo.getUTCDate());
  const hojeUTC = dataLocalHoje(hoje);
  const direcao = prazoUTC < hojeUTC ? -1 : 1;
  let cursor = direcao < 0 ? hojeUTC : hojeUTC + DIA_MS;
  let dias = 0;

  while (direcao > 0 ? cursor <= prazoUTC : cursor >= prazoUTC) {
    const diaSemana = new Date(cursor).getUTCDay();
    if (diaSemana !== 0 && diaSemana !== 6) dias += 1;
    cursor += direcao * DIA_MS;
  }

  return direcao > 0 ? dias : -dias;
}

export function IndicadorSemaforoProjeto({
  prazo,
  status,
  ativo = true,
}: {
  prazo: Date | null;
  status: string;
  ativo?: boolean;
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
    cores = "border-critico/30 bg-critico/8 text-critico";
  } else if (!prazo) {
    texto = "Sem prazo";
    cores = "border-linha bg-branco text-cinza";
  } else {
    const dias = calcularDiasUteisRestantes(prazo);
    cores = dias <= 5
      ? "border-critico/30 bg-critico/8 text-critico"
      : dias <= 10
        ? "border-ambar/30 bg-ambar/8 text-ambar"
        : "border-verde-borda bg-verde-cl text-verde-esc";
    texto = dias < 0
      ? `Atrasado ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia útil" : "dias úteis"}`
      : calcularDiasRestantes(prazo) === 0
        ? "Vence hoje"
        : dias === 0
          ? "Prazo no fim de semana"
          : `${dias} ${dias === 1 ? "dia útil" : "dias úteis"}`;
  }

  return (
    <span className={`inline-flex items-center rounded-[3px] border px-2.5 py-1 font-[family-name:var(--font-interface)] text-[13px] font-semibold tabular-nums ${cores}`}>
      {texto}
    </span>
  );
}

export function IndicadorDiasRestantesProjeto({
  prazo,
  status,
  ativo = true,
}: {
  prazo: Date | null;
  status: string;
  ativo?: boolean;
}) {
  let texto: string;

  if (!ativo) {
    texto = "Desativado";
  } else if (status === "CONCLUIDO") {
    texto = "Concluído";
  } else if (status === "CANCELADO") {
    texto = "Cancelado";
  } else if (!prazo) {
    texto = "Sem prazo";
  } else {
    const dias = calcularDiasUteisRestantes(prazo);
    texto = dias < 0
      ? `Atrasado ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia útil" : "dias úteis"}`
      : calcularDiasRestantes(prazo) === 0
        ? "Vence hoje"
        : dias === 0
          ? "Prazo no fim de semana"
          : `${dias} ${dias === 1 ? "dia útil" : "dias úteis"}`;
  }

  return <span className="font-[family-name:var(--font-interface)] text-[13px] font-semibold tabular-nums text-tinta">{texto}</span>;
}
