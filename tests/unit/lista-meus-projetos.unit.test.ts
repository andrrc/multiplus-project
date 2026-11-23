/** "Meus projetos" do colaborador interno: busca, cliente, abas com contagem e ordenação. */
import { describe, expect, it } from "vitest";
import { contarMinhasPendencias, interpretarOrdemMeusProjetos, interpretarSituacaoMeusProjetos, prepararMeusProjetos } from "@/lib/lista-meus-projetos";

const passado = new Date("2000-01-01T00:00:00Z");
const futuro = new Date("2999-01-01T00:00:00Z");

const projeto = (nome: string, extra: Partial<{ status: string; clienteId: string; razao: string; prazo: Date | null; minhas: number; tarefas: Array<{ ativo: boolean; status: string; prazo: Date | null }> }> = {}) => ({
  nome,
  status: extra.status ?? "EM_ANDAMENTO",
  clienteId: extra.clienteId ?? "c1",
  numeroLocal: 1,
  dataPrevistaConclusao: extra.prazo === undefined ? futuro : extra.prazo,
  cliente: { razaoSocial: extra.razao ?? "Indústria Alfa Ltda", numeroIdentificacao: 7 },
  tarefas: extra.tarefas ?? [],
  minhasPendencias: extra.minhas ?? 0,
});
const aberta = (prazo: Date | null) => ({ ativo: true, status: "EM_ANDAMENTO", prazo });

const base = { busca: "", clienteId: "", situacao: "ativos" as const, ordem: "prazo" as const };

describe("meus projetos", () => {
  const lista = [
    projeto("Licença", { prazo: new Date("2999-06-01T00:00:00Z"), minhas: 1, tarefas: [aberta(futuro)] }),
    projeto("CADRI", { prazo: new Date("2999-02-01T00:00:00Z"), minhas: 2, tarefas: [aberta(passado), aberta(futuro)] }),
    projeto("Gestão 2025", { status: "CONCLUIDO", prazo: passado }),
    projeto("Sondagem", { clienteId: "c2", razao: "Cooperativa Gama", prazo: null, tarefas: [aberta(futuro), aberta(futuro), aberta(futuro)] }),
  ];

  it("abre em Ativos e conta cada aba dentro da busca e do cliente", () => {
    const { contagens, visiveis } = prepararMeusProjetos(lista, base);
    expect(contagens).toEqual({ ativos: 3, pendencias: 2, atraso: 1, concluidos: 1, todos: 4 });
    expect(visiveis.map((p) => p.nome)).toEqual(["CADRI", "Licença", "Sondagem"]);
  });

  it("a aba Com atraso traz só projetos ativos com tarefa aberta vencida", () => {
    expect(prepararMeusProjetos(lista, { ...base, situacao: "atraso" }).visiveis.map((p) => p.nome)).toEqual(["CADRI"]);
    expect(prepararMeusProjetos(lista, { ...base, situacao: "concluidos" }).visiveis.map((p) => p.nome)).toEqual(["Gestão 2025"]);
    expect(prepararMeusProjetos(lista, { ...base, situacao: "todos" }).visiveis).toHaveLength(4);
  });

  it("a aba Com pendências minhas traz só os projetos ativos em que ele tem item aberto", () => {
    expect(prepararMeusProjetos(lista, { ...base, situacao: "pendencias" }).visiveis.map((p) => p.nome)).toEqual(["CADRI", "Licença"]);
  });

  it("ordena por minhas pendências, da maior para a menor", () => {
    expect(prepararMeusProjetos(lista, { ...base, ordem: "minhas" }).visiveis.map((p) => p.nome)).toEqual(["CADRI", "Licença", "Sondagem"]);
  });

  it("filtra por cliente e por busca, e as contagens acompanham", () => {
    const porCliente = prepararMeusProjetos(lista, { ...base, clienteId: "c2" });
    expect(porCliente.contagens).toEqual({ ativos: 1, pendencias: 0, atraso: 0, concluidos: 0, todos: 1 });
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
    expect(interpretarSituacaoMeusProjetos("pendencias")).toBe("pendencias");
    expect(interpretarOrdemMeusProjetos("minhas")).toBe("minhas");
    expect(interpretarSituacaoMeusProjetos(["atraso", "todos"])).toBe("ativos");
    expect(interpretarOrdemMeusProjetos("nome")).toBe("nome");
    expect(interpretarOrdemMeusProjetos("qualquer")).toBe("prazo");
  });
});

describe("contarMinhasPendencias", () => {
  const hoje = new Date("2026-11-18T15:00:00Z");
  const dia = (valor: string) => new Date(`${valor}T00:00:00.000Z`);

  it("conta tarefas e subtarefas abertas dele, e as vencidas como atrasadas", () => {
    const resultado = contarMinhasPendencias(
      [{ ativo: true, status: "EM_ANDAMENTO", prazo: dia("2026-11-10") }, { ativo: true, status: "PROTOCOLADO", prazo: dia("2026-12-10") }],
      [{ ativo: true, status: "EM_ANDAMENTO", prazo: dia("2026-11-01") }, { ativo: true, status: "EM_ANDAMENTO", prazo: null }],
      hoje,
    );
    expect(resultado).toEqual({ pendencias: 4, atrasadas: 2 });
  });

  it("não conta concluído, cancelado nem desativado, e o dia do prazo ainda não é atraso", () => {
    const resultado = contarMinhasPendencias(
      [{ ativo: true, status: "CONCLUIDO", prazo: dia("2026-10-01") }, { ativo: true, status: "CANCELADO", prazo: dia("2026-10-01") }, { ativo: false, status: "EM_ANDAMENTO", prazo: dia("2026-10-01") }, { ativo: true, status: "EM_ANDAMENTO", prazo: dia("2026-11-18") }],
      [{ ativo: true, status: "CONCLUIDO", prazo: dia("2026-10-01") }, { ativo: true, status: "CANCELADO", prazo: dia("2026-10-01") }],
      hoje,
    );
    expect(resultado).toEqual({ pendencias: 1, atrasadas: 0 });
  });

  it("sem itens, zero", () => {
    expect(contarMinhasPendencias([], [], hoje)).toEqual({ pendencias: 0, atrasadas: 0 });
  });
});
