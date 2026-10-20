/** RF-036/RN-001 — agenda usa o dia de Brasília e mantém prazos como datas civis. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("@/server/auth/contexto", () => ({ exigirAcessoARota: vi.fn(async () => ({ usuarioId: "admin", perfil: "ADMIN" })) }));
vi.mock("@/lib/projetos-tarefas", () => ({
  listarClientesParaProjeto: vi.fn(async () => []), listarProjetos: vi.fn(async () => []),
  listarItensAgenda: vi.fn(async () => []),
}));
import AgendaPage from "@/app/(painel)/agenda/page";
import { listarItensAgenda } from "@/lib/projetos-tarefas";

afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });
describe("agenda no horário de Brasília", () => {
  it.each([
    ["2026-11-01T02:59:59Z", "Outubro", 2026, 31, 9],
    ["2027-01-01T02:59:59Z", "Dezembro", 2026, 31, 11],
    ["2027-01-01T03:00:00Z", "Janeiro", 2027, 1, 0],
  ])("seleciona mês e hoje corretamente em %s", async (instante, mes, ano, dia, indiceMes) => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(instante));
    const html = renderToStaticMarkup(await AgendaPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain(`${mes} ${ano}`);
    expect(html).toMatch(new RegExp(`bg-verde px-2 py-1 font-semibold[^>]*>${dia}</span>`));
    expect(listarItensAgenda).toHaveBeenCalledWith(expect.anything(), new Date(Date.UTC(ano, indiceMes, 1)), expect.any(Date), expect.anything());
  });
  it("mantém um prazo de meia-noite UTC no dia civil cadastrado", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-20T13:00:00Z"));
    vi.mocked(listarItensAgenda).mockResolvedValueOnce([{
      id: "prazo-civil", nome: "Prazo civil", prazo: new Date("2026-10-20T00:00:00Z"),
      status: "A_INICIAR", projetada: false, responsavel: null,
      projeto: { id: "projeto", nome: "Projeto", cliente: { id: "cliente", razaoSocial: "Cliente" } },
    }]);
    const html = renderToStaticMarkup(await AgendaPage({ searchParams: Promise.resolve({ mes: "2026-10" }) }));
    expect(html).toMatch(/bg-verde px-2 py-1 font-semibold[^>]*>20<\/span>.*?href="\/tarefas\/prazo-civil"/);
  });

});
