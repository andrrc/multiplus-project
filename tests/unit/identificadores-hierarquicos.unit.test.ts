/** RF-004/RF-005/RF-008 — verifica a formatação dos IDs hierárquicos sem truncar sequências longas. */
import { describe, expect, it } from "vitest";
import { codigoProjeto, codigoSubtarefa, codigoTarefa } from "@/lib/identificadores-hierarquicos";

describe("identificadores hierárquicos", () => {
  it("compõe o caminho do cliente ao projeto, tarefa e subtarefa", () => {
    expect(codigoProjeto(42, 3)).toBe("PROJ-0042-03");
    expect(codigoTarefa(42, 3, 17)).toBe("TAR-0042-03-017");
    expect(codigoSubtarefa(42, 3, 17, 2)).toBe("SUB-0042-03-017-02");
  });

  it("usa zeros apenas como largura mínima e preserva números maiores", () => {
    expect(codigoSubtarefa(12345, 104, 1002, 127)).toBe("SUB-12345-104-1002-127");
  });
});
