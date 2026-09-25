/** A4 — ações de servidor/domínio do núcleo Projeto/Tarefa/Subtarefa. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Periodicidade, Prisma, StatusProjeto, StatusSubtarefa, StatusTarefa } from "@prisma/client";
import {
  atualizarProjeto,
  concluirSubtarefa,
  concluirTarefa,
  criarDocumentoProjeto,
  criarProjeto,
  criarSubtarefa,
  criarTarefa,
  desativarOuReativar,
  atualizarSubtarefa,
  buscarTarefa,
  buscarTarefaParaColaborador,
  buscarProjetoAtribuido,
  listarProjetosAtribuidos,
  listarTarefasAtribuidas,
} from "@/lib/projetos-tarefas";
import { buscarClienteContextual, buscarClienteDetalheSeguro, listarClientesContextuais } from "@/lib/clientes";
import { comoUsuario, ownerDb, limparFixtures, fecharConexoes } from "./setup/helpers";

const data = (valor: string) => new Date(`${valor}T00:00:00.000Z`);

let admin: { id: string };
let interno: { id: string };
let externo: { id: string };
let cliente: { id: string; razaoSocial: string };
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

  it("Administrador pode atribuir uma subtarefa à Talita ou a integrante ativa da equipe", async () => {
    const subtarefa = await criarSubtarefa(ctxAdmin(), {
      tarefaId: tarefa.id,
      titulo: "Validar documentação",
      atribuidoAUsuarioId: admin.id,
    });

    expect(subtarefa.atribuidoAUsuarioId).toBe(admin.id);
    expect(subtarefa.atribuidoAId).toBeNull();
  });

  it("ao trocar o responsável, a subtarefa passa a exibir o integrante salvo", async () => {
    const subtarefa = await criarSubtarefa(ctxAdmin(), {
      tarefaId: tarefa.id,
      titulo: "Conferir licença",
      atribuidoAUsuarioId: admin.id,
    });

    await atualizarSubtarefa(ctxAdmin(), subtarefa.id, {
      titulo: subtarefa.titulo,
      etiquetas: subtarefa.etiquetas,
      atribuidoAUsuarioId: interno.id,
    });

    const detalhe = await buscarTarefa(ctxAdmin(), tarefa.id);
    const atualizada = detalhe?.subtarefas.find((item) => item.id === subtarefa.id);
    expect(atualizada).toMatchObject({ atribuidoAUsuarioId: interno.id, atribuidoAId: null });
  });

  it("responsável por subtarefa vê o cliente e projeto relacionados, mas somente a tarefa em que foi mencionado", async () => {
    const minha = await criarSubtarefa(ctxAdmin(), {
      tarefaId: tarefa.id,
      titulo: "Item do colaborador interno",
      atribuidoAUsuarioId: interno.id,
    });
    await criarSubtarefa(ctxAdmin(), {
      tarefaId: tarefa.id,
      titulo: "Item de outra pessoa",
      atribuidoAUsuarioId: admin.id,
    });

    const tarefas = await listarTarefasAtribuidas(ctxInterno());
    expect(tarefas.map((item) => item.id)).toContain(tarefa.id);

    const detalhe = await buscarTarefaParaColaborador(ctxInterno(), tarefa.id);
    expect(detalhe?.subtarefas.map((item) => item.id)).toContain(minha.id);
    expect(detalhe?.subtarefas.every((item) => item.atribuidoAUsuarioId === interno.id)).toBe(true);
    expect(detalhe?.podeConcluirTarefa).toBe(false);
    const projetoVisivel = await buscarProjetoAtribuido(ctxInterno(), projeto.id);
    expect(projetoVisivel?.cliente.razaoSocial).toBe(cliente.razaoSocial);
    expect(projetoVisivel?.tarefas.map((item) => item.id)).toEqual([tarefa.id]);
    const outroProjeto = await criarProjeto(ctxAdmin(), { clienteId: cliente.id, nome: "Projeto sem menção" });
    await criarTarefa(ctxAdmin(), { projetoId: outroProjeto.id, nome: "Tarefa de outra equipe", prazo: data("2026-07-01") });
    const projetos = await listarProjetosAtribuidos(ctxInterno());
    expect(projetos.map((item) => item.id)).toContain(projeto.id);
    expect(projetos.map((item) => item.id)).not.toContain(outroProjeto.id);
    await expect(buscarProjetoAtribuido(ctxInterno(), outroProjeto.id)).resolves.toBeNull();
    const clientes = await listarClientesContextuais(ctxInterno());
    expect(clientes).toContainEqual(expect.objectContaining({ id: cliente.id, razaoSocial: cliente.razaoSocial }));
    expect(clientes[0]).not.toHaveProperty("email");
    expect(clientes[0]).not.toHaveProperty("valorContratado");
    const clienteContextual = await buscarClienteContextual(ctxInterno(), cliente.id);
    expect(clienteContextual).toMatchObject({ id: cliente.id, razaoSocial: cliente.razaoSocial });
    expect(clienteContextual).not.toHaveProperty("email");
    expect(await ownerDb.usuario.findUnique({ where: { id: interno.id }, select: { pessoaEnvolvidaId: true } })).toEqual({ pessoaEnvolvidaId: null });
    expect(await ownerDb.atribuicao.findMany({ where: { usuarioId: interno.id } })).toEqual([]);
    await expect(concluirSubtarefa(ctxInterno(), minha.id)).resolves.toMatchObject({ status: StatusSubtarefa.CONCLUIDO });
    await expect(concluirTarefa(ctxInterno(), tarefa.id)).rejects.toThrow();
  });

  it("responsável direto da tarefa vê apenas o projeto e a tarefa relacionados", async () => {
    const projetoDireto = await criarProjeto(ctxAdmin(), { clienteId: cliente.id, nome: "Projeto de responsabilidade direta" });
    const minhaTarefa = await criarTarefa(ctxAdmin(), {
      projetoId: projetoDireto.id,
      nome: "Tarefa do colaborador interno",
      prazo: data("2026-08-10"),
      responsavelUsuarioId: interno.id,
    });
    await criarTarefa(ctxAdmin(), { projetoId: projetoDireto.id, nome: "Tarefa não atribuída", prazo: data("2026-08-11") });

    const detalhe = await buscarProjetoAtribuido(ctxInterno(), projetoDireto.id);
    expect(detalhe?.cliente.razaoSocial).toBe(cliente.razaoSocial);
    expect(detalhe?.tarefas.map((item) => item.id)).toEqual([minhaTarefa.id]);
    expect((await buscarTarefaParaColaborador(ctxInterno(), minhaTarefa.id))?.podeConcluirTarefa).toBe(true);
    await expect(concluirTarefa(ctxInterno(), minhaTarefa.id)).resolves.toMatchObject({ tarefa: { id: minhaTarefa.id } });
  });

  it("colaborador externo responsável só por subtarefa vê o mesmo contexto restrito", async () => {
    const externoDireto = await ownerDb.usuario.create({
      data: { nome: "Externo de subtarefa", email: "externo-subtarefa@teste.local", perfil: "ADMIN_EXTERNO" },
    });
    const projetoExterno = await criarProjeto(ctxAdmin(), { clienteId: cliente.id, nome: "Projeto de subtarefa externa" });
    const minhaTarefa = await criarTarefa(ctxAdmin(), { projetoId: projetoExterno.id, nome: "Tarefa visível ao externo", prazo: data("2026-09-10") });
    await criarTarefa(ctxAdmin(), { projetoId: projetoExterno.id, nome: "Tarefa invisível ao externo", prazo: data("2026-09-11") });
    await criarSubtarefa(ctxAdmin(), { tarefaId: minhaTarefa.id, titulo: "Item externo", atribuidoAUsuarioId: externoDireto.id });

    const projetoVisivel = await buscarProjetoAtribuido({ usuarioId: externoDireto.id, perfil: "ADMIN_EXTERNO" }, projetoExterno.id);
    expect(projetoVisivel?.cliente.razaoSocial).toBe(cliente.razaoSocial);
    expect(projetoVisivel?.tarefas.map((item) => item.id)).toEqual([minhaTarefa.id]);
  });

  it("recusa responsável de subtarefa ausente ou que não pertence ao cliente", async () => {
    await expect(
      criarSubtarefa(ctxAdmin(), { tarefaId: tarefa.id, titulo: "Sem responsável", atribuidoAId: "" }),
    ).rejects.toThrow(/Selecione o responsável/);
    await expect(
      criarSubtarefa(ctxAdmin(), { tarefaId: tarefa.id, titulo: "Pessoa incorreta", atribuidoAId: "pessoa-inexistente" }),
    ).rejects.toThrow(/pessoa ativa deste cliente/);
    await expect(
      criarSubtarefa(ctxAdmin(), {
        tarefaId: tarefa.id,
        titulo: "Dois responsáveis",
        atribuidoAId: pessoa.id,
        atribuidoAUsuarioId: admin.id,
      }),
    ).rejects.toThrow(/apenas um responsável/);
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
    const atribuida = await ownerDb.subtarefa.findFirstOrThrow({ where: { tarefaId: tarefa.id, atribuidoAId: pessoa.id } });
    await expect(concluirSubtarefa(ctxExterno(), atribuida.id)).resolves.toMatchObject({ status: StatusSubtarefa.CONCLUIDO });

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
