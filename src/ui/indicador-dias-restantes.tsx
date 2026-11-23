import { calcularDiasRestantes } from "@/lib/datas";
import { LIMITES_SEMAFORO_PADRAO, type LimitesSemaforo } from "@/lib/semaforo";
import { rotuloEnviadoEm } from "@/lib/prazo-em-conferencia";

// A conta de dias vive em `@/lib/datas`; é reexportada aqui para os usos e testes existentes.
export { calcularDiasRestantes };

/** Cores do selo: texto escuro sobre fundo claro, sem borda (padrão dos protótipos). */
const COR_NEUTRA = "bg-papel text-cinza";
const COR_VENCIDO = "bg-critico-cl text-critico";
const COR_ATENCAO = "bg-ambar-cl text-ambar";
const COR_EM_DIA = "bg-verde-cl text-verde-esc";
/** Envio com comprovante aguardando conferência: o prazo não conta, então não é atraso nem aviso de vencimento. */
const COR_CONFERENCIA = "bg-azul-cl text-azul-esc";

export function IndicadorSemaforoProjeto({
  prazo,
  status,
  ativo = true,
  limites = LIMITES_SEMAFORO_PADRAO,
  emConferenciaDesde = null,
}: {
  prazo: Date | null;
  status: string;
  ativo?: boolean;
  limites?: LimitesSemaforo;
  /** Instante do envio, quando há pedido pendente com comprovante (etapa 2): mostra "Enviado em dd/mm" no lugar do prazo. */
  emConferenciaDesde?: Date | null;
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
  } else if (emConferenciaDesde) {
    texto = rotuloEnviadoEm(emConferenciaDesde);
    cores = COR_CONFERENCIA;
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
