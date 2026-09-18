/** A4 — ações de servidor/domínio do núcleo Projeto/Tarefa/Subtarefa. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Periodicidade, Prisma, StatusProjeto, StatusTarefa } from "@prisma/client";
import {
  atualizarProjeto,
  concluirSubtarefa,
  concluirTarefa,
  criarDocumentoProjeto,
  criarProjeto,
  criarSubtarefa,
  criarTarefa,
  desativarOuReativar,
} from "@/lib/projetos-tarefas";
import { buscarClienteDetalheSeguro } from "@/lib/clientes";
import { comoUsuario, ownerDb, limparFixtures, fecharConexoes } from "./setup/helpers";

const data = (valor: string) => new Date(`${valor}T00:00:00.000Z`);

let admin: { id: string };
let interno: { id: string };
let externo: { id: string };
let cliente: { id: string };
let pessoa: { id: string };
let projeto: { id: string; clienteId: string; status: StatusProjeto };
let tarefa: { id: string; projetoId: string; serieId: string | null; periodicidade: Periodicidade | null; prazoOriginal: Date | null };

const ctxAdmin = () => ({ usuarioId: admin.id, perfil: "ADMIN" as const });
const ctxInterno = () => ({ usuarioId: interno.id, perfil: "ADMIN_INTERNO" as const });
const ctxExterno = () => ({ usuarioId: externo.id, perfil: "ADMIN_EXTERNO" as const });

beforeAll(async () => {
  await limparFixtures();

  admin = await ownerDb.usuario.create({
    data: { nome: "Talita A4", email: "talita.a4@teste.local", perfil: "ADMIN" },
  });
  interno = await ownerDb.usuario.create({
    data: { nome: "Interno A4", email: "interno.a4@teste.local", perfil: "ADMIN_INTERNO" },
  });
  cliente = await ownerDb.cliente.create({
    data: {
      razaoSocial: "Cliente A4 Ltda",
      cnpj: "44555566000105",
      segmento: "Industrial",
      origemContato: "Indicação",
    },
  });
  pessoa = await ownerDb.pessoaEnvolvida.create({
    data: { clienteId: cliente.id, nome: "Responsável A4", email: "responsavel.a4@teste.local", temAcesso: true },
  });
  externo = await ownerDb.usuario.create({
    data: {
      nome: "Externo A4",
      email: "externo.a4@teste.local",
      perfil: "ADMIN_EXTERNO",
      pessoaEnvolvidaId: pessoa.id,
    },
  });
});

afterAll(async () => {
  await limparFixtures();
  await fecharConexoes();
});

describe("CRUD protegido no servidor", () => {
  it("Administrador cria projeto e tarefa recorrente com responsável", async () => {
    projeto = await criarProjeto(ctxAdmin(), {
      clienteId: cliente.id,
      nome: "Projeto A4",
      descricao: "Projeto criado no teste da A4",
      valorContratado: new Prisma.Decimal("12500.50"),
      dataInicio: data("2026-01-01"),
      dataPrevistaConclusao: data("2026-12-31"),
      status: StatusProjeto.A_INICIAR,
    });

    tarefa = await criarTarefa(ctxAdmin(), {
      projetoId: projeto.id,
      nome: "Renovação mensal",
      prazo: data("2026-01-31"),
      periodicidade: Periodicidade.MENSAL,
      responsavelId: pessoa.id,
    });

    expect(projeto.status).toBe(StatusProjeto.A_INICIAR);
    expect(tarefa.periodicidade).toBe(Periodicidade.MENSAL);
    expect(tarefa.prazoOriginal).toEqual(data("2026-01-31"));

    const valor = await ownerDb.valorProjeto.findUniqueOrThrow({ where: { projetoId: projeto.id } });
    expect(valor.valorContratado.toString()).toBe("12500.5");
    const detalheCliente = await buscarClienteDetalheSeguro(ctxAdmin(), cliente.id);
    expect(detalheCliente?.valorTotalProjetos?.toString()).toBe("12500.5");

    const atribuicao = await ownerDb.atribuicao.findFirst({
      where: { usuarioId: externo.id, entidadeTipo: "TAREFA", entidadeId: tarefa.id },
    });
    expect(atribuicao).not.toBeNull();
  });

  it("mantém o valor contratado inacessível a colaboradores no banco", async () => {
    const valores = await comoUsuario(ctxExterno(), (tx) => tx.valorProjeto.findMany());
    expect(valores).toEqual([]);
  });

  it("Administrador cria subtarefa e documento vinculado ao projeto", async () => {
    const subtarefa = await criarSubtarefa(ctxAdmin(), {
      tarefaId: tarefa.id,
      titulo: "Enviar relatório",
      etiquetas: ["urgente", "cliente"],
      atribuidoAId: pessoa.id,
    });
    const documento = await criarDocumentoProjeto(ctxAdmin(), {
      clienteId: cliente.id,
      projetoId: projeto.id,
      nome: "Relatório no Drive",
      link: "https://drive.google.com/documento-a4",
    });

    expect(subtarefa.etiquetas).toEqual(["urgente", "cliente"]);
    expect(documento.projetoId).toBe(projeto.id);
  });

  it("recusa responsável de subtarefa ausente ou que não pertence ao cliente", async () => {
    await expect(
      criarSubtarefa(ctxAdmin(), { tarefaId: tarefa.id, titulo: "Sem responsável", atribuidoAId: "" }),
    ).rejects.toThrow(/Selecione o responsável/);
    await expect(
      criarSubtarefa(ctxAdmin(), { tarefaId: tarefa.id, titulo: "Pessoa incorreta", atribuidoAId: "pessoa-inexistente" }),
    ).rejects.toThrow(/pessoa ativa deste cliente/);
  });

  it("colaborador não acessa CRUD administrativo", async () => {
    await expect(atualizarProjeto(ctxInterno(), projeto.id, { nome: "Tentativa" })).rejects.toThrow(/Administrador/);
    await expect(
      criarProjeto(ctxExterno(), { clienteId: cliente.id, nome: "Projeto proibido" }),
    ).rejects.toThrow(/Administrador/);
    await expect(
      criarSubtarefa(ctxExterno(), { tarefaId: tarefa.id, titulo: "Subtarefa proibida", atribuidoAId: pessoa.id }),
    ).rejects.toThrow(/Administrador/);
  });
});

describe("conclusão transacional", () => {
  it("colaborador conclui tarefa e a próxima ocorrência é materializada na mesma operação", async () => {
    const resultado = await concluirTarefa(ctxExterno(), tarefa.id);

    expect(resultado.tarefa.status).toBe(StatusTarefa.CONCLUIDO);
    expect(resultado.proxima?.prazo).toEqual(data("2026-02-28"));
    expect(resultado.proxima?.status).toBe(StatusTarefa.A_INICIAR);
    expect(resultado.proxima?.prazoOriginal).toEqual(data("2026-01-31"));

    const quantidadeAntes = await ownerDb.tarefa.count({ where: { serieId: tarefa.serieId } });
    const segundaConclusao = await concluirTarefa(ctxExterno(), tarefa.id);
    const quantidadeDepois = await ownerDb.tarefa.count({ where: { serieId: tarefa.serieId } });
    expect(segundaConclusao.proxima).toBeNull();
    expect(quantidadeDepois).toBe(quantidadeAntes);
  });

  it("responsável conclui subtarefa, mas colaborador sem atribuição específica não consegue", async () => {
    const atribuida = await ownerDb.subtarefa.findFirstOrThrow({ where: { tarefaId: tarefa.id } });
    await expect(concluirSubtarefa(ctxExterno(), atribuida.id)).resolves.toMatchObject({ concluida: true });

    const outra = await criarSubtarefa(ctxAdmin(), { tarefaId: tarefa.id, titulo: "Outra subtarefa", atribuidoAId: pessoa.id });
    const colega = await ownerDb.usuario.create({
      data: { nome: "Colega A4", email: "colega.a4@teste.local", perfil: "ADMIN_EXTERNO" },
    });
    await ownerDb.atribuicao.create({
      data: { usuarioId: colega.id, entidadeTipo: "TAREFA", entidadeId: tarefa.id },
    });
    await expect(concluirSubtarefa({ usuarioId: colega.id, perfil: "ADMIN_EXTERNO" }, outra.id)).rejects.toThrow();
  });
});

describe("soft delete do núcleo", () => {
  it("desativa e reativa projeto sem marcar seus filhos", async () => {
    expect(await desativarOuReativar(ctxAdmin(), "projeto", projeto.id, false)).toEqual({ sucesso: true });
    const depoisDeDesativar = await ownerDb.projeto.findUniqueOrThrow({ where: { id: projeto.id } });
    const tarefaDepois = await ownerDb.tarefa.findUniqueOrThrow({ where: { id: tarefa.id } });
    expect(depoisDeDesativar.ativo).toBe(false);
    expect(tarefaDepois.ativo).toBe(true);

    expect(await desativarOuReativar(ctxAdmin(), "projeto", projeto.id, true)).toEqual({ sucesso: true });
    const depoisDeReativar = await ownerDb.projeto.findUniqueOrThrow({ where: { id: projeto.id } });
    expect(depoisDeReativar.ativo).toBe(true);
    expect(depoisDeReativar.desativadoEm).toBeNull();
    expect(depoisDeReativar.desativadoPor).toBeNull();
  });

  it("Administrador exclui tarefa apenas de forma lógica e pode restaurá-la", async () => {
    expect(await desativarOuReativar(ctxAdmin(), "tarefa", tarefa.id, false)).toEqual({ sucesso: true });
    const desativada = await ownerDb.tarefa.findUniqueOrThrow({ where: { id: tarefa.id } });
    expect(desativada.ativo).toBe(false);
    expect(desativada.desativadoPor).toBe(admin.id);
    expect(desativada.desativadoEm).not.toBeNull();

    await expect(desativarOuReativar(ctxExterno(), "tarefa", tarefa.id, true)).rejects.toThrow(/Administrador/);
    expect(await desativarOuReativar(ctxAdmin(), "tarefa", tarefa.id, true)).toEqual({ sucesso: true });
    const reativada = await ownerDb.tarefa.findUniqueOrThrow({ where: { id: tarefa.id } });
    expect(reativada.ativo).toBe(true);
    expect(reativada.desativadoEm).toBeNull();
    expect(reativada.desativadoPor).toBeNull();
  });
});
