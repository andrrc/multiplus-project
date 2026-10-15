/**
 * RF-009 — limite editável do semáforo de prazos para projetos, tarefas e subtarefas.
 * Vermelho só para prazo vencido; resta o limite âmbar, com padrão 5 dias.
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
  await ownerDb.configuracaoSemaforo.update({ where: { id: 1 }, data: { diasAmareloAte: 5 } });
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
  it("guarda só o limite âmbar, com padrão de 5 dias, sem a coluna do limite vermelho", async () => {
    const colunas = await ownerDb.$queryRaw<{ column_name: string; column_default: string | null }[]>`
      SELECT column_name, column_default FROM information_schema.columns
      WHERE table_name = 'configuracoes_semaforo' AND column_name IN ('diasVermelhoAte', 'diasAmareloAte')`;
    expect(colunas).toEqual([{ column_name: "diasAmareloAte", column_default: "5" }]);
    await expect(buscarLimitesSemaforo(admin())).resolves.toEqual({ diasAmareloAte: 5 });
  });

  it("permite ao ADMIN alterar o limite e disponibiliza leitura autenticada", async () => {
    await expect(atualizarLimitesSemaforo(admin(), { diasAmareloAte: 8 })).resolves.toMatchObject({ diasAmareloAte: 8 });
    await expect(buscarLimitesSemaforo(interno())).resolves.toEqual({ diasAmareloAte: 8 });
    await expect(atualizarLimitesSemaforo(admin(), { diasAmareloAte: 0 })).resolves.toMatchObject({ diasAmareloAte: 0 });
  });

  it("recusa edição no serviço e diretamente pela RLS para perfil não administrador", async () => {
    await expect(atualizarLimitesSemaforo(interno(), { diasAmareloAte: 8 })).rejects.toThrow(/Ação restrita ao Administrador/);
    await expect(comoUsuario(interno(), tx => tx.configuracaoSemaforo.updateMany({ where: { id: 1 }, data: { diasAmareloAte: 8 } }))).resolves.toMatchObject({ count: 0 });
    await expect(ownerDb.configuracaoSemaforo.findUniqueOrThrow({ where: { id: 1 } })).resolves.toMatchObject({ diasAmareloAte: 5 });
  });

  it("recusa limites inválidos no serviço e no banco", async () => {
    await expect(atualizarLimitesSemaforo(admin(), { diasAmareloAte: -1 })).rejects.toThrow(/limite amarelo como um número inteiro de dias entre 0 e 365/);
    await expect(atualizarLimitesSemaforo(admin(), { diasAmareloAte: 366 })).rejects.toThrow(/limite amarelo como um número inteiro de dias entre 0 e 365/);
    await expect(atualizarLimitesSemaforo(admin(), { diasAmareloAte: 2.5 })).rejects.toThrow(/limite amarelo como um número inteiro de dias entre 0 e 365/);
    await expect(ownerDb.configuracaoSemaforo.update({ where: { id: 1 }, data: { diasAmareloAte: 366 } })).rejects.toThrow(/configuracoes_semaforo_limites_check/);
  });
});
