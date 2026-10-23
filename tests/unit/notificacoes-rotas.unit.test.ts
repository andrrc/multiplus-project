/** RF-022 — notificações apontam para rotas autorizadas para o perfil destinatário. */
import { describe, expect, it } from "vitest";
import { rotaDoRegistroParaPerfil } from "@/lib/notificacoes-rotas";

describe("RF-022 — rota de notificação por perfil", () => {
  it("converte projeto, tarefa e subtarefa para as rotas equivalentes do colaborador", () => {
    expect(rotaDoRegistroParaPerfil("/projetos/p-1?aba=docs", "ADMIN_INTERNO")).toBe("/meus-projetos/p-1?aba=docs");
    expect(rotaDoRegistroParaPerfil("/tarefas/t-1?subtarefa=s-1#subtarefa-s-1", "ADMIN_EXTERNO")).toBe("/minhas-tarefas/t-1");
  });

  it("converte rotas contextuais para a visão administrativa", () => {
    expect(rotaDoRegistroParaPerfil("/minhas-tarefas/t-1", "ADMIN")).toBe("/tarefas/t-1");
    expect(rotaDoRegistroParaPerfil("/meus-projetos/p-1", "ADMIN")).toBe("/projetos/p-1");
  });

  it("preserva links de portal, links absolutos e valores ausentes", () => {
    expect(rotaDoRegistroParaPerfil("/portal/p-1", "ADMIN_EXTERNO")).toBe("/portal/p-1");
    expect(rotaDoRegistroParaPerfil("/portal/p-1", "CLIENTE")).toBe("/portal/p-1");
    expect(rotaDoRegistroParaPerfil("https://sga.example.test/tarefas/t-1", "ADMIN_INTERNO")).toBe("https://sga.example.test/minhas-tarefas/t-1");
    expect(rotaDoRegistroParaPerfil(null, "ADMIN")).toBeNull();
  });
});
