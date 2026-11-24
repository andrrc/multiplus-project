import { describe, expect, it } from "vitest";
import { lerDataPedido, motivoBloqueioPedido, rotuloStatusPedido, validarNovaDataPedido } from "@/lib/pedidos-prazo-regras";

const data = (valor: string) => new Date(valor + "T00:00:00Z");
const item = { prazo: data("2027-01-31"), ancora: data("2027-01-31"), periodicidade: "MENSAL" as const, dia_semana: null };

describe("pedidos de prazo", () => {
  it("valida uma data civil real", () => {
    expect(lerDataPedido("2028-02-29")).toEqual(data("2028-02-29"));
    for (const valor of ["2027-02-29", "2027-2-01", "0000-02-01", ""]) {
      expect(() => lerDataPedido(valor)).toThrow(/nova data válida/);
    }
  });

  it("considera o prazo, a meia-noite de Brasília e o limite da próxima ocorrência", () => {
    const agora = new Date("2027-02-02T01:00:00Z");
    expect(() => validarNovaDataPedido(item, data("2027-02-01"), agora)).not.toThrow();
    expect(() => validarNovaDataPedido(item, data("2027-01-31"), agora)).toThrow(/posterior ao prazo atual/);
    expect(() => validarNovaDataPedido(item, data("2027-02-01"), new Date("2027-02-02T03:00:00Z"))).toThrow(/anterior a hoje/);
    expect(() => validarNovaDataPedido(item, data("2027-02-28"), agora)).toThrow(/anterior à próxima ocorrência/);
    expect(() => validarNovaDataPedido({ ...item, prazo: null }, data("2027-02-01"), agora)).toThrow(/Informe um impedimento/);
  });

  it("explica o estado do item e rotula o resultado nas telas", () => {
    const aberto = { fechado: false, conferencia: false, pendente: false };
    expect(motivoBloqueioPedido(aberto)).toBeNull();
    expect(motivoBloqueioPedido({ ...aberto, fechado: true })).toContain("fechado");
    expect(motivoBloqueioPedido({ ...aberto, conferencia: true, pendente: true })).toContain("conferência");
    expect(motivoBloqueioPedido({ ...aberto, pendente: true })).toContain("pedido pendente");
    expect(rotuloStatusPedido("PRAZO", "PENDENTE")).toBe("Pedido de prazo: aguardando decisão");
    expect(rotuloStatusPedido("PRAZO", "APROVADO")).toBe("Pedido de prazo: aprovado");
    expect(rotuloStatusPedido("IMPEDIMENTO", "APROVADO")).toBe("Impedimento: aceito");
    expect(rotuloStatusPedido("IMPEDIMENTO", "RECUSADO")).toBe("Impedimento: recusado");
    expect(rotuloStatusPedido("PRAZO", "CANCELADO")).toBe("Pedido de prazo: cancelado");
  });
});
