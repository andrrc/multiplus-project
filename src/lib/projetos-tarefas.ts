import { randomUUID } from "node:crypto";
import {
  StatusProjeto,
  StatusSubtarefa,
  StatusTarefa,
  type Prisma,
  type Periodicidade,
} from "@prisma/client";
import { comContextoDeUsuario, type ContextoUsuario } from "@/lib/prisma-app";
import { calcularProximaOcorrencia, calcularPercentualEmDia, projetarOcorrenciasFuturas } from "@/lib/regras-projetos-tarefas";
import { definirAtivo } from "@/lib/desativacao";

export type DadosProjeto = {
  clienteId: string;
  nome: string;
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
  diasAntecedencia?: number | null;
  status?: StatusTarefa;
};

export type DadosSubtarefa = {
  tarefaId: string;
  titulo: string;
  descricao?: string | null;
  prazo?: Date | null;
  status?: StatusSubtarefa;
  etiquetas?: string[];
  atribuidoAId?: string | null;
  atribuidoAUsuarioId?: string | null;
};

export type DadosDocumentoProjeto = {
  clienteId: string;
  projetoId?: string | null;
  nome: string;
  link: string;
};

export async function listarClientesParaProjeto(ctx: ContextoUsuario) {
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, (tx) =>
    tx.cliente.findMany({ where: { ativo: true }, select: { id: true, razaoSocial: true }, orderBy: { razaoSocial: "asc" } }),
  );
}

export async function listarPessoasParaProjeto(ctx: ContextoUsuario, clienteId: string) {
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, (tx) =>
    Promise.all([
      tx.pessoaEnvolvida.findMany({ where: { clienteId, ativo: true }, select: { id: true, nome: true, temAcesso: true }, orderBy: { nome: "asc" } }),
      tx.usuario.findMany({ where: { ativo: true, perfil: { in: ["ADMIN", "ADMIN_INTERNO", "ADMIN_EXTERNO"] } }, select: { id: true, nome: true, perfil: true }, orderBy: { nome: "asc" } }),
    ]).then(([pessoas, usuarios]) => ({ pessoas, usuarios })),
  );
}

export async function listarProjetos(ctx: ContextoUsuario, incluirDesativados = false) {
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, (tx) =>
    tx.projeto.findMany({
      where: incluirDesativados ? {} : { ativo: true },
      include: {
        cliente: { select: { id: true, razaoSocial: true } },
        valorContratado: { select: { valorContratado: true } },
        _count: { select: { tarefas: true } },
      },
      orderBy: [{ ativo: "desc" }, { atualizadoEm: "desc" }],
    }),
  );
}

export async function listarTarefasParaFiltro(ctx: ContextoUsuario, filtros: { projetoId?: string; clienteId?: string } = {}) {
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, (tx) => tx.tarefa.findMany({
    where: {
      ativo: true,
      projeto: {
        ativo: true,
        ...(filtros.projetoId ? { id: filtros.projetoId } : {}),
        ...(filtros.clienteId ? { clienteId: filtros.clienteId } : {}),
      },
    },
    select: { id: true, nome: true, projeto: { select: { nome: true } } },
    orderBy: [{ projeto: { nome: "asc" } }, { nome: "asc" }],
  }));
}

export async function listarPrazos(ctx: ContextoUsuario, filtros: { projetoId?: string; clienteId?: string; tarefaId?: string; pendentes?: boolean } = {}) {
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, (tx) => tx.tarefa.findMany({
    where: {
      ativo: true,
      projeto: { ativo: true, ...(filtros.clienteId ? { clienteId: filtros.clienteId } : {}) },
      ...(filtros.projetoId ? { projetoId: filtros.projetoId } : {}),
      ...(filtros.tarefaId ? { id: filtros.tarefaId } : {}),
      ...(filtros.pendentes ? { status: { notIn: [StatusTarefa.CONCLUIDO, StatusTarefa.CANCELADO] } } : {}),
    },
    include: { projeto: { select: { id: true, nome: true, cliente: { select: { id: true, razaoSocial: true } } } }, responsavel: { select: { nome: true } }, responsavelUsuario: { select: { nome: true } } },
    orderBy: [{ prazo: "asc" }, { nome: "asc" }],
  }));
}

