/**
 * RF-009 — limites editáveis do semáforo de prazos para projetos, tarefas e subtarefas.
 * Confere validação no serviço e autorização tanto no serviço quanto pela RLS.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ownerDb, comoUsuario, fecharConexoes } from "./setup/helpers";
import { atualizarLimitesSemaforo, buscarLimitesSemaforo } from "@/lib/semaforo";

let adminId: string;
let internoId: string;
const admin = () => ({ usuarioId: adminId, perfil: "ADMIN" as const });
const interno = () => ({ usuarioId: internoId, perfil: "ADMIN_INTERNO" as const });

beforeEach(async () => {
  await ownerDb.configuracaoSemaforo.update({ where: { id: 1 }, data: { diasVermelhoAte: 5, diasAmareloAte: 10 } });
  await ownerDb.usuario.deleteMany({ where: { email: { in: ["semaforo.admin@teste.local", "semaforo.interno@teste.local"] } } });
  const a = await ownerDb.usuario.create({ data: { nome: "Admin", email: "semaforo.admin@teste.local", perfil: "ADMIN" } });
  const i = await ownerDb.usuario.create({ data: { nome: "Interno", email: "semaforo.interno@teste.local", perfil: "ADMIN_INTERNO" } });
  adminId = a.id;
  internoId = i.id;
});

afterAll(async () => {
  await ownerDb.usuario.deleteMany({ where: { email: { in: ["semaforo.admin@teste.local", "semaforo.interno@teste.local"] } } });
  await fecharConexoes();
});

describe("RF-009 — configuração do semáforo", () => {
  it("permite ao ADMIN alterar limites e disponibiliza leitura autenticada", async () => {
    await expect(atualizarLimitesSemaforo(admin(), { diasVermelhoAte: 3, diasAmareloAte: 8 })).resolves.toMatchObject({ diasVermelhoAte: 3, diasAmareloAte: 8 });
    await expect(buscarLimitesSemaforo(interno())).resolves.toMatchObject({ diasVermelhoAte: 3, diasAmareloAte: 8 });
  });

  it("recusa edição no serviço e diretamente pela RLS para perfil não administrador", async () => {
    await expect(atualizarLimitesSemaforo(interno(), { diasVermelhoAte: 3, diasAmareloAte: 8 })).rejects.toThrow(/Ação restrita ao Administrador/);
    await expect(comoUsuario(interno(), tx => tx.configuracaoSemaforo.updateMany({ where: { id: 1 }, data: { diasVermelhoAte: 3 } }))).resolves.toMatchObject({ count: 0 });
    await expect(ownerDb.configuracaoSemaforo.findUniqueOrThrow({ where: { id: 1 } })).resolves.toMatchObject({ diasVermelhoAte: 5 });
  });

  it("recusa limites inválidos", async () => {
    await expect(atualizarLimitesSemaforo(admin(), { diasVermelhoAte: 10, diasAmareloAte: 5 })).rejects.toThrow(/limite vermelho menor que o amarelo/);
    await expect(atualizarLimitesSemaforo(admin(), { diasVermelhoAte: -1, diasAmareloAte: 5 })).rejects.toThrow(/limite vermelho menor que o amarelo/);
  });
});
