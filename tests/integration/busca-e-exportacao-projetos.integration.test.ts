/**
 * Busca geral da barra superior, filtro de cliente na lista de projetos e exportação dela em PDF. Roda contra o
 * Postgres de verdade, pela role RLS-restrita: o colaborador só encontra o que o escopo dele alcança.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buscarNoSistema } from "@/lib/busca-global";
import { listarProjetos } from "@/lib/projetos-tarefas";
import { gerarExportacaoTarefasPdf } from "@/lib/exportacao-pdf-tarefas";
import { ownerDb, limparFixtures, fecharConexoes } from "./setup/helpers";

let admin: { id: string };
let interno: { id: string };
let externo: { id: string };
let clienteA: { id: string };
let clienteB: { id: string };
let projetoDoInterno: { id: string };

const ctxAdmin = () => ({ usuarioId: admin.id, perfil: "ADMIN" as const });
const ctxInterno = () => ({ usuarioId: interno.id, perfil: "ADMIN_INTERNO" as const });
const ctxExterno = () => ({ usuarioId: externo.id, perfil: "ADMIN_EXTERNO" as const });

beforeAll(async () => {
  await limparFixtures();
  admin = await ownerDb.usuario.create({ data: { nome: "Talita busca", email: "talita.busca@teste.local", perfil: "ADMIN" } });
  interno = await ownerDb.usuario.create({ data: { nome: "Interno busca", email: "interno.busca@teste.local", perfil: "ADMIN_INTERNO" } });
  externo = await ownerDb.usuario.create({ data: { nome: "Externo busca", email: "externo.busca@teste.local", perfil: "ADMIN_EXTERNO" } });
  clienteA = await ownerDb.cliente.create({ data: { razaoSocial: "Zeta Busca Ltda", cnpj: "66777888000109", segmento: "Industrial", origemContato: "Indicação" } });
  clienteB = await ownerDb.cliente.create({ data: { razaoSocial: "Omega Busca Ltda", cnpj: "77888999000110", segmento: "Industrial", origemContato: "Indicação" } });
  projetoDoInterno = await ownerDb.projeto.create({ data: { clienteId: clienteA.id, nome: "Licença Zeta", numeroProposta: "777/2030" } });
  const projetoDeOutro = await ownerDb.projeto.create({ data: { clienteId: clienteB.id, nome: "Licença Omega" } });
  await ownerDb.projeto.create({ data: { clienteId: clienteA.id, nome: "Licença antiga Zeta", ativo: false } });
  await ownerDb.atribuicao.create({ data: { usuarioId: interno.id, entidadeTipo: "PROJETO", entidadeId: projetoDoInterno.id } });
  await ownerDb.tarefa.create({ data: { projetoId: projetoDoInterno.id, nome: "Relatório Zeta" } });
  await ownerDb.tarefa.create({ data: { projetoId: projetoDeOutro.id, nome: "Relatório Omega" } });
});

afterAll(async () => {
  await limparFixtures();
  await fecharConexoes();
});

describe("busca geral", () => {
  it("a administração encontra clientes, projetos e tarefas ativos", async () => {
    const r = await buscarNoSistema(ctxAdmin(), "busca");
    expect(r.clientes.map((c) => c.razaoSocial).sort()).toEqual(["Omega Busca Ltda", "Zeta Busca Ltda"]);
    const porNome = await buscarNoSistema(ctxAdmin(), "licença");
    expect(porNome.projetos.map((p) => p.nome).sort()).toEqual(["Licença Omega", "Licença Zeta"]);
    expect((await buscarNoSistema(ctxAdmin(), "relatório")).tarefas.map((t) => t.nome).sort()).toEqual(["Relatório Omega", "Relatório Zeta"]);
    expect((await buscarNoSistema(ctxAdmin(), "777/2030")).projetos.map((p) => p.nome)).toEqual(["Licença Zeta"]);
  });

  it("não devolve registro desativado", async () => {
    const r = await buscarNoSistema(ctxAdmin(), "antiga");
    expect(r.projetos).toEqual([]);
  });

  it("o colaborador interno só encontra o que o escopo dele alcança", async () => {
    const r = await buscarNoSistema(ctxInterno(), "zeta");
    expect(r.projetos.map((p) => p.nome)).toEqual(["Licença Zeta"]);
    expect(r.tarefas.map((t) => t.nome)).toEqual(["Relatório Zeta"]);
    const outro = await buscarNoSistema(ctxInterno(), "omega");
    expect(outro.clientes).toEqual([]);
    expect(outro.projetos).toEqual([]);
    expect(outro.tarefas).toEqual([]);
  });

  it("devolve só identificador e nomes, sem dado cadastral nem financeiro", async () => {
    const r = await buscarNoSistema(ctxAdmin(), "zeta");
    expect(Object.keys(r.clientes[0]).sort()).toEqual(["id", "razaoSocial"]);
    expect(Object.keys(r.projetos[0]).sort()).toEqual(["cliente", "id", "nome"]);
  });

  it("termo curto não lista o sistema e os demais perfis são recusados", async () => {
    expect(await buscarNoSistema(ctxAdmin(), "z")).toMatchObject({ clientes: [], projetos: [], tarefas: [] });
    await expect(buscarNoSistema(ctxExterno(), "zeta")).rejects.toThrow("Busca disponível somente");
    await expect(buscarNoSistema({ usuarioId: admin.id, perfil: "CLIENTE" }, "zeta")).rejects.toThrow("Busca disponível somente");
  });
});

describe("lista de projetos por cliente e exportação em PDF", () => {
  it("filtra a lista pelo cliente", async () => {
    const doCliente = await listarProjetos(ctxAdmin(), false, undefined, clienteB.id);
    expect(doCliente.map((p) => p.nome)).toEqual(["Licença Omega"]);
    const todos = await listarProjetos(ctxAdmin());
    expect(todos.length).toBeGreaterThanOrEqual(2);
  });

  it("gera o PDF da lista com os filtros aplicados e só para a administração", async () => {
    const pdf = await gerarExportacaoTarefasPdf(ctxAdmin(), new URLSearchParams({ cliente: clienteA.id, situacao: "sem" }), "projetos");
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    await expect(gerarExportacaoTarefasPdf(ctxInterno(), new URLSearchParams(), "projetos")).rejects.toThrow("Ação restrita ao Administrador.");
  });

  it("recusa filtro inválido ou repetido", async () => {
    await expect(gerarExportacaoTarefasPdf(ctxAdmin(), new URLSearchParams({ cliente: "../x" }), "projetos")).rejects.toThrow("O filtro cliente é inválido.");
    const repetido = new URLSearchParams([["situacao", "atrasado"], ["situacao", "prazo"]]);
    await expect(gerarExportacaoTarefasPdf(ctxAdmin(), repetido, "projetos")).rejects.toThrow("O filtro situacao foi informado mais de uma vez.");
  });
});
