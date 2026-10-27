/**
 * Biblioteca de domínio `projetos tarefas`. Reúne funções reutilizáveis desta área; os comentários junto às funções explicam validações, decisões e efeitos específicos de cada operação.
 */
import { condicaoResponsavel, type OpcaoResponsavel } from "@/lib/filtro-responsavel";
import { randomUUID } from "node:crypto";
import {
  StatusProjeto,
  StatusSubtarefa,
  StatusTarefa,
  StatusSolicitacaoConclusao,
  type Prisma,
  type Periodicidade,
} from "@prisma/client";
import { comContextoDeUsuario, type ContextoUsuario } from "@/lib/prisma-app";
import { salvarEtiquetasSubtarefa, type EtiquetaSelecionada } from "@/lib/etiquetas";
import { calcularProximaOcorrencia, calcularPercentualEmDia, projetarOcorrenciasFuturas } from "@/lib/regras-projetos-tarefas";
import { definirAtivo } from "@/lib/desativacao";
import { dispararNotificacaoAtribuicaoRecebida } from "@/lib/notificacoes";
import { validarUrlHttp } from "@/lib/validacao-url";

export type DadosProjeto = {
  clienteId: string;
  nome: string;
  numeroProposta?: string | null;
  descricao?: string | null;
  /** `undefined` preserva o valor na edição; `null` remove um valor ainda não informado. */
  valorContratado?: Prisma.Decimal | null;
  dataInicio?: Date | null;
  dataPrevistaConclusao?: Date | null;
  status?: StatusProjeto;
};

export type DadosTarefa = {
  projetoId: string;
  nome: string;
  descricao?: string | null;
  prazo: Date;
  responsavelId?: string | null;
  responsavelUsuarioId?: string | null;
  periodicidade?: Periodicidade | null;
  diaSemana?: number | null;
  diasAntecedencia?: number | null;
  status?: StatusTarefa;
  colaboradorPodeCriarSubtarefas?: boolean;
};

export type DadosSubtarefa = {
  tarefaId: string;
  titulo: string;
  descricao?: string | null;
  prazo?: Date | null;
  status?: StatusSubtarefa;
  etiquetas?: string[];
  novasEtiquetas?: EtiquetaSelecionada[];
  atribuidoAId?: string | null;
  atribuidoAUsuarioId?: string | null;
};

export type DadosDocumentoProjeto = {
  clienteId: string;
  projetoId?: string | null;
  nome: string;
  link: string;
};

/** Lista os clientes ativos que podem receber um projeto novo. */
export async function listarClientesParaProjeto(ctx: ContextoUsuario) {
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, (tx) =>
    tx.cliente.findMany({ where: { ativo: true }, select: { id: true, razaoSocial: true }, orderBy: { razaoSocial: "asc" } }),
  );
}

/** Carrega pessoas vinculadas ao cliente e usuários internos que podem ser responsáveis. */
export async function listarPessoasParaProjeto(ctx: ContextoUsuario, clienteId: string) {
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, (tx) =>
    Promise.all([
      tx.pessoaEnvolvida.findMany({ where: { clienteId, ativo: true }, select: { id: true, nome: true, temAcesso: true }, orderBy: { nome: "asc" } }),
      tx.usuario.findMany({ where: { ativo: true, perfil: { in: ["ADMIN", "ADMIN_INTERNO", "ADMIN_EXTERNO"] } }, select: { id: true, nome: true, perfil: true }, orderBy: { nome: "asc" } }),
    ]).then(([pessoas, usuarios]) => ({ pessoas, usuarios })),
  );
}

/** Lista projetos administrativos com busca textual e opção de incluir desativados. */
export async function listarProjetos(ctx: ContextoUsuario, incluirDesativados = false, busca?: string) {
  exigirAdministrador(ctx);
  // Espaços em branco não ativam uma busca que filtraria todos os resultados.
  const termo = busca?.trim();
  return comContextoDeUsuario(ctx, (tx) =>
    tx.projeto.findMany({
      where: {
        ...(incluirDesativados ? {} : { ativo: true }),
        ...(termo ? { OR: [
          { nome: { contains: termo, mode: "insensitive" } },
          { numeroProposta: { contains: termo, mode: "insensitive" } },
          { cliente: { razaoSocial: { contains: termo, mode: "insensitive" } } },
        ] } : {}),
      },
      include: {
        cliente: { select: { id: true, razaoSocial: true } },
        valorContratado: { select: { valorContratado: true } },
        _count: { select: { tarefas: true } },
        tarefas: { select: { ativo: true, status: true } },
      },
      orderBy: [{ ativo: "desc" }, { atualizadoEm: "desc" }],
    }),
  );
}

/** Retorna tarefas ativas de projetos ativos, usadas para compor filtros de tela. */
export async function listarTarefasParaFiltro(ctx: ContextoUsuario) {
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, (tx) => tx.tarefa.findMany({
    where: {
      ativo: true,
      projeto: { ativo: true },
    },
    select: { id: true, nome: true, projetoId: true, projeto: { select: { nome: true, clienteId: true } } },
    orderBy: [{ projeto: { nome: "asc" } }, { nome: "asc" }],
  }));
}

export type FiltrosPrazos = { projetoId?: string; clienteId?: string; tarefaId?: string; pendentes?: boolean; responsavel?: string | string[] };

// Constrói o filtro de tarefa incluindo sempre os vínculos ativos de projeto e cliente.
function whereTarefas(filtros: FiltrosPrazos): Prisma.TarefaWhereInput {
  return {
    ativo: true,
    projeto: { ativo: true, ...(filtros.clienteId ? { clienteId: filtros.clienteId } : {}) },
    ...(filtros.projetoId ? { projetoId: filtros.projetoId } : {}),
    ...(filtros.tarefaId ? { id: filtros.tarefaId } : {}),
    ...(filtros.pendentes ? { status: { notIn: [StatusTarefa.CONCLUIDO, StatusTarefa.CANCELADO] } } : {}),
    ...condicaoResponsavel(filtros.responsavel, "responsavelId", "responsavelUsuarioId"),
  };
}

// Mantém os mesmos filtros para subtarefas e confirma que toda a cadeia de pais está ativa.
function whereSubtarefas(filtros: FiltrosPrazos): Prisma.SubtarefaWhereInput {
  return {
    ativo: true,
    tarefa: {
      ativo: true,
      ...(filtros.tarefaId ? { id: filtros.tarefaId } : {}),
      ...(filtros.projetoId ? { projetoId: filtros.projetoId } : {}),
      projeto: { ativo: true, ...(filtros.clienteId ? { clienteId: filtros.clienteId } : {}) },
    },
    ...(filtros.pendentes ? { status: { notIn: [StatusSubtarefa.CONCLUIDO, StatusSubtarefa.CANCELADO] } } : {}),
    ...condicaoResponsavel(filtros.responsavel, "atribuidoAId", "atribuidoAUsuarioId"),
  };
}

