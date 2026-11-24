import type { Periodicidade } from "@prisma/client";
import { dataDeHojeEmSaoPaulo } from "@/lib/datas";

export type PeriodicidadeLike = Periodicidade | "SEMANAL" | "MENSAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";

type DataLike = Date | string;

function dataUTC(data: DataLike): Date {
  // Converte texto para Date quando necessário e rejeita datas que não podem ser interpretadas.
  const valor = data instanceof Date ? data : new Date(data);
  if (Number.isNaN(valor.getTime())) throw new Error("Data inválida");
  // Zera o horário para que comparações usem apenas ano, mês e dia em UTC.
  return new Date(Date.UTC(valor.getUTCFullYear(), valor.getUTCMonth(), valor.getUTCDate()));
}

function diasNoMes(ano: number, mesZeroBased: number): number {
  // Dia zero do mês seguinte corresponde ao último dia do mês solicitado.
  return new Date(Date.UTC(ano, mesZeroBased + 1, 0)).getUTCDate();
}

function dataMensalAncorada(ano: number, mesZeroBased: number, diaOriginal: number): Date {
  // Usa o dia original quando existe ou o último dia disponível nos meses mais curtos.
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

function ocorrenciaMensalDaSerie(original: Date, indice: number, passoEmMeses: number): Date {
  const mesesDoAlvo = original.getUTCMonth() + indice * passoEmMeses;
  // Normaliza o deslocamento de meses em ano e mês, mesmo ao atravessar dezembro.
  const ano = original.getUTCFullYear() + Math.floor(mesesDoAlvo / 12);
  const mes = ((mesesDoAlvo % 12) + 12) % 12;
  return dataMensalAncorada(ano, mes, original.getUTCDate());
}

/**
 * Índice da ocorrência a que o prazo pertence: a maior data da série que não passa dele (0 é a própria âncora).
 * O índice por meses civis pode ter avançado um ciclo quando o prazo foi prorrogado para depois da data da série
 * (31/01 prorrogado para 01/02 cai no mês de 28/02, mas ainda é a ocorrência de 31/01); por isso recuamos
 * enquanto a data do índice ultrapassa o prazo.
 */
function indiceDaOcorrenciaMensal(atual: Date, original: Date, passoEmMeses: number): number {
  const mesesDecorridos =
    (atual.getUTCFullYear() - original.getUTCFullYear()) * 12 +
    (atual.getUTCMonth() - original.getUTCMonth());
  // A quantidade inteira de ciclos evita arredondar datas para uma ocorrência futura indevida.
  let indice = Math.max(0, Math.floor(mesesDecorridos / passoEmMeses));
  while (indice > 0 && ocorrenciaMensalDaSerie(original, indice, passoEmMeses).getTime() > atual.getTime()) {
    indice -= 1;
  }
  return indice;
}

/**
 * RN-008 — calcula a próxima ocorrência sempre ancorada no prazo original da série.
 *
 * O prazo atual pode ter sido prorrogado (pedido de prazo aprovado), desde que fique antes da próxima ocorrência;
 * a ocorrência seguinte continua sendo a mesma que seria sem a prorrogação. Limite: semanal sem `diaSemana`
 * soma sete dias ao prazo atual e, por isso, acompanha a prorrogação (tarefas novas sempre guardam o dia).
 */
export function calcularProximaOcorrencia(
  prazoAtual: DataLike,
  periodicidade: PeriodicidadeLike | null | undefined,
  prazoOriginal: DataLike = prazoAtual,
  diaSemana?: number | null,
): Date | null {
  // Tarefa sem periodicidade não pertence a uma série recorrente.
  if (!periodicidade) return null;

  const atual = dataUTC(prazoAtual);
  const original = dataUTC(prazoOriginal);

  if (periodicidade === "SEMANAL") {
    // Sem dia semanal válido, mantém o comportamento de intervalo fixo de sete dias.
    if (diaSemana == null || !Number.isInteger(diaSemana) || diaSemana < 0 || diaSemana > 6) {
      return new Date(atual.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
    // Módulo circular encontra o próximo dia escolhido; zero vira sete para nunca repetir o mesmo dia.
    const diasAteProxima = ((diaSemana - atual.getUTCDay() + 7) % 7) || 7;
    const proxima = new Date(atual);
    proxima.setUTCDate(proxima.getUTCDate() + diasAteProxima);
    return proxima;
  }

  const passoEmMeses = mesesDaPeriodicidade(periodicidade);
  if (passoEmMeses === null) return null;

  return ocorrenciaMensalDaSerie(original, indiceDaOcorrenciaMensal(atual, original, passoEmMeses) + 1, passoEmMeses);
}

/**
 * Data da série da ocorrência atual: a ocorrência a que o prazo vigente pertence, mesmo depois de uma prorrogação.
 * Serve de referência para as subtarefas copiadas à próxima ocorrência. Sem série (sem periodicidade, ou semanal
 * sem dia fixo, que só existe em dado antigo), devolve o próprio prazo, que é a medida de antes.
 */
export function dataDaSerieDaOcorrencia(
  prazoAtual: DataLike,
  periodicidade: PeriodicidadeLike | null | undefined,
  prazoOriginal: DataLike = prazoAtual,
  diaSemana?: number | null,
): Date | null {
  if (!periodicidade) return null;
  const atual = dataUTC(prazoAtual);
  const original = dataUTC(prazoOriginal);

  if (periodicidade === "SEMANAL") {
    if (diaSemana == null || !Number.isInteger(diaSemana) || diaSemana < 0 || diaSemana > 6) return atual;
    // O dia escolhido mais recente que não passa do prazo (o próprio prazo, quando já cai nele).
    const diasDesde = (atual.getUTCDay() - diaSemana + 7) % 7;
    return new Date(atual.getTime() - diasDesde * 24 * 60 * 60 * 1000);
  }

  const passoEmMeses = mesesDaPeriodicidade(periodicidade);
  if (passoEmMeses === null) return null;
  return ocorrenciaMensalDaSerie(original, indiceDaOcorrenciaMensal(atual, original, passoEmMeses), passoEmMeses);
}

/**
 * RN-001 — o dia do prazo ainda conta como em dia; atraso começa no dia seguinte, à meia-noite de
 * Brasília (o mesmo "hoje" do semáforo). `agora` é um instante, não uma data.
 */
export function estaAtrasada(
  prazo: DataLike | null | undefined,
  concluida: boolean,
  agora: DataLike = new Date(),
): boolean {
  // Prazo ausente e item concluído nunca entram como atraso.
  if (!prazo || concluida) return false;
  const instante = agora instanceof Date ? agora : new Date(agora);
  if (Number.isNaN(instante.getTime())) throw new Error("Data inválida");
  // Igualdade continua em dia; só datas anteriores à meia-noite de hoje estão atrasadas.
  return dataUTC(prazo).getTime() < dataDeHojeEmSaoPaulo(instante);
}

export type TarefaParaIndicador = {
  ativo: boolean;
  prazo: DataLike | null | undefined;
  status?: string | null;
  concluida?: boolean;
  /** Envio com comprovante aguardando conferência: o prazo não conta, então o item está em dia. */
  emConferenciaDesde?: Date | null;
};

export type IndicadorEmDia = {
  total: number;
  emDia: number;
  percentual: number | null;
};

function tarefaConcluida(tarefa: TarefaParaIndicador): boolean {
  // Aceita o booleano legado e as duas representações de status presentes nos dados.
  return tarefa.concluida === true || tarefa.status === "CONCLUIDO" || tarefa.status === "Concluído";
}

/** RF-009 — desativadas saem do denominador; conjunto vazio vira percentual nulo (exibe —). */
export function calcularPercentualEmDia(
  tarefas: readonly TarefaParaIndicador[],
  hoje: DataLike = new Date(),
): IndicadorEmDia {
  // O denominador considera apenas registros ativos.
  const ativas = tarefas.filter((tarefa) => tarefa.ativo);
  // Concluídas e itens em conferência não atrasam; tarefas sem prazo também permanecem elegíveis como em dia.
  const emDia = ativas.filter((tarefa) => !estaAtrasada(tarefa.prazo, tarefaConcluida(tarefa) || !!tarefa.emConferenciaDesde, hoje)).length;

  return {
    total: ativas.length,
    emDia,
    percentual: ativas.length === 0 ? null : Math.round((emDia / ativas.length) * 100),
  };
}

export type RegistroParaConclusao = { ativo: boolean; status: string };
export type IndicadorConclusao = { total: number; concluidas: number; percentual: number | null };

/** RF-048/RN-014 — conclusão ignora registros desativados e cancelados. */
export function calcularPercentualConclusao(registros: readonly RegistroParaConclusao[]): IndicadorConclusao {
  // Cancelados e desativados ficam fora tanto do total quanto da porcentagem concluída.
  const elegiveis = registros.filter((registro) => registro.ativo && registro.status !== "CANCELADO" && registro.status !== "Cancelado");
  const concluidas = elegiveis.filter((registro) => registro.status === "CONCLUIDO" || registro.status === "Concluído").length;
  return {
    total: elegiveis.length,
    concluidas,
    percentual: elegiveis.length === 0 ? null : Math.round((concluidas / elegiveis.length) * 100),
  };
}

export type RegistroParaAtualizacao = { ativo: boolean; atualizadoEm: Date | null };
export type ComentarioParaAtualizacao = { registroAtivo: boolean; criadoEm: Date };

/** RN-015 — agrega escritas em registros ativos; leituras não são entradas dessa regra. */
export function calcularUltimaAtualizacaoProjeto(dados: {
  projeto: RegistroParaAtualizacao;
  tarefas: readonly RegistroParaAtualizacao[];
  subtarefas: readonly RegistroParaAtualizacao[];
  documentos: readonly RegistroParaAtualizacao[];
  comentarios: readonly ComentarioParaAtualizacao[];
}): Date | null {
  // Reúne datas de gravação de registros ativos e comentários ligados a itens ativos.
  const datas = [
    ...(dados.projeto.ativo && dados.projeto.atualizadoEm ? [dados.projeto.atualizadoEm] : []),
    ...dados.tarefas.filter((item) => item.ativo && item.atualizadoEm).map((item) => item.atualizadoEm!),
    ...dados.subtarefas.filter((item) => item.ativo && item.atualizadoEm).map((item) => item.atualizadoEm!),
    ...dados.documentos.filter((item) => item.ativo && item.atualizadoEm).map((item) => item.atualizadoEm!),
    ...dados.comentarios.filter((item) => item.registroAtivo).map((item) => item.criadoEm),
  ];
  // O acumulador começa vazio e guarda a maior data encontrada; sem escritas, retorna null.
  return datas.reduce<Date | null>((maisRecente, atual) => !maisRecente || atual > maisRecente ? atual : maisRecente, null);
}

export function filtrarAtivos<T extends { ativo: boolean }>(registros: readonly T[]): T[] {
  // Utilitário genérico para listas cujo modelo compartilha o marcador de soft delete.
  return registros.filter((registro) => registro.ativo);
}

export type TarefaParaProjecao = {
  id: string;
  ativo: boolean;
  prazo: DataLike | null | undefined;
  prazoOriginal?: DataLike | null;
  periodicidade?: PeriodicidadeLike | null;
  diaSemana?: number | null;
  status?: string | null;
  serieId?: string | null;
  serieEncerradaEm?: DataLike | null;
};

/**
 * Próxima ocorrência da tarefa recorrente, para o resumo da página da tarefa. Só existe enquanto a tarefa está aberta e
 * a série segue ativa: concluída, cancelada, desativada ou com a série encerrada já não gera a próxima ao ser concluída.
 */
export function proximaOcorrenciaDaTarefa(tarefa: Omit<TarefaParaProjecao, "id">): Date | null {
  if (!tarefa.ativo || !tarefa.prazo || !tarefa.periodicidade || tarefa.serieEncerradaEm) return null;
  if (tarefa.status === "CANCELADO" || tarefa.status === "Cancelado" || tarefa.status === "CONCLUIDO" || tarefa.status === "Concluído") return null;
  return calcularProximaOcorrencia(tarefa.prazo, tarefa.periodicidade, tarefa.prazoOriginal ?? tarefa.prazo, tarefa.diaSemana);
}

export type OcorrenciaMaterializada = {
  serieId?: string | null;
  prazo: DataLike;
};

function mesmaData(a: DataLike, b: DataLike): boolean {
  // Compara apenas a data UTC, sem depender do horário presente nos valores.
  return dataUTC(a).getTime() === dataUTC(b).getTime();
}

/** ADR-009 — projeta ocorrências futuras em memória, sem persistir e sem duplicar materializadas. */
export function projetarOcorrenciasFuturas(
  tarefa: TarefaParaProjecao,
  inicio: DataLike,
  fim: DataLike,
  materializadas: readonly OcorrenciaMaterializada[] = [],
): Date[] {
  // Séries encerradas, canceladas ou inativas não geram itens virtuais na agenda.
  if (!tarefa.ativo || tarefa.status === "CANCELADO" || tarefa.status === "Cancelado") return [];
  if (!tarefa.periodicidade || tarefa.serieEncerradaEm || !tarefa.prazo) return [];

  const inicioUTC = dataUTC(inicio);
  const fimUTC = dataUTC(fim);
  if (inicioUTC > fimUTC) return [];

  // Usa a âncora original para que ocorrências mensais não acumulem deriva de calendário.
  const ancora = tarefa.prazoOriginal ?? tarefa.prazo;
  let cursor = dataUTC(tarefa.prazo);
  const projetadas: Date[] = [];

  // Uma janela de Agenda não deve exigir uma série infinita. O limite também protege contra
  // dados inconsistentes, como uma periodicidade desconhecida retornada por uma migration antiga.
  for (let i = 0; i < 10_000; i += 1) {
    const proxima = calcularProximaOcorrencia(cursor, tarefa.periodicidade, ancora, tarefa.diaSemana);
    if (!proxima || proxima > fimUTC) break;
    cursor = proxima;

    // Não duplica uma ocorrência que já foi gravada na série.
    const jaMaterializada = materializadas.some(
      (ocorrencia) => ocorrencia.serieId === tarefa.serieId && mesmaData(ocorrencia.prazo, proxima),
    );
    if (!jaMaterializada && proxima >= inicioUTC) projetadas.push(proxima);
  }

  return projetadas;
}