export async function listarSubtarefasPrazos(ctx: ContextoUsuario, filtros: { projetoId?: string; clienteId?: string; tarefaId?: string; pendentes?: boolean } = {}) {
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, (tx) => tx.subtarefa.findMany({
    where: {
      ativo: true,
      tarefa: {
        ativo: true,
        ...(filtros.tarefaId ? { id: filtros.tarefaId } : {}),
        ...(filtros.projetoId ? { projetoId: filtros.projetoId } : {}),
        projeto: { ativo: true, ...(filtros.clienteId ? { clienteId: filtros.clienteId } : {}) },
      },
      ...(filtros.pendentes ? { status: { notIn: [StatusSubtarefa.CONCLUIDO, StatusSubtarefa.CANCELADO] } } : {}),
    },
    include: {
      tarefa: { select: { id: true, nome: true, projeto: { select: { id: true, nome: true, cliente: { select: { id: true, razaoSocial: true } } } } } },
      atribuidoA: { select: { nome: true } },
      atribuidoAUsuario: { select: { nome: true } },
    },
    orderBy: [{ prazo: { sort: "asc", nulls: "last" } }, { titulo: "asc" }],
  }));
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

export async function listarItensAgenda(ctx: ContextoUsuario, inicio: Date, fim: Date, filtros: { projetoId?: string; clienteId?: string; visitas?: boolean } = {}): Promise<ItemAgenda[]> {
  const tarefas = await listarPrazos(ctx, { projetoId: filtros.projetoId, clienteId: filtros.clienteId, pendentes: false });
  const noPeriodo = (prazo: Date | null): prazo is Date => Boolean(prazo && prazo >= inicio && prazo <= fim);
  const itens: ItemAgenda[] = [];
  const materializadas = tarefas.map((t) => ({ serieId: t.serieId, prazo: t.prazo ?? inicio }));
  for (const tarefa of tarefas) {
    if (noPeriodo(tarefa.prazo) && (!filtros.visitas || tarefa.status === StatusTarefa.VISITA_REUNIAO_AGENDADA)) {
      itens.push({ id: tarefa.id, nome: tarefa.nome, prazo: tarefa.prazo, status: tarefa.status, projeto: tarefa.projeto, responsavel: tarefa.responsavel ?? tarefa.responsavelUsuario, projetada: false });
    }
    if (!tarefa.periodicidade || !tarefa.prazo) continue;
    for (const prazo of projetarOcorrenciasFuturas(tarefa, inicio, fim, materializadas)) {
      if (filtros.visitas && tarefa.status !== StatusTarefa.VISITA_REUNIAO_AGENDADA) continue;
      itens.push({ id: `projetada-${tarefa.id}-${prazo.toISOString()}`, nome: tarefa.nome, prazo, status: tarefa.status, projeto: tarefa.projeto, responsavel: tarefa.responsavel ?? tarefa.responsavelUsuario, projetada: true });
    }
  }
  const unicos = new Map<string, ItemAgenda>();
  for (const item of itens) unicos.set(`${item.projeto.id}:${item.nome}:${item.prazo.toISOString()}`, item);
  return [...unicos.values()].sort((a, b) => a.prazo.getTime() - b.prazo.getTime());
}

export function indicadorDePrazos(tarefas: Array<{ ativo: boolean; prazo: Date | null; status: StatusTarefa }>) {
  return calcularPercentualEmDia(tarefas.map((tarefa) => ({ ativo: tarefa.ativo, prazo: tarefa.prazo, status: tarefa.status })));
}

export function indicadorDePrazosSubtarefas(subtarefas: Array<{ ativo: boolean; prazo: Date | null; status: StatusSubtarefa }>) {
  return calcularPercentualEmDia(subtarefas.filter((subtarefa) => subtarefa.prazo !== null).map((subtarefa) => ({ ativo: subtarefa.ativo, prazo: subtarefa.prazo, status: subtarefa.status })));
}

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
    return projeto ? { ...projeto, tarefas: projeto.tarefas.map((tarefa) => ({ ...tarefa, responsavel: tarefa.responsavel ?? tarefa.responsavelUsuario })) } : null;
  });
}

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
    return tarefa ? { ...tarefa, responsavel: tarefa.responsavel ?? tarefa.responsavelUsuario } : null;
  });
}