/** Lista prazos administrativos e, quando solicitado, agrega o progresso das subtarefas. */
export async function listarPrazos(ctx: ContextoUsuario, filtros: FiltrosPrazos = {}, incluirProgresso = false) {
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, async (tx) => {
    // A consulta traz os vínculos necessários à tela e ordena primeiro pelo prazo mais próximo.
    const tarefas = await tx.tarefa.findMany({
      where: whereTarefas(filtros),
      include: {
        projeto: { select: { id: true, nome: true, cliente: { select: { id: true, razaoSocial: true } } } },
        responsavel: { select: { nome: true } },
        responsavelUsuario: { select: { nome: true } },
        _count: { select: { subtarefas: { where: { ativo: true, status: { not: StatusSubtarefa.CANCELADO }, atribuidoAId: null, atribuidoAUsuarioId: null } } } },
      },
      orderBy: [{ prazo: "asc" }, { nome: "asc" }],
    });
    // Uma única agregação serve a lista inteira; o filtro de responsável limita a tarefa-pai.
    const grupos = incluirProgresso && tarefas.length > 0 ? await tx.subtarefa.groupBy({
      by: ["tarefaId", "status"],
      where: { tarefaId: { in: tarefas.map(tarefa => tarefa.id) }, ativo: true, status: { not: StatusSubtarefa.CANCELADO } },
      _count: { _all: true },
    }) : [];
    // Consolida os grupos de status num total e numa contagem de concluídas por tarefa.
    const progresso = new Map<string, { concluidas: number; total: number }>();
    for (const grupo of grupos) {
      const contagem = progresso.get(grupo.tarefaId) ?? { concluidas: 0, total: 0 };
      contagem.total += grupo._count._all;
      if (grupo.status === StatusSubtarefa.CONCLUIDO) contagem.concluidas += grupo._count._all;
      progresso.set(grupo.tarefaId, contagem);
    }
    // Só inclui o campo agregado quando a chamada pediu progresso, preservando os demais usos.
    return tarefas.map(tarefa => ({
      ...tarefa,
      ...(incluirProgresso ? { progressoSubtarefas: progresso.get(tarefa.id) ?? { concluidas: 0, total: 0 } } : {}),
    }));
  });
}

/** Lista subtarefas com contexto de tarefa, projeto e responsável para a tela de prazos. */
export async function listarSubtarefasPrazos(ctx: ContextoUsuario, filtros: FiltrosPrazos = {}) {
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, (tx) => tx.subtarefa.findMany({
    where: whereSubtarefas(filtros),
    include: {
      tarefa: { select: { id: true, nome: true, projeto: { select: { id: true, nome: true, cliente: { select: { id: true, razaoSocial: true } } } } } },
      atribuidoA: { select: { nome: true } },
      atribuidoAUsuario: { select: { nome: true } },
    },
    orderBy: [{ prazo: { sort: "asc", nulls: "last" } }, { titulo: "asc" }],
  }));
}

/** Mostra à ADMIN as solicitações pendentes com o item e a hierarquia de contexto. */
export async function listarSolicitacoesConclusaoPendentes(ctx: ContextoUsuario) {
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, (tx) => tx.solicitacaoConclusao.findMany({
    where: { status: StatusSolicitacaoConclusao.PENDENTE },
    include: {
      solicitadoPor: { select: { id: true, nome: true } },
      tarefa: {
        include: {
          projeto: { include: { cliente: { select: { id: true, razaoSocial: true, ativo: true } } } },
        },
      },
      subtarefa: {
        include: {
          tarefa: {
            include: {
              projeto: { include: { cliente: { select: { id: true, razaoSocial: true, ativo: true } } } },
            },
          },
        },
      },
    },
    orderBy: { solicitadoEm: "asc" },
  }));
}

/** Localiza pedido pendente para um item específico, diferenciando tarefa de subtarefa. */
export async function buscarSolicitacaoConclusaoPendente(ctx: ContextoUsuario, tipo: "TAREFA" | "SUBTAREFA", itemId: string) {
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, (tx) => tx.solicitacaoConclusao.findFirst({
    where: { status: StatusSolicitacaoConclusao.PENDENTE, ...(tipo === "TAREFA" ? { tarefaId: itemId } : { subtarefaId: itemId }) },
  }));
}

/** Registra o pedido do colaborador via função SQL que valida vínculo e permissão. */
export async function solicitarConclusao(ctx: ContextoUsuario, tipo: "TAREFA" | "SUBTAREFA", itemId: string) {
  if (ctx.perfil !== "ADMIN_INTERNO" && ctx.perfil !== "ADMIN_EXTERNO") throw new Error("Ação disponível somente para colaboradores.");
  return comContextoDeUsuario(ctx, async (tx) => {
    // A função SQL verifica a autorização e grava a solicitação atomicamente.
    const linhas = await tx.$queryRaw<{ id: string }[]>`SELECT solicitar_conclusao(${tipo}, ${itemId}) AS id`;
    const solicitacao = await tx.solicitacaoConclusao.findUniqueOrThrow({ where: { id: linhas[0].id } });
    const item = tipo === "TAREFA"
      ? await tx.tarefa.findUniqueOrThrow({ where: { id: itemId }, select: { id: true, nome: true, projetoId: true } })
      : await tx.subtarefa.findUniqueOrThrow({ where: { id: itemId }, select: { id: true, titulo: true, tarefaId: true } });
    return {
      solicitacao,
      tipo,
      itemId,
      titulo: tipo === "TAREFA" ? (item as { nome: string }).nome : (item as { titulo: string }).titulo,
      tarefaId: tipo === "TAREFA" ? itemId : (item as { tarefaId: string }).tarefaId,
    };
  });
}

/** Cancela um pedido permitido ao próprio colaborador ou à administradora. */
export async function cancelarSolicitacaoConclusao(ctx: ContextoUsuario, solicitacaoId: string) {
  exigirColaboradorOuAdministrador(ctx);
  return comContextoDeUsuario(ctx, async (tx) => {
    // A função SQL valida quem pode cancelar e atualiza o estado na transação atual.
    await tx.$queryRaw`SELECT cancelar_solicitacao_conclusao(${solicitacaoId})`;
    const solicitacao = await tx.solicitacaoConclusao.findUniqueOrThrow({ where: { id: solicitacaoId } });
    const tarefaId = solicitacao.tarefaId ?? (solicitacao.subtarefaId
      ? (await tx.subtarefa.findUniqueOrThrow({ where: { id: solicitacao.subtarefaId }, select: { tarefaId: true } })).tarefaId
      : null);
    return { ...solicitacao, tarefaId };
  });
}

