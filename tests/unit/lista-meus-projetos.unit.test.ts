/** "Meus projetos" do colaborador interno: busca, cliente, abas com contagem e ordenação. */
import { describe, expect, it } from "vitest";
import { interpretarOrdemMeusProjetos, interpretarSituacaoMeusProjetos, prepararMeusProjetos } from "@/lib/lista-meus-projetos";

const passado = new Date("2000-01-01T00:00:00Z");
const futuro = new Date("2999-01-01T00:00:00Z");

const projeto = (nome: string, extra: Partial<{ status: string; clienteId: string; razao: string; prazo: Date | null; tarefas: Array<{ ativo: boolean; status: string; prazo: Date | null }> }> = {}) => ({
  nome,
  status: extra.status ?? "EM_ANDAMENTO",
  clienteId: extra.clienteId ?? "c1",
  numeroLocal: 1,
  dataPrevistaConclusao: extra.prazo === undefined ? futuro : extra.prazo,
  cliente: { razaoSocial: extra.razao ?? "Indústria Alfa Ltda", numeroIdentificacao: 7 },
  tarefas: extra.tarefas ?? [],
});
const aberta = (prazo: Date | null) => ({ ativo: true, status: "EM_ANDAMENTO", prazo });

const base = { busca: "", clienteId: "", situacao: "ativos" as const, ordem: "prazo" as const };

describe("meus projetos", () => {
  const lista = [
    projeto("Licença", { prazo: new Date("2999-06-01T00:00:00Z"), tarefas: [aberta(futuro)] }),
    projeto("CADRI", { prazo: new Date("2999-02-01T00:00:00Z"), tarefas: [aberta(passado), aberta(futuro)] }),
    projeto("Gestão 2025", { status: "CONCLUIDO", prazo: passado }),
    projeto("Sondagem", { clienteId: "c2", razao: "Cooperativa Gama", prazo: null, tarefas: [aberta(futuro), aberta(futuro), aberta(futuro)] }),
  ];

  it("abre em Ativos e conta cada aba dentro da busca e do cliente", () => {
    const { contagens, visiveis } = prepararMeusProjetos(lista, base);
    expect(contagens).toEqual({ ativos: 3, atraso: 1, concluidos: 1, todos: 4 });
    expect(visiveis.map((p) => p.nome)).toEqual(["CADRI", "Licença", "Sondagem"]);
  });

  it("a aba Com atraso traz só projetos ativos com tarefa aberta vencida", () => {
    expect(prepararMeusProjetos(lista, { ...base, situacao: "atraso" }).visiveis.map((p) => p.nome)).toEqual(["CADRI"]);
    expect(prepararMeusProjetos(lista, { ...base, situacao: "concluidos" }).visiveis.map((p) => p.nome)).toEqual(["Gestão 2025"]);
    expect(prepararMeusProjetos(lista, { ...base, situacao: "todos" }).visiveis).toHaveLength(4);
  });

  it("filtra por cliente e por busca, e as contagens acompanham", () => {
    const porCliente = prepararMeusProjetos(lista, { ...base, clienteId: "c2" });
    expect(porCliente.contagens).toEqual({ ativos: 1, atraso: 0, concluidos: 0, todos: 1 });
    const porBusca = prepararMeusProjetos(lista, { ...base, busca: "gama", situacao: "todos" });
    expect(porBusca.visiveis.map((p) => p.nome)).toEqual(["Sondagem"]);
    expect(prepararMeusProjetos(lista, { ...base, busca: "PROJ-0007-01", situacao: "todos" }).visiveis).toHaveLength(4);
  });

  it("ordena por nome e por tarefas abertas, e deixa projeto sem prazo no fim", () => {
    expect(prepararMeusProjetos(lista, { ...base, ordem: "nome" }).visiveis.map((p) => p.nome)).toEqual(["CADRI", "Licença", "Sondagem"]);
    expect(prepararMeusProjetos(lista, { ...base, ordem: "abertas" }).visiveis.map((p) => p.nome)).toEqual(["Sondagem", "CADRI", "Licença"]);
    expect(prepararMeusProjetos(lista, { ...base, ordem: "prazo" }).visiveis.at(-1)?.nome).toBe("Sondagem");
  });

  it("lê a aba e a ordem da URL com padrão em Ativos e prazo", () => {
    expect(interpretarSituacaoMeusProjetos(undefined)).toBe("ativos");
    expect(interpretarSituacaoMeusProjetos("atraso")).toBe("atraso");
    expect(interpretarSituacaoMeusProjetos(["atraso", "todos"])).toBe("ativos");
    expect(interpretarOrdemMeusProjetos("nome")).toBe("nome");
    expect(interpretarOrdemMeusProjetos("qualquer")).toBe("prazo");
  });
});