export async function listarProjetosAtribuidos(ctx: ContextoUsuario) {
  if (ctx.perfil !== "ADMIN_INTERNO" && ctx.perfil !== "ADMIN_EXTERNO") throw new Error("Visão exclusiva de colaboradores.");
  return comContextoDeUsuario(ctx, async (tx) => {
    const [atribuicoes, tarefas] = await Promise.all([
      tx.atribuicao.findMany({ where: { usuarioId: ctx.usuarioId, entidadeTipo: "PROJETO" }, select: { entidadeId: true } }),
      tx.tarefa.findMany({ where: { ativo: true }, select: { projetoId: true } }),
    ]);
    return tx.projeto.findMany({
      where: { id: { in: [...atribuicoes.map((a) => a.entidadeId), ...tarefas.map((tarefa) => tarefa.projetoId)] }, ativo: true },
      include: { cliente: { select: { razaoSocial: true } }, tarefas: { where: { ativo: true }, select: { id: true, nome: true, prazo: true, status: true } } },
      orderBy: { dataPrevistaConclusao: "asc" },
    });
  });
}

export async function buscarProjetoAtribuido(ctx: ContextoUsuario, projetoId: string) {
  if (ctx.perfil !== "ADMIN_INTERNO" && ctx.perfil !== "ADMIN_EXTERNO") throw new Error("Visão exclusiva de colaboradores.");
  return comContextoDeUsuario(ctx, async (tx) => {
    const [acessoAoProjeto, tarefas] = await Promise.all([
      tx.atribuicao.findFirst({ where: { usuarioId: ctx.usuarioId, entidadeTipo: "PROJETO", entidadeId: projetoId } }),
      tx.tarefa.findMany({ where: { projetoId, ativo: true }, select: { id: true } }),
    ]);
    if (!acessoAoProjeto && tarefas.length === 0) return null;
    return tx.projeto.findFirst({ where: { id: projetoId, ativo: true }, include: { cliente: { select: { razaoSocial: true, documentos: { where: { ativo: true, projetoId: null }, select: { id: true, nome: true, link: true }, orderBy: { criadoEm: "desc" } } } }, documentos: { where: { ativo: true }, select: { id: true, nome: true, link: true }, orderBy: { criadoEm: "desc" } }, tarefas: { where: { ativo: true }, select: { id: true, nome: true, prazo: true, status: true, subtarefas: { where: { ativo: true }, select: { status: true } } }, orderBy: { prazo: "asc" } } } });
  });
}

export async function listarTarefasAtribuidas(ctx: ContextoUsuario) {
  if (ctx.perfil !== "ADMIN_INTERNO" && ctx.perfil !== "ADMIN_EXTERNO") {
    throw new Error("Visão exclusiva de colaboradores.");
  }
  return comContextoDeUsuario(ctx, async (tx) => {
    const [usuario, atribuicoes] = await Promise.all([
      tx.usuario.findUnique({ where: { id: ctx.usuarioId }, select: { pessoaEnvolvidaId: true } }),
      tx.atribuicao.findMany({ where: { usuarioId: ctx.usuarioId, entidadeTipo: "TAREFA" }, select: { entidadeId: true } }),
    ]);
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
      include: { projeto: { select: { id: true, nome: true, cliente: { select: { razaoSocial: true } } } }, subtarefas: { where: { ativo: true }, select: { status: true } } },
      orderBy: [{ prazo: "asc" }, { nome: "asc" }],
    });
  });
}

