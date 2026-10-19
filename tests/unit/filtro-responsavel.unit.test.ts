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
  listarPrazos: async () => [{ id: "t1", nome: "Tarefa da equipe", projeto: { id: "p1", nome: "Projeto", cliente: { id: "c1", razaoSocial: "Cliente" } }, responsavel: null, responsavelUsuario: { nome: "Responsável da equipe" }, _count: { subtarefas: 0 }, status: "EM_ANDAMENTO" }],
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
  });
});

it("mostra responsável da equipe tanto na tabela quanto no cartão de tarefas", async () => {
  const { default: Page } = await import("@/app/(painel)/tarefas/page");
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));
  expect(html.match(/Responsável da equipe/g)).toHaveLength(2);
});

it("preserva a seleção ausente nas opções para permitir limpar o filtro", async () => {
  const { FiltrosListagens } = await import("@/app/(painel)/filtros-listagens");
  const html = renderToStaticMarkup(createElement(FiltrosListagens, { rota: "/tarefas", clientes: [], projetos: [], tarefas: [], responsaveis: [], responsavelInicial: "usuario:fora" }));
  expect(html).toContain('value="usuario:fora" selected=""');
  expect(html).toContain("Sem resultados nesta seleção");
  expect(html).toContain("Todos os responsáveis");
});
