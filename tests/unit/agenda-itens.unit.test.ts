/**
 * Agenda (protótipo 09-agenda): cada item recebe uma classe de cor pelo prazo e pelo tipo.
 */
import { describe, expect, it } from "vitest";
import { classeDoItemAgenda } from "@/lib/agenda-itens";

const tarefa = { status: "EM_ANDAMENTO", projetada: false };

describe("classeDoItemAgenda", () => {
  it("separa atrasado, próximo e no prazo pelo limite do semáforo", () => {
    expect(classeDoItemAgenda(tarefa, -1, 5)).toBe("atrasado");
    expect(classeDoItemAgenda(tarefa, 0, 5)).toBe("proximo");
    expect(classeDoItemAgenda(tarefa, 5, 5)).toBe("proximo");
    expect(classeDoItemAgenda(tarefa, 6, 5)).toBe("prazo");
  });

  it("respeita o limite zero", () => {
    expect(classeDoItemAgenda(tarefa, 0, 0)).toBe("proximo");
    expect(classeDoItemAgenda(tarefa, 1, 0)).toBe("prazo");
  });

  it("visita e reunião têm cor própria, mesmo vencidas", () => {
    expect(classeDoItemAgenda({ status: "VISITA_REUNIAO_AGENDADA", projetada: false }, -3, 5)).toBe("visita");
  });

  it("item concluído ou cancelado nunca é atrasado", () => {
    expect(classeDoItemAgenda({ status: "CONCLUIDO", projetada: false }, -10, 5)).toBe("concluida");
    expect(classeDoItemAgenda({ status: "CANCELADO", projetada: false }, -10, 5)).toBe("concluida");
  });

  it("ocorrência projetada de tarefa recorrente é sempre futura", () => {
    expect(classeDoItemAgenda({ status: "EM_ANDAMENTO", projetada: true }, -2, 5)).toBe("futura");
    expect(classeDoItemAgenda({ status: "VISITA_REUNIAO_AGENDADA", projetada: true }, 3, 5)).toBe("futura");
  });
});