export async function buscarTarefaParaColaborador(ctx: ContextoUsuario, tarefaId: string) {
  if (ctx.perfil !== "ADMIN_INTERNO" && ctx.perfil !== "ADMIN_EXTERNO") throw new Error("Visão exclusiva de colaboradores.");
  return comContextoDeUsuario(ctx, async (tx) => {
    const [usuario, tarefa] = await Promise.all([
      tx.usuario.findUnique({ where: { id: ctx.usuarioId }, select: { pessoaEnvolvidaId: true } }),
      tx.tarefa.findFirst({
      where: { id: tarefaId, ativo: true },
      select: {
        id: true, projetoId: true, nome: true, descricao: true, prazo: true, status: true, periodicidade: true, responsavelId: true, responsavelUsuarioId: true,
        projeto: { select: { id: true, nome: true, cliente: { select: { razaoSocial: true } } } },
        subtarefas: {
          where: { ativo: true },
          select: {
            id: true, titulo: true, descricao: true, prazo: true, status: true, etiquetas: true,
            atribuidoAId: true, atribuidoAUsuarioId: true,
            atribuidoA: { select: { nome: true } },
            atribuidoAUsuario: { select: { nome: true } },
          },
        },
      },
      }),
    ]);
    if (!tarefa) return null;

    const atribuicoes = await tx.atribuicao.findMany({
      where: { usuarioId: ctx.usuarioId, OR: [{ entidadeTipo: "PROJETO", entidadeId: tarefa.projetoId }, { entidadeTipo: "TAREFA", entidadeId: tarefa.id }] },
      select: { entidadeTipo: true },
    });
    const responsavelDiretoDaTarefa = tarefa.responsavelUsuarioId === ctx.usuarioId
      || (usuario?.pessoaEnvolvidaId != null && tarefa.responsavelId === usuario.pessoaEnvolvidaId);
    const podeConcluirTarefa = responsavelDiretoDaTarefa || (ctx.perfil === "ADMIN_INTERNO"
      ? atribuicoes.some((a) => a.entidadeTipo === "PROJETO")
      : atribuicoes.some((a) => a.entidadeTipo === "TAREFA"));

    return {
      ...tarefa,
      podeConcluirTarefa,
      subtarefas: tarefa.subtarefas.map((subtarefa) => ({
        ...subtarefa,
        responsavelDaSessao: subtarefa.atribuidoAUsuarioId === ctx.usuarioId
          || (usuario?.pessoaEnvolvidaId != null && subtarefa.atribuidoAId === usuario.pessoaEnvolvidaId),
      })),
    };
  });
}

function exigirAdministrador(ctx: ContextoUsuario): void {
  if (ctx.perfil !== "ADMIN") throw new Error("Ação restrita ao Administrador.");
}

function exigirColaboradorOuAdministrador(ctx: ContextoUsuario): void {
  if (ctx.perfil === "CLIENTE") throw new Error("Ação não disponível para este perfil.");
}

function validarNome(nome: string, entidade: string): string {
  const valor = nome.trim();
  if (!valor) throw new Error(`Informe o nome ${entidade}.`);
  return valor;
}

function validarDatasProjeto(dados: DadosProjeto): void {
  if (dados.dataInicio && dados.dataPrevistaConclusao && dados.dataPrevistaConclusao < dados.dataInicio) {
    throw new Error("A data prevista de conclusão não pode ser anterior à data de início.");
  }
}

async function sincronizarAtribuicaoAutomatica(
  tx: Prisma.TransactionClient,
  tarefaId: string,
  pessoaEnvolvidaId: string | null | undefined,
): Promise<void> {
  if (!pessoaEnvolvidaId) return;
  const pessoa = await tx.pessoaEnvolvida.findUnique({
    where: { id: pessoaEnvolvidaId },
    include: { usuario: true },
  });
  if (pessoa?.temAcesso && pessoa.usuario) {
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
  }
}

async function validarResponsavel(
  tx: Prisma.TransactionClient,
  projetoId: string,
  pessoaEnvolvidaId: string | null | undefined,
  usuarioId: string | null | undefined,
): Promise<void> {
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

export async function criarProjeto(ctx: ContextoUsuario, dados: DadosProjeto) {
  exigirAdministrador(ctx);
  validarDatasProjeto(dados);
  return comContextoDeUsuario(ctx, async (tx) => {
    const projeto = await tx.projeto.create({
      data: {
        clienteId: dados.clienteId,
        nome: validarNome(dados.nome, "do projeto"),
        descricao: dados.descricao ?? null,
        dataInicio: dados.dataInicio ?? null,
        dataPrevistaConclusao: dados.dataPrevistaConclusao ?? null,
        status: dados.status ?? StatusProjeto.A_INICIAR,
      },
    });
    if (dados.valorContratado != null) {
      await tx.valorProjeto.create({
        data: { projetoId: projeto.id, valorContratado: dados.valorContratado },
      });
    }
    return projeto;
  });
}

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
        descricao: dados.descricao ?? null,
        dataInicio: dados.dataInicio ?? null,
        dataPrevistaConclusao: dados.dataPrevistaConclusao ?? null,
        status: dados.status ?? StatusSubtarefa.EM_ANDAMENTO,
      },
    });
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

export async function atualizarStatusProjeto(ctx: ContextoUsuario, projetoId: string, status: StatusProjeto) {
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, (tx) => tx.projeto.update({ where: { id: projetoId }, data: { status } }));
}

