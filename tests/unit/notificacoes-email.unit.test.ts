/** RF-022 — e-mails usam URL absoluta da aplicação e links acessíveis ao perfil destinatário. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderTemplateNotificacao } from "@/lib/email-templates";

describe("templates de e-mail de notificações", () => {
  beforeEach(() => vi.stubEnv("AUTH_URL", "https://sga.example.test"));
  afterEach(() => vi.unstubAllEnvs());

  it("renderiza o evento, escapa conteúdo e inclui o link interno", () => {
    const html = renderTemplateNotificacao("NOVO_COMENTARIO", {
      nome: "Ana <teste>",
      titulo: "Novo comentário",
      mensagem: "Comentário com <conteúdo> & detalhe",
      url: "/tarefas/t-1?a=1&b=2",
    });

    expect(html).toContain("Olá, Ana &lt;teste&gt;.");
    expect(html).toContain("Comentário com &lt;conteúdo&gt; &amp; detalhe");
    expect(html).toContain("Novo comentário");
    expect(html).toContain("https://sga.example.test/tarefas/t-1?a=1&amp;b=2");
    expect(html).toContain("novo comentário para você");
  });

  it("renderiza e escapa o evento de solicitação de conclusão", () => {
    const html = renderTemplateNotificacao("CONCLUSAO_SOLICITADA", {
      nome: "Talita",
      titulo: "Conclusão aguardando confirmação",
      mensagem: "Uma tarefa precisa de revisão <hoje>.",
      url: "/subtarefas?conclusao=sol-1#solicitacao-sol-1",
    });

    expect(html).toContain("Há uma solicitação de conclusão aguardando decisão ou um resultado para consultar.");
    expect(html).toContain("revisão &lt;hoje&gt;");
    expect(html).toContain("https://sga.example.test/subtarefas?conclusao=sol-1#solicitacao-sol-1");
  });
});
