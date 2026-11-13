import { dataDeHojeEmSaoPaulo } from "@/lib/datas";
import { LIMITES_SEMAFORO_PADRAO, type LimitesSemaforo } from "@/lib/semaforo";

const DIA_MS = 24 * 60 * 60 * 1000;

/** Conta dias corridos entre hoje (no fuso de São Paulo) e o prazo; negativo quando já venceu. */
export function calcularDiasRestantes(prazo: Date, hoje = new Date()) {
  // Normaliza o prazo para meia-noite UTC para comparar somente o dia civil.
  const prazoUTC = Date.UTC(prazo.getUTCFullYear(), prazo.getUTCMonth(), prazo.getUTCDate());
  // O dia atual é obtido no fuso de São Paulo, igual às regras de prazo do servidor.
  return Math.round((prazoUTC - dataDeHojeEmSaoPaulo(hoje)) / DIA_MS);
}

/** Cores do selo: texto escuro sobre fundo claro, sem borda (padrão dos protótipos). */
const COR_NEUTRA = "bg-papel text-cinza";
const COR_VENCIDO = "bg-critico-cl text-critico";
const COR_ATENCAO = "bg-ambar-cl text-ambar";
const COR_EM_DIA = "bg-verde-cl text-verde-esc";

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
  // Texto e cor são derivados em conjunto para que o estado tenha sempre um rótulo legível.
  let texto: string;
  let cores: string;

  if (!ativo) {
    texto = "Desativado";
    cores = COR_NEUTRA;
  } else if (status === "CONCLUIDO") {
    texto = "Concluído";
    cores = COR_EM_DIA;
  } else if (status === "CANCELADO") {
    texto = "Cancelado";
    cores = COR_NEUTRA;
  } else if (!prazo) {
    texto = "Sem prazo";
    cores = COR_NEUTRA;
  } else {
    // Prazos ativos têm os dias restantes avaliados contra o limite global configurável.
    const dias = calcularDiasRestantes(prazo);
    // Vermelho só para prazo vencido; do dia do prazo até o limite configurado, âmbar.
    cores = dias < 0
      ? COR_VENCIDO
      : dias <= limites.diasAmareloAte
        ? COR_ATENCAO
        : COR_EM_DIA;
    texto = dias < 0
      ? `Atrasado ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia" : "dias"}`
      : dias === 0
        ? "Vence hoje"
        : dias === 1
          ? "Amanhã"
          : `Em ${dias} dias`;
  }

  // Exibe a quantidade com algarismos alinhados e as cores definidas para o semáforo.
  return (
    <span className={`inline-block whitespace-nowrap rounded-selo px-2 py-[3px] font-[family-name:var(--font-interface)] text-xs font-semibold tabular-nums ${cores}`}>
      {texto}
    </span>
  );
}
