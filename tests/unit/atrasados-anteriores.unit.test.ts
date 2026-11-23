/**
 * Faixa de atrasados de meses anteriores da agenda: o que entra na contagem.
 */
import { describe, expect, it } from "vitest";
import { contarAtrasadosAnteriores } from "@/lib/agenda-itens";

const data = (valor: string) => new Date(`${valor}T00:00:00.000Z`);
// 18/11/2026, meio-dia em Brasília.
const agora = new Date("2026-11-18T15:00:00Z");
const inicioDoMes = data("2026-11-01");
const aberta = { status: "EM_ANDAMENTO", ativo: true };

describe("contarAtrasadosAnteriores", () => {
  it("conta o item aberto vencido antes do mês exibido", () => {
    expect(contarAtrasadosAnteriores([{ prazo: data("2026-10-31"), ...aberta }], inicioDoMes, agora)).toBe(1);
  });

  it("não conta o que vence dentro do mês exibido nem depois", () => {
    expect(contarAtrasadosAnteriores([{ prazo: data("2026-11-01"), ...aberta }, { prazo: data("2026-12-05"), ...aberta }], inicioDoMes, agora)).toBe(0);
  });

  it("não conta concluído, cancelado, desativado nem sem prazo", () => {
    const antes = data("2026-09-10");
    expect(contarAtrasadosAnteriores([
      { prazo: antes, status: "CONCLUIDO", ativo: true },
      { prazo: antes, status: "CANCELADO", ativo: true },
      { prazo: antes, status: "EM_ANDAMENTO", ativo: false },
      { prazo: null, ...aberta },
    ], inicioDoMes, agora)).toBe(0);
  });

  it("vendo um mês futuro, só conta o que já venceu de verdade", () => {
    // Em dezembro, a tarefa de 20/11 é anterior ao mês exibido e já venceu; a de 25/12 não.
    const dezembro = data("2026-12-01");
    expect(contarAtrasadosAnteriores([{ prazo: data("2026-11-20"), ...aberta }, { prazo: data("2026-11-25"), ...aberta }], dezembro, new Date("2026-12-10T15:00:00Z"))).toBe(2);
    expect(contarAtrasadosAnteriores([{ prazo: data("2026-11-20"), ...aberta }], dezembro, new Date("2026-11-19T15:00:00Z"))).toBe(0);
  });

  it("o dia do prazo ainda não conta como atrasado", () => {
    expect(contarAtrasadosAnteriores([{ prazo: data("2026-11-18"), ...aberta }], data("2026-12-01"), agora)).toBe(0);
  });
});
