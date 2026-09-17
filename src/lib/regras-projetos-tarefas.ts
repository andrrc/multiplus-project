import type { Periodicidade } from "@prisma/client";

export type PeriodicidadeLike = Periodicidade | "SEMANAL" | "MENSAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";

type DataLike = Date | string;

function dataUTC(data: DataLike): Date {
  const valor = data instanceof Date ? data : new Date(data);
  if (Number.isNaN(valor.getTime())) throw new Error("Data inválida");
  return new Date(Date.UTC(valor.getUTCFullYear(), valor.getUTCMonth(), valor.getUTCDate()));
}

function diasNoMes(ano: number, mesZeroBased: number): number {
  return new Date(Date.UTC(ano, mesZeroBased + 1, 0)).getUTCDate();
}

function dataMensalAncorada(ano: number, mesZeroBased: number, diaOriginal: number): Date {
  return new Date(Date.UTC(ano, mesZeroBased, Math.min(diaOriginal, diasNoMes(ano, mesZeroBased))));
}

function mesesDaPeriodicidade(periodicidade: PeriodicidadeLike): number | null {
  switch (periodicidade) {
    case "MENSAL":
      return 1;
    case "TRIMESTRAL":
      return 3;
    case "SEMESTRAL":
      return 6;
    case "ANUAL":
      return 12;
    default:
      return null;
  }
}

/** RN-008 — calcula a próxima ocorrência sempre ancorada no prazo original da série. */
export function calcularProximaOcorrencia(
  prazoAtual: DataLike,
  periodicidade: PeriodicidadeLike | null | undefined,
  prazoOriginal: DataLike = prazoAtual,
): Date | null {
  if (!periodicidade) return null;

  const atual = dataUTC(prazoAtual);
  const original = dataUTC(prazoOriginal);

  if (periodicidade === "SEMANAL") {
    return new Date(atual.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  const passoEmMeses = mesesDaPeriodicidade(periodicidade);
  if (passoEmMeses === null) return null;

  const mesesDecorridos =
    (atual.getUTCFullYear() - original.getUTCFullYear()) * 12 +
    (atual.getUTCMonth() - original.getUTCMonth());
  const ocorrenciasDecorridas = Math.max(0, Math.floor(mesesDecorridos / passoEmMeses));
  const proximoIndice = ocorrenciasDecorridas + 1;
  const mesesDoAlvo = original.getUTCMonth() + proximoIndice * passoEmMeses;
  const ano = original.getUTCFullYear() + Math.floor(mesesDoAlvo / 12);
  const mes = ((mesesDoAlvo % 12) + 12) % 12;

  return dataMensalAncorada(ano, mes, original.getUTCDate());
}

/** RN-001 — o dia do prazo ainda conta como em dia; atraso começa no dia seguinte. */
export function estaAtrasada(
  prazo: DataLike | null | undefined,
  concluida: boolean,
  hoje: DataLike = new Date(),
): boolean {
  if (!prazo || concluida) return false;
  return dataUTC(prazo).getTime() < dataUTC(hoje).getTime();
}

export type TarefaParaIndicador = {
  ativo: boolean;
  prazo: DataLike | null | undefined;
  status?: string | null;
  concluida?: boolean;
};

export type IndicadorEmDia = {
  total: number;
  emDia: number;
  percentual: number | null;
};

function tarefaConcluida(tarefa: TarefaParaIndicador): boolean {
  return tarefa.concluida === true || tarefa.status === "CONCLUIDO" || tarefa.status === "Concluído";
}

/** RF-009 — desativadas saem do denominador; conjunto vazio vira percentual nulo (exibe —). */
export function calcularPercentualEmDia(
  tarefas: readonly TarefaParaIndicador[],
  hoje: DataLike = new Date(),
): IndicadorEmDia {
  const ativas = tarefas.filter((tarefa) => tarefa.ativo);
  const emDia = ativas.filter((tarefa) => !estaAtrasada(tarefa.prazo, tarefaConcluida(tarefa), hoje)).length;

  return {
    total: ativas.length,
    emDia,
    percentual: ativas.length === 0 ? null : Math.round((emDia / ativas.length) * 100),
  };
}

export function filtrarAtivos<T extends { ativo: boolean }>(registros: readonly T[]): T[] {
  return registros.filter((registro) => registro.ativo);
}

export type TarefaParaProjecao = {
  id: string;
  ativo: boolean;
  prazo: DataLike | null | undefined;
  prazoOriginal?: DataLike | null;
  periodicidade?: PeriodicidadeLike | null;
  status?: string | null;
  serieId?: string | null;
  serieEncerradaEm?: DataLike | null;
};

export type OcorrenciaMaterializada = {
  serieId?: string | null;
  prazo: DataLike;
};

function mesmaData(a: DataLike, b: DataLike): boolean {
  return dataUTC(a).getTime() === dataUTC(b).getTime();
}

/** ADR-009 — projeta ocorrências futuras em memória, sem persistir e sem duplicar materializadas. */
export function projetarOcorrenciasFuturas(
  tarefa: TarefaParaProjecao,
  inicio: DataLike,
  fim: DataLike,
  materializadas: readonly OcorrenciaMaterializada[] = [],
): Date[] {
  if (!tarefa.ativo || tarefa.status === "CANCELADO" || tarefa.status === "Cancelado") return [];
  if (!tarefa.periodicidade || tarefa.serieEncerradaEm || !tarefa.prazo) return [];

  const inicioUTC = dataUTC(inicio);
  const fimUTC = dataUTC(fim);
  if (inicioUTC > fimUTC) return [];

  const ancora = tarefa.prazoOriginal ?? tarefa.prazo;
  let cursor = dataUTC(tarefa.prazo);
  const projetadas: Date[] = [];

  // Uma janela de Agenda não deve exigir uma série infinita. O limite também protege contra
  // dados inconsistentes, como uma periodicidade desconhecida retornada por uma migration antiga.
  for (let i = 0; i < 10_000; i += 1) {
    const proxima = calcularProximaOcorrencia(cursor, tarefa.periodicidade, ancora);
    if (!proxima || proxima > fimUTC) break;
    cursor = proxima;

    const jaMaterializada = materializadas.some(
      (ocorrencia) => ocorrencia.serieId === tarefa.serieId && mesmaData(ocorrencia.prazo, proxima),
    );
    if (!jaMaterializada && proxima >= inicioUTC) projetadas.push(proxima);
  }

  return projetadas;
}
