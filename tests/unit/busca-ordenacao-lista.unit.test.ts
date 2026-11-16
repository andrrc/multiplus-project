/** Busca de texto e ordenação pelos cabeçalhos das listas de Tarefas e Subtarefas. */
import { describe, expect, it } from "vitest";
import { correspondeABusca, interpretarBuscaLista, normalizarTexto } from "@/lib/busca-lista";
import { hrefDeOrdenacao, interpretarOrdem, ordenarLista, proximaOrdem } from "@/lib/ordenacao-lista";
import { buscarEOrdenarSubtarefas, buscarEOrdenarTarefas } from "@/lib/lista-tarefas";
import { urlFiltrosListagens } from "@/lib/filtro-responsavel";

describe("busca de texto", () => {
  it("ignora maiúsculas e acentos", () => {
    expect(normalizarTexto("Licença AMBIENTAL")).toBe("licenca ambiental");
    expect(correspondeABusca("licenca", ["Renovação da Licença de operação"])).toBe(true);
  });

  it("exige todas as palavras, em qualquer campo", () => {
    expect(correspondeABusca("alfa licenca", ["Licença de operação", "Indústria Alfa Ltda"])).toBe(true);
    expect(correspondeABusca("alfa cadri", ["Licença de operação", "Indústria Alfa Ltda"])).toBe(false);
  });

  it("termo vazio não filtra e campos ausentes são ignorados", () => {
    expect(correspondeABusca("", ["x"])).toBe(true);
    expect(correspondeABusca("   ", [null, undefined])).toBe(true);
    expect(correspondeABusca("abc", [null, "abc"])).toBe(true);
  });

  it("lê o termo da URL: só um valor, sem espaços sobrando e com limite", () => {
    expect(interpretarBuscaLista("  gestão   ambiental ")).toBe("gestão ambiental");
    expect(interpretarBuscaLista(["a", "b"])).toBe("");
    expect(interpretarBuscaLista(undefined)).toBe("");
    expect(interpretarBuscaLista("x".repeat(500)).length).toBe(120);
  });
});

describe("ordenação da lista", () => {
  const chaves = ["nome", "prazo"] as const;

  it("lê a chave e a direção; chave desconhecida é ignorada", () => {
    expect(interpretarOrdem("prazo", chaves)).toEqual({ chave: "prazo", direcao: "asc" });
    expect(interpretarOrdem("-prazo", chaves)).toEqual({ chave: "prazo", direcao: "desc" });
    expect(interpretarOrdem("valor", chaves)).toBeNull();
    expect(interpretarOrdem(["prazo", "nome"], chaves)).toBeNull();
    expect(interpretarOrdem(undefined, chaves)).toBeNull();
  });

  it("o clique alterna entre crescente e decrescente", () => {
    expect(proximaOrdem(null, "prazo")).toBe("prazo");
    expect(proximaOrdem({ chave: "prazo", direcao: "asc" }, "prazo")).toBe("-prazo");
    expect(proximaOrdem({ chave: "prazo", direcao: "desc" }, "prazo")).toBe("prazo");
    expect(proximaOrdem({ chave: "nome", direcao: "asc" }, "prazo")).toBe("prazo");
  });

  it("ordena texto em português e deixa os ausentes no fim, em qualquer direção", () => {
    const itens = [{ nome: "Zebra", prazo: null }, { nome: "ábaco", prazo: new Date("2030-02-01") }, { nome: "Barco", prazo: new Date("2030-01-01") }];
    const extratores = { nome: (i: (typeof itens)[number]) => i.nome, prazo: (i: (typeof itens)[number]) => i.prazo };
    expect(ordenarLista(itens, { chave: "nome", direcao: "asc" }, extratores).map((i) => i.nome)).toEqual(["ábaco", "Barco", "Zebra"]);
    expect(ordenarLista(itens, { chave: "prazo", direcao: "asc" }, extratores).map((i) => i.nome)).toEqual(["Barco", "ábaco", "Zebra"]);
    expect(ordenarLista(itens, { chave: "prazo", direcao: "desc" }, extratores).map((i) => i.nome)).toEqual(["ábaco", "Barco", "Zebra"]);
    expect(ordenarLista(itens, null, extratores)).toEqual(itens);
  });

  it("o link do cabeçalho preserva os demais parâmetros e troca a ordem", () => {
    const ordem = interpretarOrdem("prazo", chaves);
    const href = hrefDeOrdenacao("/tarefas", { cliente: "c1", ordem: "prazo", responsavel: ["a", "b"], situacao: undefined }, ordem, "prazo");
    expect(href).toBe("/tarefas?cliente=c1&responsavel=a&responsavel=b&ordem=-prazo");
  });
});

describe("listas de tarefas e subtarefas", () => {
  const projeto = { nome: "Licença Alfa", numeroLocal: 2, cliente: { razaoSocial: "Indústria Alfa Ltda", numeroIdentificacao: 7 } };
  const tarefa = (nome: string, prazo: string | null, status = "EM_ANDAMENTO") => ({ nome, prazo: prazo ? new Date(prazo) : null, numeroLocal: 1, status, ativo: true, projeto });

  it("busca por nome, projeto, cliente ou ID e mantém os fechados no fim", () => {
    const lista = [tarefa("Relatório", "2030-03-01", "CONCLUIDO"), tarefa("Inventário", "2030-04-01"), tarefa("Visita", "2030-02-01")];
    expect(buscarEOrdenarTarefas(lista, "", { chave: "prazo", direcao: "asc" }).map((t) => t.nome)).toEqual(["Visita", "Inventário", "Relatório"]);
    expect(buscarEOrdenarTarefas(lista, "industria alfa", null)).toHaveLength(3);
    expect(buscarEOrdenarTarefas(lista, "invent", null).map((t) => t.nome)).toEqual(["Inventário"]);
    expect(buscarEOrdenarTarefas(lista, "TAR-0007-02-001", null)).toHaveLength(3);
    expect(buscarEOrdenarTarefas(lista, "nada disso", null)).toEqual([]);
  });

  it("subtarefas buscam também pelo nome da tarefa e pelo código", () => {
    const sub = (titulo: string) => ({ titulo, prazo: null, numeroLocal: 4, status: "EM_ANDAMENTO", ativo: true, tarefa: { nome: "Relatório mensal", numeroLocal: 3, projeto } });
    const lista = [sub("Coletar laudos"), sub("Enviar protocolo")];
    expect(buscarEOrdenarSubtarefas(lista, "mensal", null)).toHaveLength(2);
    expect(buscarEOrdenarSubtarefas(lista, "protocolo", null).map((s) => s.titulo)).toEqual(["Enviar protocolo"]);
    expect(buscarEOrdenarSubtarefas(lista, "SUB-0007-02-003-04", null)).toHaveLength(2);
  });
});

describe("URL dos filtros das listas", () => {
  it("leva a busca e a ordem, e continua igual sem elas", () => {
    expect(urlFiltrosListagens("/tarefas", { cliente: "", projeto: "", tarefa: "", responsavel: "", mostrarConcluidas: false }, true)).toBe("/tarefas");
    expect(urlFiltrosListagens("/tarefas", { cliente: "c1", projeto: "", tarefa: "", responsavel: "", mostrarConcluidas: true, busca: " licença ", ordem: "-prazo" }, true))
      .toBe("/tarefas?cliente=c1&busca=licen%C3%A7a&ordem=-prazo&todos=1");
  });
});
