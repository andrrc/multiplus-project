/**
 * Texto do prazo nos PDFs (etapa 2 dos comprovantes): item em conferência mostra "Enviado em dd/mm" e não "Atrasado".
 * Cobre a célula e as linhas dos PDFs do projeto e da agenda, que montam o texto com o instante do envio.
 */
import { describe, expect, it } from "vitest";
import { indicadorPrazo, linhasDaAgenda, linhasDoProjeto } from "@/lib/exportacao-pdf-tarefas";

const limites = { diasAmareloAte: 7 };
const VENCIDO = new Date("2000-01-10T00:00:00.000Z");
// 22h de 12/11 em Brasília já é 13/11 em UTC: o rótulo usa o dia de Brasília.
const ENVIADO_EM = new Date("2026-11-13T01:00:00.000Z");

describe("indicadorPrazo", () => {
  it("em conferência mostra o dia do envio, não o atraso, e guarda o prazo no detalhe", () => {
    const celula = indicadorPrazo(VENCIDO, "EM_ANDAMENTO", limites, ENVIADO_EM);
    expect(celula.texto).toBe("Enviado em 12/11");
    expect(celula.tom).toBe("neutro");
    expect(celula.detalhe).toBe("10/01/2000");
  });

  it("sem conferência o prazo vencido segue como atraso", () => {
    expect(indicadorPrazo(VENCIDO, "EM_ANDAMENTO", limites, null).texto).toMatch(/^Atrasado \d+ dias$/);
    expect(indicadorPrazo(VENCIDO, "EM_ANDAMENTO", limites).tom).toBe("atrasado");
  });

  it("concluído e cancelado têm precedência sobre a conferência", () => {
    expect(indicadorPrazo(VENCIDO, "CONCLUIDO", limites, ENVIADO_EM).texto).toBe("Concluído");
    expect(indicadorPrazo(VENCIDO, "CANCELADO", limites, ENVIADO_EM).texto).toBe("Cancelado");
  });
});

describe("PDF do projeto", () => {
  const projeto = {
    numeroLocal: 1,
    cliente: { numeroIdentificacao: 7 },
    tarefas: [
      { nome: "Em conferência", numeroLocal: 1, prazo: VENCIDO, status: "EM_ANDAMENTO", emConferenciaDesde: ENVIADO_EM, responsavel: null, subtarefas: [] },
      { nome: "Atrasada", numeroLocal: 2, prazo: VENCIDO, status: "EM_ANDAMENTO", emConferenciaDesde: null, responsavel: null, subtarefas: [] },
    ],
  };

  it("a tarefa em conferência sai com o dia do envio e a atrasada, com o atraso", () => {
    const linhas = linhasDoProjeto(projeto, limites);
    const prazoDe = (nome: string) => linhas.find((linha) => linha[0].texto === nome)![4].texto;
    expect(prazoDe("Em conferência")).toBe("Enviado em 12/11");
    expect(prazoDe("Atrasada")).toMatch(/^Atrasado \d+ dias$/);
  });
});

describe("PDF da agenda", () => {
  const base = { prazo: VENCIDO, status: "EM_ANDAMENTO", projeto: { nome: "Projeto", cliente: { razaoSocial: "Cliente" } }, responsavel: null };

  it("o item em conferência sai com o dia do envio; a ocorrência futura segue como próxima ocorrência", () => {
    const linhas = linhasDaAgenda([
      { ...base, nome: "Em conferência", projetada: false, emConferenciaDesde: ENVIADO_EM },
      { ...base, nome: "Atrasado", projetada: false, emConferenciaDesde: null },
      { ...base, nome: "Futura", projetada: true, emConferenciaDesde: null },
    ], limites);
    expect(linhas[0][5].texto).toBe("Enviado em 12/11");
    expect(linhas[1][5].texto).toMatch(/^Atrasado \d+ dias$/);
    expect(linhas[2][5].texto).toBe("Próxima ocorrência");
  });
});
