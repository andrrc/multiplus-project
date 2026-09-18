import { describe, expect, it } from "vitest";
import { renderTemplateNotificacao } from "@/lib/email-templates";

describe("templates de e-mail de notificações", () => {
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
    expect(html).toContain("/tarefas/t-1?a=1&amp;b=2");
    expect(html).toContain("novo comentário para você");
  });
});