export async function criarTarefa(ctx: ContextoUsuario, dados: DadosTarefa) {
  exigirAdministrador(ctx);
  if (!dados.prazo || Number.isNaN(dados.prazo.getTime())) throw new Error("Informe um prazo válido.");
  if (dados.periodicidade && !dados.prazo) throw new Error("Tarefa recorrente precisa de prazo.");
  if (dados.diasAntecedencia !== null && dados.diasAntecedencia !== undefined && dados.diasAntecedencia <= 0) {
    throw new Error("A antecedência deve ser maior que zero.");
  }

  return comContextoDeUsuario(ctx, async (tx) => {
    await validarResponsavel(tx, dados.projetoId, dados.responsavelId, dados.responsavelUsuarioId);
    const serieId = dados.periodicidade ? randomUUID() : null;
    const tarefa = await tx.tarefa.create({
      data: {
        projetoId: dados.projetoId,
        nome: validarNome(dados.nome, "da tarefa"),
        descricao: dados.descricao ?? null,
        prazo: dados.prazo,
        prazoOriginal: dados.prazo,
        periodicidade: dados.periodicidade ?? null,
        serieId,
        diasAntecedencia: dados.diasAntecedencia ?? null,
        status: dados.status ?? StatusTarefa.A_INICIAR,
        responsavelId: dados.responsavelId ?? null,
        responsavelUsuarioId: dados.responsavelUsuarioId ?? null,
      },
    });
    await sincronizarAtribuicaoAutomatica(tx, tarefa.id, dados.responsavelId);
    return tarefa;
  });
}

export async function atualizarTarefa(
  ctx: ContextoUsuario,
  tarefaId: string,
  dados: Omit<DadosTarefa, "projetoId" | "prazo"> & { prazo: Date },
) {
  exigirAdministrador(ctx);
  if (!dados.prazo || Number.isNaN(dados.prazo.getTime())) throw new Error("Informe um prazo válido.");
  if (dados.diasAntecedencia !== null && dados.diasAntecedencia !== undefined && dados.diasAntecedencia <= 0) {
    throw new Error("A antecedência deve ser maior que zero.");
  }

  return comContextoDeUsuario(ctx, async (tx) => {
    const anterior = await tx.tarefa.findUniqueOrThrow({ where: { id: tarefaId }, select: { responsavelId: true, responsavelUsuarioId: true, projetoId: true } });
    await validarResponsavel(tx, anterior.projetoId, dados.responsavelId, dados.responsavelUsuarioId);
    const tarefa = await tx.tarefa.update({
      where: { id: tarefaId },
      data: {
        nome: validarNome(dados.nome, "da tarefa"),
        descricao: dados.descricao ?? null,
        prazo: dados.prazo,
        diasAntecedencia: dados.diasAntecedencia ?? null,
        status: dados.status ?? undefined,
        responsavelId: dados.responsavelId ?? null,
        responsavelUsuarioId: dados.responsavelUsuarioId ?? null,
      },
    });

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
    if (anterior.responsavelUsuarioId && anterior.responsavelUsuarioId !== dados.responsavelUsuarioId) {
      await tx.atribuicao.deleteMany({ where: { usuarioId: anterior.responsavelUsuarioId, entidadeTipo: "TAREFA", entidadeId: tarefaId } });
    }
    await sincronizarAtribuicaoAutomatica(tx, tarefa.id, dados.responsavelId);
    return tarefa;
  });
}

export async function atualizarStatusTarefa(ctx: ContextoUsuario, tarefaId: string, status: StatusTarefa) {
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, (tx) => tx.tarefa.update({ where: { id: tarefaId }, data: { status } }));
}

export async function criarSubtarefa(ctx: ContextoUsuario, dados: DadosSubtarefa) {
  exigirAdministrador(ctx);
  if (dados.prazo && Number.isNaN(dados.prazo.getTime())) throw new Error("Informe um prazo válido para a subtarefa.");
  return comContextoDeUsuario(ctx, async (tx) => {
    await validarResponsavelSubtarefa(tx, dados.tarefaId, dados.atribuidoAId, dados.atribuidoAUsuarioId);
    return tx.subtarefa.create({
      data: {
        tarefaId: dados.tarefaId,
        titulo: validarNome(dados.titulo, "da subtarefa"),
        descricao: dados.descricao?.trim() || null,
        prazo: dados.prazo ?? null,
        status: dados.status ?? undefined,
        etiquetas: dados.etiquetas ?? [],
        atribuidoAId: dados.atribuidoAId ?? null,
        atribuidoAUsuarioId: dados.atribuidoAUsuarioId ?? null,
      },
    });
  });
}

