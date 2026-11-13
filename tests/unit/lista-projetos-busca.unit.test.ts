/** Lista de Projetos (situação do prazo, contagens e ordem) e termo da busca geral. */
import { describe, expect, it } from "vitest";
import { prepararListaProjetos } from "@/lib/lista-projetos";
import { normalizarTermoBusca } from "@/lib/busca-global";
import { perfilPodeAcessar } from "@/lib/navegacao";

const projeto = (nome: string, extra: Partial<{ dataPrevistaConclusao: Date | null; status: string; ativo: boolean }> = {}) => ({
  nome,
  dataPrevistaConclusao: null as Date | null,
  status: "EM_ANDAMENTO",
  ativo: true,
  ...extra,
});
const limites = { diasAmareloAte: 5 };

describe("lista de projetos", () => {
  const lista = [
    projeto("Fechado", { status: "CONCLUIDO", dataPrevistaConclusao: new Date("2000-01-01T00:00:00Z") }),
    projeto("Atrasado", { dataPrevistaConclusao: new Date("2000-01-01T00:00:00Z") }),
    projeto("No prazo", { dataPrevistaConclusao: new Date("2999-01-01T00:00:00Z") }),
    projeto("Sem prazo"),
    projeto("Desativado", { ativo: false, dataPrevistaConclusao: new Date("2999-01-01T00:00:00Z") }),
  ];

  it("conta por situação e deixa os fechados para o fim", () => {
    const { contagens, visiveis, situacaoFiltro } = prepararListaProjetos(lista, limites);
    expect(situacaoFiltro).toBe("todos");
    expect(contagens).toEqual({ todos: 5, atrasado: 1, proximo: 0, prazo: 1, sem: 1 });
    expect(visiveis.map((item) => item.projeto.nome)).toEqual(["Atrasado", "No prazo", "Sem prazo", "Fechado", "Desativado"]);
  });

  it("filtra pela situação pedida sem alterar as contagens", () => {
    const { contagens, visiveis } = prepararListaProjetos(lista, limites, "atrasado");
    expect(visiveis.map((item) => item.projeto.nome)).toEqual(["Atrasado"]);
    expect(contagens.todos).toBe(5);
  });

  it("trata situação repetida ou desconhecida como todos", () => {
    expect(prepararListaProjetos(lista, limites, ["atrasado", "prazo"]).situacaoFiltro).toBe("todos");
    expect(prepararListaProjetos(lista, limites, "qualquer").situacaoFiltro).toBe("todos");
  });
});

describe("termo da busca geral", () => {
  it("recusa termos curtos e aceita a partir de 2 letras", () => {
    expect(normalizarTermoBusca(undefined)).toBeNull();
    expect(normalizarTermoBusca("  a ")).toBeNull();
    expect(normalizarTermoBusca("al")).toBe("al");
  });

  it("junta espaços e limita o tamanho", () => {
    expect(normalizarTermoBusca("  Gestão    ambiental ")).toBe("Gestão ambiental");
    expect(normalizarTermoBusca("x".repeat(300))?.length).toBe(100);
  });
});

describe("rota da busca", () => {
  it("é da administração e do colaborador interno, nunca do externo nem do cliente", () => {
    expect(perfilPodeAcessar("ADMIN", "/busca")).toBe(true);
    expect(perfilPodeAcessar("ADMIN_INTERNO", "/busca")).toBe(true);
    expect(perfilPodeAcessar("ADMIN_EXTERNO", "/busca")).toBe(false);
    expect(perfilPodeAcessar("CLIENTE", "/busca")).toBe(false);
  });
});
