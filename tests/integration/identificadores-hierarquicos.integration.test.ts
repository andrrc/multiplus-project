/** RF-004/RF-005/RF-008 — comprova alocação atômica dos números locais, incluindo concorrência, mudança de pai e proteção do contador interno. */
import { afterAll, describe, expect, it } from "vitest";
import { appDb, ownerDb, fecharConexoes } from "./setup/helpers";

describe("IDs hierárquicos no Postgres", () => {
  it("aloca números por pai em paralelo, preserva o histórico e recalcula ao mudar o pai", async () => {
    const timestamp = Date.now();
    const clientes = await Promise.all([1, 2].map((n) => ownerDb.cliente.create({
      data: { razaoSocial: `Cliente ID hierárquico ${timestamp}-${n}`, segmento: "Teste", origemContato: "Teste automatizado" },
      select: { id: true },
    })));

    try {
      const projetos = await Promise.all([1, 2, 3].map((n) => ownerDb.projeto.create({
        data: { clienteId: clientes[0].id, nome: `Projeto hierárquico ${timestamp}-${n}`, numeroLocal: 999 },
        select: { id: true, clienteId: true, numeroLocal: true },
      })));
      expect(projetos.map((p) => p.numeroLocal).sort((a, b) => a - b)).toEqual([1, 2, 3]);

      const tarefas = await Promise.all([1, 2].map((n) => ownerDb.tarefa.create({
        data: { projetoId: projetos[0].id, nome: `Tarefa hierárquica ${timestamp}-${n}`, numeroLocal: 999 },
        select: { id: true, projetoId: true, numeroLocal: true },
      })));
      expect(tarefas.map((t) => t.numeroLocal).sort((a, b) => a - b)).toEqual([1, 2]);

      const subtarefas = await Promise.all([1, 2].map((n) => ownerDb.subtarefa.create({
        data: { tarefaId: tarefas[0].id, titulo: `Subtarefa hierárquica ${timestamp}-${n}`, numeroLocal: 999 },
        select: { id: true, tarefaId: true, numeroLocal: true },
      })));
      expect(subtarefas.map((s) => s.numeroLocal).sort((a, b) => a - b)).toEqual([1, 2]);

      const movido = await ownerDb.projeto.update({
        where: { id: projetos[0].id },
        data: { clienteId: clientes[1].id },
        select: { clienteId: true, numeroLocal: true },
      });
      expect(movido).toEqual({ clienteId: clientes[1].id, numeroLocal: 1 });

      const proximoNoClienteAntigo = await ownerDb.projeto.create({
        data: { clienteId: clientes[0].id, nome: `Projeto após transferência ${timestamp}` },
        select: { numeroLocal: true },
      });
      expect(proximoNoClienteAntigo.numeroLocal).toBe(4);

      await expect(appDb.$queryRaw`SELECT "tipo", "paiId", "ultimoNumero" FROM "contadores_ids_hierarquicos"`)
        .rejects.toThrow(/permission denied/i);
    } finally {
      await ownerDb.cliente.deleteMany({ where: { id: { in: clientes.map((c) => c.id) } } });
    }
  });
});

afterAll(fecharConexoes);