export async function atualizarSubtarefa(
  ctx: ContextoUsuario,
  subtarefaId: string,
  dados: Omit<DadosSubtarefa, "tarefaId">,
) {
  exigirAdministrador(ctx);
  if (dados.prazo && Number.isNaN(dados.prazo.getTime())) throw new Error("Informe um prazo válido para a subtarefa.");
  return comContextoDeUsuario(ctx, async (tx) => {
    const atual = await tx.subtarefa.findUniqueOrThrow({ where: { id: subtarefaId }, select: { tarefaId: true } });
    await validarResponsavelSubtarefa(tx, atual.tarefaId, dados.atribuidoAId, dados.atribuidoAUsuarioId);
    return tx.subtarefa.update({
      where: { id: subtarefaId },
      data: {
        titulo: validarNome(dados.titulo, "da subtarefa"),
        descricao: dados.descricao?.trim() || null,
        prazo: dados.prazo ?? null,
        status: dados.status ?? undefined,
        etiquetas: dados.etiquetas ?? [],
        atribuidoAId: dados.atribuidoAId ?? null,
        atribuidoAUsuarioId: dados.atribuidoAUsuarioId ?? null,
      },
    });
  });
}

export async function atualizarResponsavelSubtarefa(ctx: ContextoUsuario, subtarefaId: string, atribuidoAId: string | null, atribuidoAUsuarioId: string | null) {
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, async (tx) => {
    const atual = await tx.subtarefa.findUniqueOrThrow({ where: { id: subtarefaId }, select: { tarefaId: true } });
    await validarResponsavelSubtarefa(tx, atual.tarefaId, atribuidoAId, atribuidoAUsuarioId);
    return tx.subtarefa.update({ where: { id: subtarefaId }, data: { atribuidoAId, atribuidoAUsuarioId } });
  });
}

export async function criarDocumentoProjeto(ctx: ContextoUsuario, dados: DadosDocumentoProjeto) {
  exigirAdministrador(ctx);
  const nome = validarNome(dados.nome, "do documento");
  const link = dados.link.trim();
  if (!link) throw new Error("Informe o link do documento.");

  return comContextoDeUsuario(ctx, async (tx) => {
    if (dados.projetoId) {
      const projeto = await tx.projeto.findUnique({ where: { id: dados.projetoId }, select: { clienteId: true } });
      if (!projeto || projeto.clienteId !== dados.clienteId) throw new Error("Projeto não encontrado para este cliente.");
    }
    return tx.documento.create({ data: { clienteId: dados.clienteId, projetoId: dados.projetoId ?? null, nome, link } });
  });
}

export async function desativarOuReativar(
  ctx: ContextoUsuario,
  entidade: "projeto" | "tarefa" | "subtarefa",
  id: string,
  ativo: boolean,
) {
  exigirAdministrador(ctx);
  return definirAtivo(ctx, entidade, id, ativo);
}

export async function concluirTarefa(ctx: ContextoUsuario, tarefaId: string) {
  exigirColaboradorOuAdministrador(ctx);
  return comContextoDeUsuario(ctx, async (tx) => {
    const atual = await tx.tarefa.findUniqueOrThrow({ where: { id: tarefaId } });
    if (atual.status === StatusTarefa.CONCLUIDO) return { tarefa: atual, proxima: null };

    const prazo = atual.periodicidade && atual.prazo
      ? calcularProximaOcorrencia(atual.prazo, atual.periodicidade, atual.prazoOriginal ?? atual.prazo)
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

export async function concluirSubtarefa(ctx: ContextoUsuario, subtarefaId: string) {
  exigirColaboradorOuAdministrador(ctx);
  return comContextoDeUsuario(ctx, (tx) =>
    tx.subtarefa.update({ where: { id: subtarefaId }, data: { status: StatusSubtarefa.CONCLUIDO } }),
  );
}

export async function atualizarStatusSubtarefa(ctx: ContextoUsuario, subtarefaId: string, status: StatusSubtarefa) {
  if (status === StatusSubtarefa.CONCLUIDO) exigirColaboradorOuAdministrador(ctx);
  else exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, (tx) => tx.subtarefa.update({ where: { id: subtarefaId }, data: { status } }));
}