/** Aprova ou rejeita um pedido, validando observação e mantendo as alterações atômicas. */
export async function decidirSolicitacaoConclusao(
  ctx: ContextoUsuario,
  solicitacaoId: string,
  aprovar: boolean,
  comentario?: string | null,
) {
  exigirAdministrador(ctx);
  // Texto vazio equivale à ausência de comentário; o limite é conferido no servidor.
  const observacao = comentario?.trim() || null;
  if (observacao && observacao.length > 2000) throw new Error("O comentário deve ter no máximo 2000 caracteres.");

  return comContextoDeUsuario(ctx, async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "solicitacoes_conclusao" WHERE "id" = ${solicitacaoId} FOR UPDATE`;
    const atual = await tx.solicitacaoConclusao.findUnique({
      where: { id: solicitacaoId },
      include: {
        tarefa: { select: { id: true, nome: true, projetoId: true, prazo: true, periodicidade: true, prazoOriginal: true, diaSemana: true, status: true, ativo: true, projeto: { select: { ativo: true, cliente: { select: { ativo: true } } } } } },
        subtarefa: { select: { id: true, titulo: true, tarefaId: true, status: true, ativo: true, tarefa: { select: { nome: true, projetoId: true, ativo: true, projeto: { select: { ativo: true, cliente: { select: { ativo: true } } } } } } } },
      },
    });
    if (!atual || atual.status !== StatusSolicitacaoConclusao.PENDENTE) throw new Error("RN-007: esta solicitação já foi decidida ou não existe.");

    let proximaId: string | null = null;
    if (aprovar && atual.tarefa) {
      if (atual.tarefa.status === StatusTarefa.CANCELADO || !atual.tarefa.ativo || !atual.tarefa.projeto.ativo || !atual.tarefa.projeto.cliente.ativo) throw new Error("RN-007: tarefa, projeto ou cliente inativo/cancelado não pode ser aprovado.");
      const proximoPrazo = atual.tarefa.periodicidade && atual.tarefa.prazo
        ? calcularProximaOcorrencia(atual.tarefa.prazo, atual.tarefa.periodicidade, atual.tarefa.prazoOriginal ?? atual.tarefa.prazo, atual.tarefa.diaSemana)
        : null;
      const resultado = await tx.$queryRaw<{ tarefa_id: string; proxima_id: string | null }[]>`
        SELECT * FROM concluir_tarefa(${atual.tarefa.id}, CAST(${proximoPrazo} AS timestamp))
      `;
      proximaId = resultado[0]?.proxima_id ?? null;
    } else if (aprovar && atual.subtarefa) {
      if (!atual.subtarefa.ativo || atual.subtarefa.status !== StatusSubtarefa.EM_ANDAMENTO || !atual.subtarefa.tarefa.ativo || !atual.subtarefa.tarefa.projeto.ativo || !atual.subtarefa.tarefa.projeto.cliente.ativo) throw new Error("RN-004: subtarefa, tarefa, projeto ou cliente inativo/cancelado não pode ser aprovada.");
      await tx.subtarefa.update({ where: { id: atual.subtarefa.id }, data: { status: StatusSubtarefa.CONCLUIDO } });
    } else if (atual.tarefa) {
      await tx.tarefa.update({ where: { id: atual.tarefa.id }, data: { status: atual.statusAnterior as StatusTarefa } });
    } else if (atual.subtarefa) {
      await tx.subtarefa.update({ where: { id: atual.subtarefa.id }, data: { status: atual.statusAnterior as StatusSubtarefa } });
    }

    const solicitacao = await tx.solicitacaoConclusao.update({
      where: { id: solicitacaoId },
      data: {
        status: aprovar ? StatusSolicitacaoConclusao.APROVADA : StatusSolicitacaoConclusao.REJEITADA,
        decididoPorId: ctx.usuarioId,
        decididoPorNome: (await tx.usuario.findUniqueOrThrow({ where: { id: ctx.usuarioId }, select: { nome: true } })).nome,
        decididoEm: new Date(),
        comentarioDecisao: aprovar ? null : observacao,
      },
    });
    return {
      solicitacao,
      tipo: atual.tarefa ? "TAREFA" as const : "SUBTAREFA" as const,
      itemId: atual.tarefa?.id ?? atual.subtarefa!.id,
      tarefaId: atual.tarefa?.id ?? atual.subtarefa!.tarefaId,
      projetoId: atual.tarefa?.projetoId ?? atual.subtarefa!.tarefa.projetoId,
      titulo: atual.tarefa?.nome ?? atual.subtarefa!.titulo,
      solicitanteId: atual.solicitadoPorId,
      aprovada: aprovar,
      proximaId,
    };
  });
}

/** Monta as opções de responsável preservando os demais filtros da lista. */
export async function listarResponsaveisParaFiltro(ctx: ContextoUsuario, entidade: "tarefas" | "subtarefas", filtros: FiltrosPrazos = {}): Promise<OpcaoResponsavel[]> {
  exigirAdministrador(ctx);
  // O filtro de responsável não pode limitar a própria lista de opções disponíveis.
  const base = { ...filtros, responsavel: undefined };
  return comContextoDeUsuario(ctx, async (tx) => {
    // Consulta somente ids e nomes necessários; pessoas incluem o cliente para distinguir homônimos.
    const registros = entidade === "tarefas"
      ? (await tx.tarefa.findMany({
          where: whereTarefas(base),
          select: { responsavel: { select: { id: true, nome: true } }, responsavelUsuario: { select: { id: true, nome: true } }, projeto: { select: { cliente: { select: { razaoSocial: true } } } } },
        })).map(r => ({ pessoa: r.responsavel, usuario: r.responsavelUsuario, cliente: r.projeto.cliente.razaoSocial }))
      : (await tx.subtarefa.findMany({
          where: whereSubtarefas(base),
          select: { atribuidoA: { select: { id: true, nome: true } }, atribuidoAUsuario: { select: { id: true, nome: true } }, tarefa: { select: { projeto: { select: { cliente: { select: { razaoSocial: true } } } } } } },
        })).map(r => ({ pessoa: r.atribuidoA, usuario: r.atribuidoAUsuario, cliente: r.tarefa.projeto.cliente.razaoSocial }));
    // O mapa remove responsáveis repetidos que aparecem em mais de um registro.
    const opcoes = new Map<string, OpcaoResponsavel>();
    for (const r of registros) {
      if (r.pessoa) {
        const valor = `pessoa:${r.pessoa.id}`;
        opcoes.set(valor, { valor, nome: `${r.pessoa.nome} · Pessoa envolvida · ${r.cliente}` });
      }
      if (r.usuario) {
        const valor = `usuario:${r.usuario.id}`;
        opcoes.set(valor, { valor, nome: `${r.usuario.nome} · Equipe Múltiplus` });
      }
    }
    // Ordena em português e usa o valor como desempate para produzir uma lista estável.
    return [...opcoes.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR") || a.valor.localeCompare(b.valor));
  });
}

export type ItemAgenda = {
  id: string;
  nome: string;
  prazo: Date;
  status: StatusTarefa;
  projeto: { id: string; nome: string; cliente: { id: string; razaoSocial: string } };
  responsavel: { nome: string } | null;
  projetada: boolean;
};

/** Combina prazos cadastrados e recorrências futuras projetadas para o intervalo da agenda. */
export async function listarItensAgenda(ctx: ContextoUsuario, inicio: Date, fim: Date, filtros: { projetoId?: string; clienteId?: string; visitas?: boolean } = {}): Promise<ItemAgenda[]> {
  // Reaproveita as mesmas regras de listagem e autorização usadas pelo painel de prazos.
  const tarefas = await listarPrazos(ctx, { projetoId: filtros.projetoId, clienteId: filtros.clienteId, pendentes: false });
  // O predicado também atua como proteção de tipo para prazos nulos.
  const noPeriodo = (prazo: Date | null): prazo is Date => Boolean(prazo && prazo >= inicio && prazo <= fim);
  const itens: ItemAgenda[] = [];
  const materializadas = tarefas.map((t) => ({ serieId: t.serieId, prazo: t.prazo ?? inicio }));
  for (const tarefa of tarefas) {
    // Inclui a ocorrência gravada quando está no período e corresponde ao filtro de visita.
    if (noPeriodo(tarefa.prazo) && (!filtros.visitas || tarefa.status === StatusTarefa.VISITA_REUNIAO_AGENDADA)) {
      itens.push({ id: tarefa.id, nome: tarefa.nome, prazo: tarefa.prazo, status: tarefa.status, projeto: tarefa.projeto, responsavel: tarefa.responsavel ?? tarefa.responsavelUsuario, projetada: false });
    }
    // Tarefas sem recorrência ou prazo não geram ocorrências futuras.
    if (!tarefa.periodicidade || !tarefa.prazo) continue;
    // Projeta recorrências somente para a janela solicitada e marca-as como virtuais.
    for (const prazo of projetarOcorrenciasFuturas(tarefa, inicio, fim, materializadas)) {
      if (filtros.visitas && tarefa.status !== StatusTarefa.VISITA_REUNIAO_AGENDADA) continue;
      itens.push({ id: `projetada-${tarefa.id}-${prazo.toISOString()}`, nome: tarefa.nome, prazo, status: tarefa.status, projeto: tarefa.projeto, responsavel: tarefa.responsavel ?? tarefa.responsavelUsuario, projetada: true });
    }
  }
  // A chave composta evita duplicar a mesma atividade quando séries recorrentes coincidem.
  const unicos = new Map<string, ItemAgenda>();
  for (const item of itens) unicos.set(`${item.projeto.id}:${item.nome}:${item.prazo.toISOString()}`, item);
  return [...unicos.values()].sort((a, b) => a.prazo.getTime() - b.prazo.getTime());
}

/** Calcula o indicador de prazo das tarefas usando a regra compartilhada do domínio. */
export function indicadorDePrazos(tarefas: Array<{ ativo: boolean; prazo: Date | null; status: StatusTarefa }>) {
  return calcularPercentualEmDia(tarefas.map((tarefa) => ({ ativo: tarefa.ativo, prazo: tarefa.prazo, status: tarefa.status })));
}

/** Subtarefas sem prazo não entram no denominador do indicador de pontualidade. */
export function indicadorDePrazosSubtarefas(subtarefas: Array<{ ativo: boolean; prazo: Date | null; status: StatusSubtarefa }>) {
  return calcularPercentualEmDia(subtarefas.filter((subtarefa) => subtarefa.prazo !== null).map((subtarefa) => ({ ativo: subtarefa.ativo, prazo: subtarefa.prazo, status: subtarefa.status })));
}

/** Busca projeto e seus itens para detalhe administrativo, com opção de incluir desativados. */
export async function buscarProjeto(ctx: ContextoUsuario, projetoId: string, incluirDesativados = false) {
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, async (tx) => {
    const projeto = await tx.projeto.findFirst({
      where: { id: projetoId, ...(incluirDesativados ? {} : { ativo: true }) },
      include: {
        cliente: { select: { id: true, razaoSocial: true } },
        tarefas: {
          where: incluirDesativados ? {} : { ativo: true },
          include: { responsavel: { select: { nome: true } }, responsavelUsuario: { select: { nome: true } }, subtarefas: { where: incluirDesativados ? {} : { ativo: true } } },
          orderBy: [{ prazo: "asc" }, { nome: "asc" }],
        },
        documentos: { where: incluirDesativados ? {} : { ativo: true }, orderBy: { criadoEm: "desc" } },
        valorContratado: { select: { valorContratado: true } },
      },
    });
    // Unifica pessoa envolvida e usuário da equipe no campo que a tela apresenta como responsável.
    return projeto ? { ...projeto, tarefas: projeto.tarefas.map((tarefa) => ({ ...tarefa, responsavel: tarefa.responsavel ?? tarefa.responsavelUsuario })) } : null;
  });
}

/** Busca tarefa, subtarefas e responsáveis para o detalhe ou edição administrativa. */
export async function buscarTarefa(ctx: ContextoUsuario, tarefaId: string, incluirDesativados = false) {
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, async (tx) => {
    const tarefa = await tx.tarefa.findFirst({
      where: { id: tarefaId, ...(incluirDesativados ? {} : { ativo: true }) },
      include: {
        projeto: { include: { cliente: { select: { razaoSocial: true } } } },
        responsavel: { select: { id: true, nome: true, temAcesso: true } },
        responsavelUsuario: { select: { id: true, nome: true, perfil: true } },
        subtarefas: {
          where: incluirDesativados ? {} : { ativo: true },
          include: {
            atribuidoA: { select: { nome: true } },
            atribuidoAUsuario: { select: { nome: true } },
          },
          orderBy: { criadoEm: "asc" },
        },
      },
    });
    // A interface recebe uma única propriedade para os dois tipos de responsável.
    return tarefa ? { ...tarefa, responsavel: tarefa.responsavel ?? tarefa.responsavelUsuario } : null;
  });
}

/** Lista projetos ao alcance do colaborador por atribuição ou por tarefas ativas vinculadas. */
export async function listarProjetosAtribuidos(ctx: ContextoUsuario) {
  if (ctx.perfil !== "ADMIN_INTERNO" && ctx.perfil !== "ADMIN_EXTERNO") throw new Error("Visão exclusiva de colaboradores.");
  return comContextoDeUsuario(ctx, async (tx) => {
    // O acesso pode vir da atribuição explícita ao projeto ou de uma tarefa nele contida.
    const [atribuicoes, tarefas] = await Promise.all([
      tx.atribuicao.findMany({ where: { usuarioId: ctx.usuarioId, entidadeTipo: "PROJETO" }, select: { entidadeId: true } }),
      tx.tarefa.findMany({ where: { ativo: true }, select: { projetoId: true } }),
    ]);
    return tx.projeto.findMany({
      where: { id: { in: [...atribuicoes.map((a) => a.entidadeId), ...tarefas.map((tarefa) => tarefa.projetoId)] }, ativo: true },
      include: { cliente: { select: { razaoSocial: true } }, tarefas: { where: { ativo: true }, select: { id: true, nome: true, prazo: true, status: true, ativo: true, subtarefas: { where: { ativo: true }, select: { status: true, ativo: true } } } } },
      orderBy: { dataPrevistaConclusao: "asc" },
    });
  });
}

/** Busca o projeto do colaborador somente se houver atribuição ou tarefa ativa no projeto. */
export async function buscarProjetoAtribuido(ctx: ContextoUsuario, projetoId: string) {
  if (ctx.perfil !== "ADMIN_INTERNO" && ctx.perfil !== "ADMIN_EXTERNO") throw new Error("Visão exclusiva de colaboradores.");
  return comContextoDeUsuario(ctx, async (tx) => {
    const [acessoAoProjeto, tarefas] = await Promise.all([
      tx.atribuicao.findFirst({ where: { usuarioId: ctx.usuarioId, entidadeTipo: "PROJETO", entidadeId: projetoId } }),
      tx.tarefa.findMany({ where: { projetoId, ativo: true }, select: { id: true } }),
    ]);
    // O id da URL não basta: sem um vínculo próprio, o resultado é ocultado.
    if (!acessoAoProjeto && tarefas.length === 0) return null;
    return tx.projeto.findFirst({ where: { id: projetoId, ativo: true }, include: { cliente: { select: { razaoSocial: true, documentos: { where: { ativo: true, projetoId: null }, select: { id: true, nome: true, link: true }, orderBy: { criadoEm: "desc" } } } }, documentos: { where: { ativo: true }, select: { id: true, nome: true, link: true }, orderBy: { criadoEm: "desc" } }, tarefas: { where: { ativo: true }, select: { id: true, nome: true, prazo: true, status: true, ativo: true, subtarefas: { where: { ativo: true }, select: { status: true, ativo: true } } }, orderBy: { prazo: "asc" } } } });
  });
}

/** Lista tarefas alcançadas por atribuição direta, responsabilidade ou subtarefa atribuída. */
export async function listarTarefasAtribuidas(ctx: ContextoUsuario) {
  if (ctx.perfil !== "ADMIN_INTERNO" && ctx.perfil !== "ADMIN_EXTERNO") {
    throw new Error("Visão exclusiva de colaboradores.");
  }
  return comContextoDeUsuario(ctx, async (tx) => {
    const [usuario, atribuicoes] = await Promise.all([
      tx.usuario.findUnique({ where: { id: ctx.usuarioId }, select: { pessoaEnvolvidaId: true } }),
      tx.atribuicao.findMany({ where: { usuarioId: ctx.usuarioId, entidadeTipo: "TAREFA" }, select: { entidadeId: true } }),
    ]);
    // Usuário e pessoa envolvida podem representar a mesma pessoa vinculada à conta.
    const responsavelDaSubtarefa = {
      OR: [
        { atribuidoAUsuarioId: ctx.usuarioId },
        ...(usuario?.pessoaEnvolvidaId ? [{ atribuidoAId: usuario.pessoaEnvolvidaId }] : []),
      ],
    };
    const responsavelDaTarefa = {
      OR: [
        { responsavelUsuarioId: ctx.usuarioId },
        ...(usuario?.pessoaEnvolvidaId ? [{ responsavelId: usuario.pessoaEnvolvidaId }] : []),
      ],
    };
    return tx.tarefa.findMany({
      where: {
        ativo: true,
        OR: [
          { id: { in: atribuicoes.map((a) => a.entidadeId) } },
          responsavelDaTarefa,
          { subtarefas: { some: { ativo: true, ...responsavelDaSubtarefa } } },
        ],
      },
      include: {
        projeto: { select: { id: true, nome: true, cliente: { select: { razaoSocial: true } } } },
        subtarefas: { where: { ativo: true }, select: { status: true, ativo: true } },
        _count: { select: { subtarefas: { where: { ativo: true, status: { not: StatusSubtarefa.CANCELADO }, atribuidoAId: null, atribuidoAUsuarioId: null } } } },
      },
      orderBy: [{ prazo: "asc" }, { nome: "asc" }],
    });
  });
}

/** Busca detalhe da tarefa e calcula capacidades específicas do colaborador atual. */
export async function buscarTarefaParaColaborador(ctx: ContextoUsuario, tarefaId: string) {
  if (ctx.perfil !== "ADMIN_INTERNO" && ctx.perfil !== "ADMIN_EXTERNO") throw new Error("Visão exclusiva de colaboradores.");
  return comContextoDeUsuario(ctx, async (tx) => {
    const [usuario, tarefa] = await Promise.all([
      tx.usuario.findUnique({ where: { id: ctx.usuarioId }, select: { pessoaEnvolvidaId: true } }),
      tx.tarefa.findFirst({
      where: { id: tarefaId, ativo: true },
      select: {
        id: true, projetoId: true, nome: true, descricao: true, prazo: true, status: true, periodicidade: true, responsavelId: true, responsavelUsuarioId: true, colaboradorPodeCriarSubtarefas: true, criadoEm: true, criadoPorNome: true,
        projeto: { select: { id: true, nome: true, cliente: { select: { razaoSocial: true } } } },
        subtarefas: {
          where: { ativo: true },
          select: {
            id: true, titulo: true, descricao: true, prazo: true, status: true, etiquetas: true,
            atribuidoAId: true, atribuidoAUsuarioId: true,
            atribuidoA: { select: { nome: true } },
            atribuidoAUsuario: { select: { nome: true } },
            criadoEm: true,
            criadoPorNome: true,
          },
        },
      },
      }),
    ]);
    // Retorna null sem distinguir inexistência de falta de acesso ao registro.
    if (!tarefa) return null;

    const atribuicoes = await tx.atribuicao.findMany({
      where: { usuarioId: ctx.usuarioId, OR: [{ entidadeTipo: "PROJETO", entidadeId: tarefa.projetoId }, { entidadeTipo: "TAREFA", entidadeId: tarefa.id }] },
      select: { entidadeTipo: true },
    });
    // Compara o vínculo direto com a conta e com a pessoa envolvida associada a essa conta.
    const responsavelDiretoDaTarefa = tarefa.responsavelUsuarioId === ctx.usuarioId
      || (usuario?.pessoaEnvolvidaId != null && tarefa.responsavelId === usuario.pessoaEnvolvidaId);
    // ADMIN_INTERNO recebe alcance por projeto; ADMIN_EXTERNO, por tarefa.
    const podeConcluirTarefa = responsavelDiretoDaTarefa || (ctx.perfil === "ADMIN_INTERNO"
      ? atribuicoes.some((a) => a.entidadeTipo === "PROJETO")
      : atribuicoes.some((a) => a.entidadeTipo === "TAREFA"));

    const solicitacoesPendentes = await tx.solicitacaoConclusao.findMany({
      where: {
        status: StatusSolicitacaoConclusao.PENDENTE,
        OR: [
          { tarefaId: tarefa.id },
          { subtarefaId: { in: tarefa.subtarefas.map((subtarefa) => subtarefa.id) } },
        ],
      },
      select: { id: true, tarefaId: true, subtarefaId: true, solicitadoPorId: true, solicitadoPorNome: true, solicitadoEm: true },
    });
    // Separa a solicitação da tarefa das solicitações de cada subtarefa para a UI.
    const solicitacaoTarefa = solicitacoesPendentes.find((pedido) => pedido.tarefaId === tarefa.id) ?? null;
    const solicitacoesPorSubtarefa = new Map(solicitacoesPendentes.filter((pedido) => pedido.subtarefaId).map((pedido) => [pedido.subtarefaId!, pedido]));

    return {
      ...tarefa,
      podeConcluirTarefa,
      podeCriarSubtarefas: tarefa.colaboradorPodeCriarSubtarefas && responsavelDiretoDaTarefa,
      solicitacaoConclusao: solicitacaoTarefa,
      subtarefas: tarefa.subtarefas.map((subtarefa) => ({
        ...subtarefa,
        solicitacaoConclusao: solicitacoesPorSubtarefa.get(subtarefa.id) ?? null,
        responsavelDaSessao: subtarefa.atribuidoAUsuarioId === ctx.usuarioId
          || (usuario?.pessoaEnvolvidaId != null && subtarefa.atribuidoAId === usuario.pessoaEnvolvidaId),
      })),
    };
  });
}

function exigirAdministrador(ctx: ContextoUsuario): void {
  // As actions de gestão verificam perfil no servidor, mesmo se um botão for acessado diretamente.
  if (ctx.perfil !== "ADMIN") throw new Error("Ação restrita ao Administrador.");
}

function exigirColaboradorOuAdministrador(ctx: ContextoUsuario): void {
  // O cliente não pode alterar estado de tarefa nem de solicitação.
  if (ctx.perfil === "CLIENTE") throw new Error("Ação não disponível para este perfil.");
}

function validarNome(nome: string, entidade: string): string {
  // A forma persistida nunca começa nem termina com espaços e não pode ser vazia.
  const valor = nome.trim();
  if (!valor) throw new Error(`Informe o nome ${entidade}.`);
  return valor;
}

function validarDatasProjeto(dados: DadosProjeto): void {
  // Compara datas civis já normalizadas pelo formulário e evita uma previsão anterior ao início.
  if (dados.dataInicio && dados.dataPrevistaConclusao && dados.dataPrevistaConclusao < dados.dataInicio) {
    throw new Error("A data prevista de conclusão não pode ser anterior à data de início.");
  }
}

async function sincronizarAtribuicaoAutomatica(
  tx: Prisma.TransactionClient,
  tarefaId: string,
  pessoaEnvolvidaId: string | null | undefined,
): Promise<string | null> {
  // Só pessoas envolvidas com acesso habilitado geram uma atribuição de usuário automaticamente.
  if (!pessoaEnvolvidaId) return null;
  const pessoa = await tx.pessoaEnvolvida.findUnique({
    where: { id: pessoaEnvolvidaId },
    include: { usuario: true },
  });
  if (pessoa?.temAcesso && pessoa.usuario) {
    // upsert torna a sincronização idempotente se a atribuição já existir.
    await tx.atribuicao.upsert({
      where: {
        usuarioId_entidadeTipo_entidadeId: {
          usuarioId: pessoa.usuario.id,
          entidadeTipo: "TAREFA",
          entidadeId: tarefaId,
        },
      },
      create: { usuarioId: pessoa.usuario.id, entidadeTipo: "TAREFA", entidadeId: tarefaId },
      update: {},
    });
    return pessoa.usuario.id;
  }
  return null;
}

async function validarResponsavel(
  tx: Prisma.TransactionClient,
  projetoId: string,
  pessoaEnvolvidaId: string | null | undefined,
  usuarioId: string | null | undefined,
): Promise<void> {
  // Uma tarefa pode ter responsável de cliente ou da equipe, nunca os dois simultaneamente.
  if (pessoaEnvolvidaId && usuarioId) throw new Error("Informe apenas um tipo de responsável.");
  if (pessoaEnvolvidaId) {
    const pessoa = await tx.pessoaEnvolvida.findFirst({
      where: { id: pessoaEnvolvidaId, ativo: true, cliente: { projetos: { some: { id: projetoId } } } },
      select: { id: true },
    });
    if (!pessoa) throw new Error("A pessoa envolvida não pertence ao cliente deste projeto.");
  }
  if (usuarioId) {
    const usuario = await tx.usuario.findFirst({
      where: { id: usuarioId, ativo: true, perfil: { in: ["ADMIN", "ADMIN_INTERNO", "ADMIN_EXTERNO"] } },
      select: { id: true },
    });
    if (!usuario) throw new Error("O responsável da equipe não está ativo ou não possui perfil de colaborador.");
  }
}

/** Cada subtarefa precisa de exatamente um responsável: equipe ativa ou pessoa ativa do cliente. */
async function validarResponsavelSubtarefa(
  tx: Prisma.TransactionClient,
  tarefaId: string,
  pessoaEnvolvidaId: string | null | undefined,
  usuarioId: string | null | undefined,
): Promise<void> {
  if (!pessoaEnvolvidaId && !usuarioId) throw new Error("Selecione o responsável pela subtarefa.");
  if (pessoaEnvolvidaId && usuarioId) throw new Error("Informe apenas um responsável pela subtarefa.");

  if (pessoaEnvolvidaId) {
    const pessoa = await tx.pessoaEnvolvida.findFirst({
      where: {
        id: pessoaEnvolvidaId,
        ativo: true,
        cliente: { projetos: { some: { tarefas: { some: { id: tarefaId } } } } },
      },
      select: { id: true },
    });
    if (!pessoa) throw new Error("O responsável da subtarefa precisa ser uma pessoa ativa deste cliente.");
  }

  if (usuarioId) {
    const usuario = await tx.usuario.findFirst({
      where: { id: usuarioId, ativo: true, perfil: { in: ["ADMIN", "ADMIN_INTERNO", "ADMIN_EXTERNO"] } },
      select: { id: true },
    });
    if (!usuario) throw new Error("O responsável da equipe não está ativo ou não possui perfil de colaborador.");
  }
}

async function usuarioDaResponsabilidadeSubtarefa(
  tx: Prisma.TransactionClient,
  pessoaEnvolvidaId: string | null | undefined,
  usuarioId: string | null | undefined,
): Promise<string | null> {
  // Responsável já informado como usuário não exige consulta adicional.
  if (usuarioId) return usuarioId;
  if (!pessoaEnvolvidaId) return null;
  // Resolve a conta ligada à pessoa apenas quando ela habilitou acesso ao sistema.
  const pessoa = await tx.pessoaEnvolvida.findUnique({
    where: { id: pessoaEnvolvidaId },
    select: { temAcesso: true, usuario: { select: { id: true, ativo: true } } },
  });
  return pessoa?.temAcesso && pessoa.usuario?.ativo ? pessoa.usuario.id : null;
}

/** Cria um projeto e, se informado, seu valor contratado na mesma transação. */
export async function criarProjeto(ctx: ContextoUsuario, dados: DadosProjeto) {
  exigirAdministrador(ctx);
  validarDatasProjeto(dados);
  return comContextoDeUsuario(ctx, async (tx) => {
    // Persiste explicitamente os campos aceitos pelo formulário, sem confiar em objetos arbitrários.
    const projeto = await tx.projeto.create({
      data: {
        clienteId: dados.clienteId,
        nome: validarNome(dados.nome, "do projeto"),
        numeroProposta: dados.numeroProposta ?? null,
        descricao: dados.descricao ?? null,
        dataInicio: dados.dataInicio ?? null,
        dataPrevistaConclusao: dados.dataPrevistaConclusao ?? null,
        status: dados.status ?? StatusProjeto.A_INICIAR,
      },
    });
    // Valor fica em tabela própria e só é criado quando foi fornecido.
    if (dados.valorContratado != null) {
      await tx.valorProjeto.create({
        data: { projetoId: projeto.id, valorContratado: dados.valorContratado },
      });
    }
    return projeto;
  });
}

/** Atualiza projeto e valor, distinguindo valor omitido de valor removido explicitamente. */
export async function atualizarProjeto(
  ctx: ContextoUsuario,
  projetoId: string,
  dados: Omit<DadosProjeto, "clienteId">,
) {
  exigirAdministrador(ctx);
  validarDatasProjeto({ ...dados, clienteId: "" });
  return comContextoDeUsuario(ctx, async (tx) => {
    const projeto = await tx.projeto.update({
      where: { id: projetoId },
      data: {
        nome: validarNome(dados.nome, "do projeto"),
        numeroProposta: dados.numeroProposta ?? null,
        descricao: dados.descricao ?? null,
        dataInicio: dados.dataInicio ?? null,
        dataPrevistaConclusao: dados.dataPrevistaConclusao ?? null,
        status: dados.status ?? StatusSubtarefa.EM_ANDAMENTO,
      },
    });
    // null apaga o valor existente; undefined preserva; número cria ou atualiza.
    if (dados.valorContratado === null) {
      await tx.valorProjeto.deleteMany({ where: { projetoId } });
    } else if (dados.valorContratado !== undefined) {
      await tx.valorProjeto.upsert({
        where: { projetoId },
        create: { projetoId, valorContratado: dados.valorContratado },
        update: { valorContratado: dados.valorContratado },
      });
    }
    return projeto;
  });
}

/** Atualiza somente o status do projeto após conferir o perfil administrativo. */
export async function atualizarStatusProjeto(ctx: ContextoUsuario, projetoId: string, status: StatusProjeto) {
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, (tx) => tx.projeto.update({ where: { id: projetoId }, data: { status } }));
}

/** Cria tarefa, série recorrente, vínculos de responsável e notificações de atribuição. */
export async function criarTarefa(ctx: ContextoUsuario, dados: DadosTarefa) {
  exigirAdministrador(ctx);
  if (!dados.prazo || Number.isNaN(dados.prazo.getTime())) throw new Error("Informe um prazo válido.");
  if (dados.periodicidade && !dados.prazo) throw new Error("Tarefa recorrente precisa de prazo.");
  if (dados.periodicidade === "SEMANAL" && dados.diaSemana != null && (!Number.isInteger(dados.diaSemana) || dados.diaSemana < 0 || dados.diaSemana > 6)) throw new Error("Escolha um dia da semana válido.");
  if (dados.diasAntecedencia !== null && dados.diasAntecedencia !== undefined && dados.diasAntecedencia <= 0) {
    throw new Error("A antecedência deve ser maior que zero.");
  }

  const resultado = await comContextoDeUsuario(ctx, async (tx) => {
    await validarResponsavel(tx, dados.projetoId, dados.responsavelId, dados.responsavelUsuarioId);
    // Cada tarefa recorrente recebe um id de série compartilhado pelas ocorrências.
    const serieId = dados.periodicidade ? randomUUID() : null;
    const tarefa = await tx.tarefa.create({
      data: {
        projetoId: dados.projetoId,
        nome: validarNome(dados.nome, "da tarefa"),
        descricao: dados.descricao ?? null,
        prazo: dados.prazo,
        // Guarda a âncora original para a recorrência não acumular deriva entre meses.
        prazoOriginal: dados.prazo,
        periodicidade: dados.periodicidade ?? null,
        // A recorrência semanal usa o dia escolhido ou o dia da primeira ocorrência em UTC.
        diaSemana: dados.periodicidade === "SEMANAL" ? (dados.diaSemana ?? dados.prazo.getUTCDay()) : null,
        serieId,
        diasAntecedencia: dados.diasAntecedencia ?? null,
        status: dados.status ?? StatusTarefa.A_INICIAR,
        responsavelId: dados.responsavelId ?? null,
        responsavelUsuarioId: dados.responsavelUsuarioId ?? null,
        colaboradorPodeCriarSubtarefas: dados.colaboradorPodeCriarSubtarefas ?? false,
        criadoPorId: ctx.usuarioId,
      },
    });
    const usuarioResponsavelId = await sincronizarAtribuicaoAutomatica(tx, tarefa.id, dados.responsavelId);
    // O conjunto evita enviar notificações duplicadas quando os dois vínculos apontam à mesma conta.
    const usuariosAtribuidos = new Set<string>();
    if (usuarioResponsavelId) usuariosAtribuidos.add(usuarioResponsavelId);
    if (dados.responsavelUsuarioId) {
      await tx.atribuicao.upsert({
        where: { usuarioId_entidadeTipo_entidadeId: { usuarioId: dados.responsavelUsuarioId, entidadeTipo: "TAREFA", entidadeId: tarefa.id } },
        create: { usuarioId: dados.responsavelUsuarioId, entidadeTipo: "TAREFA", entidadeId: tarefa.id },
        update: {},
      });
      usuariosAtribuidos.add(dados.responsavelUsuarioId);
    }
    return { tarefa, usuariosAtribuidos: [...usuariosAtribuidos] };
  });
  // Notificações são disparadas após a transação para não atrasar ou desfazer a gravação.
  for (const usuarioId of resultado.usuariosAtribuidos) {
    void dispararNotificacaoAtribuicaoRecebida(usuarioId, "TAREFA", resultado.tarefa.id);
  }
  return resultado.tarefa;
}

/** Atualiza tarefa e sincroniza atribuições/notificações se o responsável mudar. */
export async function atualizarTarefa(
  ctx: ContextoUsuario,
  tarefaId: string,
  dados: Omit<DadosTarefa, "projetoId" | "prazo"> & { prazo: Date },
) {
  exigirAdministrador(ctx);
  if (!dados.prazo || Number.isNaN(dados.prazo.getTime())) throw new Error("Informe um prazo válido.");
  if (dados.periodicidade === "SEMANAL" && dados.diaSemana != null && (!Number.isInteger(dados.diaSemana) || dados.diaSemana < 0 || dados.diaSemana > 6)) throw new Error("Escolha um dia da semana válido.");
  if (dados.diasAntecedencia !== null && dados.diasAntecedencia !== undefined && dados.diasAntecedencia <= 0) {
    throw new Error("A antecedência deve ser maior que zero.");
  }

  const resultado = await comContextoDeUsuario(ctx, async (tx) => {
    // Guarda vínculos anteriores para remover acessos obsoletos e notificar novos responsáveis.
    const anterior = await tx.tarefa.findUniqueOrThrow({ where: { id: tarefaId }, select: { responsavelId: true, responsavelUsuarioId: true, projetoId: true } });
    await validarResponsavel(tx, anterior.projetoId, dados.responsavelId, dados.responsavelUsuarioId);
    const tarefa = await tx.tarefa.update({
      where: { id: tarefaId },
      data: {
        nome: validarNome(dados.nome, "da tarefa"),
          descricao: dados.descricao ?? null,
          prazo: dados.prazo,
          periodicidade: dados.periodicidade ?? null,
          diaSemana: dados.periodicidade === "SEMANAL" ? (dados.diaSemana ?? dados.prazo.getUTCDay()) : null,
        diasAntecedencia: dados.diasAntecedencia ?? null,
        status: dados.status ?? undefined,
        responsavelId: dados.responsavelId ?? null,
        responsavelUsuarioId: dados.responsavelUsuarioId ?? null,
      },
    });

    // Ao trocar a pessoa do cliente, remove a atribuição ligada à conta antiga.
    if (anterior.responsavelId && anterior.responsavelId !== dados.responsavelId) {
      const pessoaAnterior = await tx.pessoaEnvolvida.findUnique({
        where: { id: anterior.responsavelId },
        include: { usuario: true },
      });
      if (pessoaAnterior?.usuario) {
        await tx.atribuicao.deleteMany({
          where: { usuarioId: pessoaAnterior.usuario.id, entidadeTipo: "TAREFA", entidadeId: tarefaId },
        });
      }
    }
    // Ao trocar o responsável interno, remove também a atribuição direta antiga.
    if (anterior.responsavelUsuarioId && anterior.responsavelUsuarioId !== dados.responsavelUsuarioId) {
      await tx.atribuicao.deleteMany({ where: { usuarioId: anterior.responsavelUsuarioId, entidadeTipo: "TAREFA", entidadeId: tarefaId } });
    }
    // Apenas mudanças de responsável geram notificações; uma regravação do mesmo vínculo não.
    const usuariosAtribuidos = new Set<string>();
    if (anterior.responsavelId !== dados.responsavelId) {
      const usuarioResponsavelId = await sincronizarAtribuicaoAutomatica(tx, tarefa.id, dados.responsavelId);
      if (usuarioResponsavelId) usuariosAtribuidos.add(usuarioResponsavelId);
    } else {
      await sincronizarAtribuicaoAutomatica(tx, tarefa.id, dados.responsavelId);
    }
    if (dados.responsavelUsuarioId) {
      await tx.atribuicao.upsert({
        where: { usuarioId_entidadeTipo_entidadeId: { usuarioId: dados.responsavelUsuarioId, entidadeTipo: "TAREFA", entidadeId: tarefa.id } },
        create: { usuarioId: dados.responsavelUsuarioId, entidadeTipo: "TAREFA", entidadeId: tarefa.id },
        update: {},
      });
      if (anterior.responsavelUsuarioId !== dados.responsavelUsuarioId) usuariosAtribuidos.add(dados.responsavelUsuarioId);
    }
    return { tarefa, usuariosAtribuidos: [...usuariosAtribuidos] };
  });
  for (const usuarioId of resultado.usuariosAtribuidos) {
    void dispararNotificacaoAtribuicaoRecebida(usuarioId, "TAREFA", resultado.tarefa.id);
  }
  return resultado.tarefa;
}

/** Atualiza somente o status de uma tarefa administrativa. */
export async function atualizarStatusTarefa(ctx: ContextoUsuario, tarefaId: string, status: StatusTarefa) {
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, (tx) => tx.tarefa.update({ where: { id: tarefaId }, data: { status } }));
}

/** Cria subtarefa, aplicando regras diferentes para ADMIN e colaborador responsável. */
export async function criarSubtarefa(ctx: ContextoUsuario, dados: DadosSubtarefa) {
  const ehAdministrador = ctx.perfil === "ADMIN";
  if (dados.prazo && Number.isNaN(dados.prazo.getTime())) throw new Error("Informe um prazo válido para a subtarefa.");
  const subtarefa = await comContextoDeUsuario(ctx, async (tx) => {
    let responsavelId = dados.atribuidoAId;
    let responsavelUsuarioId = dados.atribuidoAUsuarioId;
    if (!ehAdministrador) {
      // Colaboradores só podem criar subtarefas se a configuração da tarefa e o vínculo permitirem.
      if (ctx.perfil !== "ADMIN_INTERNO" && ctx.perfil !== "ADMIN_EXTERNO") throw new Error("Ação não disponível para este perfil.");
      const [usuario, tarefa] = await Promise.all([
        tx.usuario.findUnique({ where: { id: ctx.usuarioId }, select: { pessoaEnvolvidaId: true } }),
        tx.tarefa.findFirst({ where: { id: dados.tarefaId, ativo: true }, select: { colaboradorPodeCriarSubtarefas: true, responsavelId: true, responsavelUsuarioId: true } }),
      ]);
      const ehResponsavel = tarefa?.responsavelUsuarioId === ctx.usuarioId
        || (!!usuario?.pessoaEnvolvidaId && tarefa?.responsavelId === usuario.pessoaEnvolvidaId);
      if (!tarefa?.colaboradorPodeCriarSubtarefas || !ehResponsavel) throw new Error("Você não tem permissão para criar subtarefas nesta tarefa.");
      // A autoria do colaborador define a responsabilidade; ele não escolhe outra pessoa.
      responsavelId = null;
      responsavelUsuarioId = ctx.usuarioId;
    }
    // Normaliza e cria etiquetas no mesmo contexto transacional da subtarefa.
    const etiquetas = await salvarEtiquetasSubtarefa(tx, dados.etiquetas ?? [], dados.novasEtiquetas ?? []);
    await validarResponsavelSubtarefa(tx, dados.tarefaId, responsavelId, responsavelUsuarioId);
    const subtarefa = await tx.subtarefa.create({
      data: {
        tarefaId: dados.tarefaId,
        titulo: validarNome(dados.titulo, "da subtarefa"),
        descricao: dados.descricao?.trim() || null,
        prazo: dados.prazo ?? null,
        status: ehAdministrador ? dados.status ?? undefined : StatusSubtarefa.EM_ANDAMENTO,
        etiquetas,
        atribuidoAId: responsavelId ?? null,
        atribuidoAUsuarioId: responsavelUsuarioId ?? null,
        criadoPorId: ctx.usuarioId,
      },
    });
    // Resolve a conta destinatária para avisar somente se a atribuição não for do próprio autor.
    const usuarioResponsavelId = await usuarioDaResponsabilidadeSubtarefa(tx, responsavelId, responsavelUsuarioId);
    return { subtarefa, usuarioResponsavelId };
  });
  if (subtarefa.usuarioResponsavelId && subtarefa.usuarioResponsavelId !== ctx.usuarioId) {
    void dispararNotificacaoAtribuicaoRecebida(subtarefa.usuarioResponsavelId, "SUBTAREFA", subtarefa.subtarefa.id);
  }
  return subtarefa.subtarefa;
}

/** Atualiza campos da subtarefa e avisa a conta quando a responsabilidade muda. */
export async function atualizarSubtarefa(
  ctx: ContextoUsuario,
  subtarefaId: string,
  dados: Omit<DadosSubtarefa, "tarefaId">,
) {
  exigirAdministrador(ctx);
  if (dados.prazo && Number.isNaN(dados.prazo.getTime())) throw new Error("Informe um prazo válido para a subtarefa.");
  const resultado = await comContextoDeUsuario(ctx, async (tx) => {
    const atual = await tx.subtarefa.findUniqueOrThrow({ where: { id: subtarefaId }, select: { tarefaId: true, atribuidoAId: true, atribuidoAUsuarioId: true } });
    // Compara as contas resolvidas, mesmo quando um vínculo é pessoa e o outro é usuário.
    const usuarioResponsavelAnterior = await usuarioDaResponsabilidadeSubtarefa(tx, atual.atribuidoAId, atual.atribuidoAUsuarioId);
    const etiquetas = await salvarEtiquetasSubtarefa(tx, dados.etiquetas ?? [], dados.novasEtiquetas ?? []);
    await validarResponsavelSubtarefa(tx, atual.tarefaId, dados.atribuidoAId, dados.atribuidoAUsuarioId);
    const subtarefa = await tx.subtarefa.update({
      where: { id: subtarefaId },
      data: {
        titulo: validarNome(dados.titulo, "da subtarefa"),
        descricao: dados.descricao?.trim() || null,
        prazo: dados.prazo ?? null,
        status: dados.status ?? undefined,
        etiquetas,
        atribuidoAId: dados.atribuidoAId ?? null,
        atribuidoAUsuarioId: dados.atribuidoAUsuarioId ?? null,
      },
    });
    const usuarioResponsavelNovo = await usuarioDaResponsabilidadeSubtarefa(tx, subtarefa.atribuidoAId, subtarefa.atribuidoAUsuarioId);
    return { subtarefa, usuarioResponsavelNovo: usuarioResponsavelAnterior !== usuarioResponsavelNovo ? usuarioResponsavelNovo : null };
  });
  if (resultado.usuarioResponsavelNovo) {
    void dispararNotificacaoAtribuicaoRecebida(resultado.usuarioResponsavelNovo, "SUBTAREFA", resultado.subtarefa.id);
  }
  return resultado.subtarefa;
}

/** Troca somente o responsável de uma subtarefa e notifica a nova conta associada. */
export async function atualizarResponsavelSubtarefa(ctx: ContextoUsuario, subtarefaId: string, atribuidoAId: string | null, atribuidoAUsuarioId: string | null) {
  exigirAdministrador(ctx);
  const resultado = await comContextoDeUsuario(ctx, async (tx) => {
    const atual = await tx.subtarefa.findUniqueOrThrow({ where: { id: subtarefaId }, select: { tarefaId: true, atribuidoAId: true, atribuidoAUsuarioId: true } });
    const usuarioResponsavelAnterior = await usuarioDaResponsabilidadeSubtarefa(tx, atual.atribuidoAId, atual.atribuidoAUsuarioId);
    await validarResponsavelSubtarefa(tx, atual.tarefaId, atribuidoAId, atribuidoAUsuarioId);
    const subtarefa = await tx.subtarefa.update({ where: { id: subtarefaId }, data: { atribuidoAId, atribuidoAUsuarioId } });
    const usuarioResponsavelNovo = await usuarioDaResponsabilidadeSubtarefa(tx, subtarefa.atribuidoAId, subtarefa.atribuidoAUsuarioId);
    return { subtarefa, usuarioResponsavelNovo: usuarioResponsavelAnterior !== usuarioResponsavelNovo ? usuarioResponsavelNovo : null };
  });
  if (resultado.usuarioResponsavelNovo) {
    void dispararNotificacaoAtribuicaoRecebida(resultado.usuarioResponsavelNovo, "SUBTAREFA", resultado.subtarefa.id);
  }
  return resultado.subtarefa;
}

/** Cadastra link externo HTTP/HTTPS no cliente ou em um projeto daquele mesmo cliente. */
export async function criarDocumentoProjeto(ctx: ContextoUsuario, dados: DadosDocumentoProjeto) {
  exigirAdministrador(ctx);
  const nome = validarNome(dados.nome, "do documento");
  const linkInformado = dados.link.trim();
  if (!linkInformado) throw new Error("Informe o link do documento.");
  const link = validarUrlHttp(linkInformado);

  return comContextoDeUsuario(ctx, async (tx) => {
    if (dados.projetoId) {
      // Impede associar um projeto pertencente a outro cliente informado no formulário.
      const projeto = await tx.projeto.findUnique({ where: { id: dados.projetoId }, select: { clienteId: true } });
      if (!projeto || projeto.clienteId !== dados.clienteId) throw new Error("Projeto não encontrado para este cliente.");
    }
    return tx.documento.create({ data: { clienteId: dados.clienteId, projetoId: dados.projetoId ?? null, nome, link } });
  });
}

/** Aplica o soft delete ou a reativação com as regras de cascata compartilhadas. */
export async function desativarOuReativar(
  ctx: ContextoUsuario,
  entidade: "projeto" | "tarefa" | "subtarefa",
  id: string,
  ativo: boolean,
) {
  exigirAdministrador(ctx);
  return definirAtivo(ctx, entidade, id, ativo);
}

/** Conclui uma tarefa administrativa usando a operação SQL atômica da recorrência. */
export async function concluirTarefa(ctx: ContextoUsuario, tarefaId: string) {
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, async (tx) => {
    const atual = await tx.tarefa.findUniqueOrThrow({ where: { id: tarefaId } });
    if (atual.status === StatusTarefa.CONCLUIDO) return { tarefa: atual, proxima: null };

    const prazo = atual.periodicidade && atual.prazo
      ? calcularProximaOcorrencia(atual.prazo, atual.periodicidade, atual.prazoOriginal ?? atual.prazo, atual.diaSemana)
      : null;
    const resultado = await tx.$queryRaw<{ tarefa_id: string; proxima_id: string | null }[]>`
      SELECT * FROM concluir_tarefa(${tarefaId}, CAST(${prazo} AS timestamp))
    `;
    const tarefa = await tx.tarefa.findUniqueOrThrow({ where: { id: tarefaId } });
    const proxima = resultado[0]?.proxima_id
      ? await tx.tarefa.findUnique({ where: { id: resultado[0].proxima_id } })
      : null;
    return { tarefa, proxima };
  });
}

/** Conclui diretamente uma subtarefa após conferir o perfil administrativo. */
export async function concluirSubtarefa(ctx: ContextoUsuario, subtarefaId: string) {
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, (tx) =>
    tx.subtarefa.update({ where: { id: subtarefaId }, data: { status: StatusSubtarefa.CONCLUIDO } }),
  );
}

/** Atualiza somente o status da subtarefa no fluxo administrativo. */
export async function atualizarStatusSubtarefa(ctx: ContextoUsuario, subtarefaId: string, status: StatusSubtarefa) {
  if (status === StatusSubtarefa.CONCLUIDO) exigirColaboradorOuAdministrador(ctx);
  else exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, (tx) => tx.subtarefa.update({ where: { id: subtarefaId }, data: { status } }));
}
