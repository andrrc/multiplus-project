/** RF-005/RF-037 e RN-007: filtro por responsável e nome da equipe na listagem. */
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { condicaoResponsavel, interpretarResponsavel, urlFiltrosListagens } from "@/lib/filtro-responsavel";

vi.mock("@/server/auth/contexto", () => ({ exigirAcessoARota: vi.fn(async () => ({ usuarioId: "admin", perfil: "ADMIN" })) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/semaforo", () => ({ buscarLimitesSemaforo: async () => ({}) }));
vi.mock("@/ui/indicador-dias-restantes", () => ({ IndicadorSemaforoProjeto: () => null }));
vi.mock("@/lib/projetos-tarefas", () => ({
  listarPrazos: vi.fn(async () => [{ id: "t1", nome: "Tarefa da equipe", projeto: { id: "p1", nome: "Projeto", cliente: { id: "c1", razaoSocial: "Cliente" } }, responsavel: null, responsavelUsuario: { nome: "Responsável da equipe" }, _count: { subtarefas: 0 }, progressoSubtarefas: { concluidas: 2, total: 6 }, status: "EM_ANDAMENTO" }]),
  listarProjetos: async () => [], listarClientesParaProjeto: async () => [], listarTarefasParaFiltro: async () => [], listarResponsaveisParaFiltro: async () => [],
}));

describe("responsável na URL", () => {
  it.each([undefined, ""])("sem seleção lista todos (%s)", valor => expect(interpretarResponsavel(valor)).toEqual({ tipo: "todos" }));
  it.each(["pessoa", "usuario"])("identifica origem %s", tipo => expect(interpretarResponsavel(`${tipo}:abc123`)).toEqual({ tipo, id: "abc123" }));
  it.each(["qualquer:abc", "pessoa:", "usuario:a:b", "pessoa:../a", ["sem", "usuario:abc"], ["sem"]])("recusa valor inválido %j", valor => {
    expect(interpretarResponsavel(valor)).toEqual({ tipo: "invalido" });
    expect(condicaoResponsavel(valor, "pessoaId", "usuarioId")).toEqual({ id: { in: [] } });
  });
  it("sem responsável exige os dois vínculos nulos", () => expect(condicaoResponsavel("sem", "pessoaId", "usuarioId")).toEqual({ pessoaId: null, usuarioId: null }));
  it("compõe todos os filtros sem perder responsável ou toggle", () => {
    const valores = { cliente: "c1", projeto: "p1", tarefa: "t1", responsavel: "usuario:u1", mostrarConcluidas: true };
    expect(urlFiltrosListagens("/subtarefas", valores, true)).toBe("/subtarefas?cliente=c1&projeto=p1&tarefa=t1&responsavel=usuario%3Au1&todos=1");
    expect(urlFiltrosListagens("/tarefas", { ...valores, cliente: "c2", projeto: "", tarefa: "" }, false)).toBe("/tarefas?cliente=c2&responsavel=usuario%3Au1");
    expect(urlFiltrosListagens("/tarefas", { ...valores, cliente: "", projeto: "", tarefa: "", responsavel: "" }, false)).toBe("/tarefas");
  });  it("inclui a situação do prazo na URL e omite 'todos'", () => {
    const base = { cliente: "", projeto: "", tarefa: "", responsavel: "", mostrarConcluidas: false };
    expect(urlFiltrosListagens("/tarefas", { ...base, situacao: "atrasado" }, false)).toBe("/tarefas?situacao=atrasado");
    expect(urlFiltrosListagens("/tarefas", { ...base, situacao: "todos" }, false)).toBe("/tarefas");
    expect(urlFiltrosListagens("/subtarefas", { ...base, cliente: "c1", situacao: "proximo", mostrarConcluidas: true }, true)).toBe("/subtarefas?cliente=c1&situacao=proximo&todos=1");
  });
});

describe("situação do prazo na lista de tarefas", () => {
  it("filtra pela situação e mantém as contagens da lista inteira", async () => {
    const { default: Page } = await import("@/app/(painel)/tarefas/page");
    // A tarefa do mock não tem prazo, então pertence a "Sem prazo".
    const semPrazo = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ situacao: "sem" }) }));
    expect(semPrazo).toContain("Tarefa da equipe");
    const atrasadas = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ situacao: "atrasado" }) }));
    expect(atrasadas).not.toContain("Tarefa da equipe");
    expect(atrasadas).toContain("Nenhuma tarefa nesta seleção.");
    // Os botões continuam contando a lista inteira: 1 tarefa sem prazo, 0 atrasadas.
    expect(atrasadas).toMatch(/Sem prazo<span[^>]*>1<\/span>/);
    expect(atrasadas).toMatch(/Atrasados<span[^>]*>0<\/span>/);
  });
  it("ignora situação desconhecida em vez de esvaziar a lista", async () => {
    const { default: Page } = await import("@/app/(painel)/tarefas/page");
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ situacao: "qualquer" }) }));
    expect(html).toContain("Tarefa da equipe");
  });
});

it("mostra o responsável da equipe na linha da tarefa (tabela única, que vira cartão no celular)", async () => {
  const { default: Page } = await import("@/app/(painel)/tarefas/page");
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));
  expect(html.match(/Responsável da equipe/g)).toHaveLength(1);
});

it("preserva a seleção ausente nas opções para permitir limpar o filtro", async () => {
  const { FiltrosListagens } = await import("@/app/(painel)/filtros-listagens");
  const html = renderToStaticMarkup(createElement(FiltrosListagens, { rota: "/tarefas", clientes: [], projetos: [], tarefas: [], responsaveis: [], responsavelInicial: "usuario:fora" }));
  expect(html).toContain('value="usuario:fora" selected=""');
  expect(html).toContain("Sem resultados nesta seleção");
  expect(html).toContain("Todos os responsáveis");
});


describe("progresso ao filtrar responsável (RF-008/RF-039)", () => {
  it.each(["pessoa:p1", "usuario:u1", "sem"])("mostra 2/6 na linha da tarefa ao selecionar %s", async responsavel => {
    const { default: Page } = await import("@/app/(painel)/tarefas/page");
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ responsavel }) }));
    const { listarPrazos } = await import("@/lib/projetos-tarefas");
    expect(listarPrazos).toHaveBeenLastCalledWith({ usuarioId: "admin", perfil: "ADMIN" }, expect.objectContaining({ responsavel }), true);
    expect(html.match(/Subtarefas: /g)).toHaveLength(1);
    expect(html.match(/aria-label="2 de 6 subtarefas concluídas"/g)).toHaveLength(1);
    expect(html.match(/2[/]6/g)).toHaveLength(1);
    expect(html).toContain("concluídas");
  });
  it.each([undefined, "", "invalido", ["sem", "usuario:u1"]])("oculta progresso sem seleção válida (%j)", async responsavel => {
    const { default: Page } = await import("@/app/(painel)/tarefas/page");
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ responsavel }) }));
    const { listarPrazos } = await import("@/lib/projetos-tarefas");
    expect(listarPrazos).toHaveBeenLastCalledWith({ usuarioId: "admin", perfil: "ADMIN" }, expect.objectContaining({ responsavel }), false);
    expect(html).not.toContain("Subtarefas: ");
    expect(html).not.toContain("2 de 6 subtarefas concluídas");
  });
});
