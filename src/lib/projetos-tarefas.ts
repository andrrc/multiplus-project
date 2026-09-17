import { randomUUID } from "node:crypto";
import {
  StatusProjeto,
  StatusTarefa,
  type Prisma,
  type Periodicidade,
} from "@prisma/client";
import { comContextoDeUsuario, type ContextoUsuario } from "@/lib/prisma-app";
import { calcularProximaOcorrencia } from "@/lib/regras-projetos-tarefas";
import { definirAtivo } from "@/lib/desativacao";

export type DadosProjeto = {
  clienteId: string;
  nome: string;
  descricao?: string | null;
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
  periodicidade?: Periodicidade | null;
  diasAntecedencia?: number | null;
  status?: StatusTarefa;
};

export type DadosSubtarefa = {
  tarefaId: string;
  titulo: string;
  etiquetas?: string[];
  atribuidoAId?: string | null;
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
    tx.pessoaEnvolvida.findMany({
      where: { clienteId, ativo: true },
      select: { id: true, nome: true, temAcesso: true },
      orderBy: { nome: "asc" },
    }),
  );
}

export async function listarProjetos(ctx: ContextoUsuario, incluirDesativados = false) {
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, (tx) =>
    tx.projeto.findMany({
      where: incluirDesativados ? {} : { ativo: true },
      include: { cliente: { select: { razaoSocial: true } }, _count: { select: { tarefas: true } } },
      orderBy: [{ ativo: "desc" }, { atualizadoEm: "desc" }],
    }),
  );
}

export async function buscarProjeto(ctx: ContextoUsuario, projetoId: string, incluirDesativados = false) {
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, (tx) =>
    tx.projeto.findFirst({
      where: { id: projetoId, ...(incluirDesativados ? {} : { ativo: true }) },
      include: {
        cliente: { select: { id: true, razaoSocial: true } },
        tarefas: {
          where: incluirDesativados ? {} : { ativo: true },
          include: { responsavel: { select: { nome: true } }, subtarefas: { where: incluirDesativados ? {} : { ativo: true } } },
          orderBy: [{ prazo: "asc" }, { nome: "asc" }],
        },
        documentos: { where: incluirDesativados ? {} : { ativo: true }, orderBy: { criadoEm: "desc" } },
      },
    }),
  );
}

export async function buscarTarefa(ctx: ContextoUsuario, tarefaId: string, incluirDesativados = false) {
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, (tx) =>
    tx.tarefa.findFirst({
      where: { id: tarefaId, ...(incluirDesativados ? {} : { ativo: true }) },
      include: {
        projeto: { include: { cliente: { select: { razaoSocial: true } } } },
        responsavel: { select: { id: true, nome: true, temAcesso: true } },
        subtarefas: {
          where: incluirDesativados ? {} : { ativo: true },
          include: { atribuidoA: { select: { nome: true } } },
          orderBy: { criadoEm: "asc" },
        },
      },
    }),
  );
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

export async function criarProjeto(ctx: ContextoUsuario, dados: DadosProjeto) {
  exigirAdministrador(ctx);
  validarDatasProjeto(dados);
  return comContextoDeUsuario(ctx, (tx) =>
    tx.projeto.create({
      data: {
        clienteId: dados.clienteId,
        nome: validarNome(dados.nome, "do projeto"),
        descricao: dados.descricao ?? null,
        dataInicio: dados.dataInicio ?? null,
        dataPrevistaConclusao: dados.dataPrevistaConclusao ?? null,
        status: dados.status ?? StatusProjeto.A_INICIAR,
      },
    }),
  );
}

export async function atualizarProjeto(
  ctx: ContextoUsuario,
  projetoId: string,
  dados: Omit<DadosProjeto, "clienteId">,
) {
  exigirAdministrador(ctx);
  validarDatasProjeto({ ...dados, clienteId: "" });
  return comContextoDeUsuario(ctx, (tx) =>
    tx.projeto.update({
      where: { id: projetoId },
      data: {
        nome: validarNome(dados.nome, "do projeto"),
        descricao: dados.descricao ?? null,
        dataInicio: dados.dataInicio ?? null,
        dataPrevistaConclusao: dados.dataPrevistaConclusao ?? null,
        status: dados.status ?? undefined,
      },
    }),
  );
}

export async function criarTarefa(ctx: ContextoUsuario, dados: DadosTarefa) {
  exigirAdministrador(ctx);
  if (!dados.prazo || Number.isNaN(dados.prazo.getTime())) throw new Error("Informe um prazo válido.");
  if (dados.periodicidade && !dados.prazo) throw new Error("Tarefa recorrente precisa de prazo.");
  if (dados.diasAntecedencia !== null && dados.diasAntecedencia !== undefined && dados.diasAntecedencia <= 0) {
    throw new Error("A antecedência deve ser maior que zero.");
  }

  return comContextoDeUsuario(ctx, async (tx) => {
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
    const anterior = await tx.tarefa.findUniqueOrThrow({ where: { id: tarefaId }, select: { responsavelId: true } });
    const tarefa = await tx.tarefa.update({
      where: { id: tarefaId },
      data: {
        nome: validarNome(dados.nome, "da tarefa"),
        descricao: dados.descricao ?? null,
        prazo: dados.prazo,
        diasAntecedencia: dados.diasAntecedencia ?? null,
        status: dados.status ?? undefined,
        responsavelId: dados.responsavelId ?? null,
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
    await sincronizarAtribuicaoAutomatica(tx, tarefa.id, dados.responsavelId);
    return tarefa;
  });
}

export async function criarSubtarefa(ctx: ContextoUsuario, dados: DadosSubtarefa) {
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, (tx) =>
    tx.subtarefa.create({
      data: {
        tarefaId: dados.tarefaId,
        titulo: validarNome(dados.titulo, "da subtarefa"),
        etiquetas: dados.etiquetas ?? [],
        atribuidoAId: dados.atribuidoAId ?? null,
      },
    }),
  );
}

export async function atualizarSubtarefa(
  ctx: ContextoUsuario,
  subtarefaId: string,
  dados: Omit<DadosSubtarefa, "tarefaId">,
) {
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, (tx) =>
    tx.subtarefa.update({
      where: { id: subtarefaId },
      data: {
        titulo: validarNome(dados.titulo, "da subtarefa"),
        etiquetas: dados.etiquetas ?? [],
        atribuidoAId: dados.atribuidoAId ?? null,
      },
    }),
  );
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
    tx.subtarefa.update({ where: { id: subtarefaId }, data: { concluida: true } }),
  );
}
