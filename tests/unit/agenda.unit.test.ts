/** RF-036/RN-001 — agenda usa o dia de Brasília e mantém prazos como datas civis. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("@/server/auth/contexto", () => ({ exigirAcessoARota: vi.fn(async () => ({ usuarioId: "admin", perfil: "ADMIN" })) }));
// Os filtros são um componente de cliente e usam o roteador do Next, que não existe fora do app.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/semaforo", () => ({ buscarLimitesSemaforo: vi.fn(async () => ({ diasAmareloAte: 5 })) }));
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
    // Hoje é o dia civil de Brasília e fica com o número em destaque (fundo azul-escuro).
    expect(html).toMatch(new RegExp(`aria-label="Ver o dia ${dia}" class="[^"]*bg-tinta[^"]*" href="[^"]*">${dia}</a>`));
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
    expect(html).toMatch(/aria-label="Ver o dia 20" class="[^"]*bg-tinta[^"]*" href="[^"]*">20<\/a>.*?href="\/tarefas\/prazo-civil"/);
  });

});
