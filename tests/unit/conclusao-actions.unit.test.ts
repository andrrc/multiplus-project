// RF-007 / RN-007 — ADMIN conclui diretamente; colaboradores solicitam confirmação.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventoNotificacao, StatusTarefa } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  obterContexto: vi.fn(),
  concluirTarefa: vi.fn(),
  solicitarConclusao: vi.fn(),
  dispararEventoNotificacao: vi.fn(),
  listarAdministradoresAtivos: vi.fn(),
  listarClientesAtivosDoProjeto: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/server/auth/contexto", () => ({ obterContexto: mocks.obterContexto }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/projetos-tarefas", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/projetos-tarefas")>(),
  concluirTarefa: mocks.concluirTarefa,
  solicitarConclusao: mocks.solicitarConclusao,
}));
vi.mock("@/lib/notificacoes", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/notificacoes")>(),
  dispararEventoNotificacao: mocks.dispararEventoNotificacao,
  listarAdministradoresAtivos: mocks.listarAdministradoresAtivos,
  listarClientesAtivosDoProjeto: mocks.listarClientesAtivosDoProjeto,
}));

import { concluirTarefaAction } from "@/app/(painel)/projetos/actions";

describe("action de conclusão de tarefa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listarAdministradoresAtivos.mockResolvedValue(["admin-1", "admin-2"]);
    mocks.listarClientesAtivosDoProjeto.mockResolvedValue(["cliente-1"]);
    mocks.concluirTarefa.mockResolvedValue({
      tarefa: {
        id: "tarefa-1",
        nome: "Tarefa de teste",
        projetoId: "projeto-1",
        status: StatusTarefa.CONCLUIDO,
        atualizadoEm: new Date("2026-10-23T12:00:00.000Z"),
      },
      proxima: null,
    });
    mocks.solicitarConclusao.mockResolvedValue({
      solicitacao: { id: "pedido-1" },
      titulo: "Tarefa de teste",
      tarefaId: "tarefa-1",
    });
  });

  it("permite que ADMIN conclua diretamente e dispara o evento de tarefa concluída", async () => {
    mocks.obterContexto.mockResolvedValue({ usuarioId: "admin-1", perfil: "ADMIN" });

    await concluirTarefaAction("tarefa-1");

    expect(mocks.concluirTarefa).toHaveBeenCalledWith({ usuarioId: "admin-1", perfil: "ADMIN" }, "tarefa-1");
    expect(mocks.solicitarConclusao).not.toHaveBeenCalled();
    expect(mocks.dispararEventoNotificacao).toHaveBeenCalledWith(EventoNotificacao.TAREFA_CONCLUIDA, expect.objectContaining({
      entidadeId: "tarefa-1",
      usuarioIds: ["admin-2", "cliente-1"],
    }));
  });

  it("faz colaborador solicitar confirmação sem concluir imediatamente", async () => {
    mocks.obterContexto.mockResolvedValue({ usuarioId: "interno-1", perfil: "ADMIN_INTERNO" });

    await concluirTarefaAction("tarefa-1");

    expect(mocks.solicitarConclusao).toHaveBeenCalledWith({ usuarioId: "interno-1", perfil: "ADMIN_INTERNO" }, "TAREFA", "tarefa-1");
    expect(mocks.concluirTarefa).not.toHaveBeenCalled();
    expect(mocks.dispararEventoNotificacao).toHaveBeenCalledWith(EventoNotificacao.CONCLUSAO_SOLICITADA, expect.objectContaining({
      entidadeId: "pedido-1",
      usuarioIds: ["admin-1", "admin-2"],
    }));
  });
});
