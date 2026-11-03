/** RF-023 — apresentação, destino seguro, resumo e isolamento do sinal de toast. */
import { describe, expect, it } from "vitest";
import { criarAmostrasToastDemonstracao, enfileirarToast, tipoToastDoEvento, rotaCentralNotificacoes, rotaSeguraDoToast, textoResumoNotificacoes, toastsVisiveis, idDaNotificacaoDoUsuario, podeGerarToastsDemonstracao, substituirAmostrasToast } from "@/lib/notificacoes-toasts";

describe("toasts de notificações", () => {
  it("associa os eventos aos estilos sem acrescentar um tipo persistido", () => {
    expect(tipoToastDoEvento("TAREFA_CONCLUIDA")).toBe("sucesso");
    expect(tipoToastDoEvento("PROJETO_CONCLUIDO")).toBe("sucesso");
    expect(tipoToastDoEvento("PRAZO_PROXIMO")).toBe("aviso");
    expect(tipoToastDoEvento("CONCLUSAO_SOLICITADA")).toBe("aviso");
    expect(tipoToastDoEvento("NOVO_COMENTARIO")).toBe("informacao");
    expect(tipoToastDoEvento("ATRIBUICAO_RECEBIDA")).toBe("informacao");
  });

  it("usa a central correta e rejeita destinos externos ou malformados", () => {
    expect(rotaCentralNotificacoes("ADMIN")).toBe("/notificacoes");
    expect(rotaCentralNotificacoes("ADMIN_INTERNO")).toBe("/minhas-notificacoes");
    expect(rotaSeguraDoToast("/projetos?id=12#detalhe", "ADMIN")).toBe("/projetos?id=12#detalhe");
    expect(rotaSeguraDoToast("https://example.com", "ADMIN")).toBe("/notificacoes");
    expect(rotaSeguraDoToast("//example.com", "ADMIN_EXTERNO")).toBe("/minhas-notificacoes");
    expect(rotaSeguraDoToast("javascript:alert(1)", "ADMIN")).toBe("/notificacoes");
  });

  it("resume uma notificação e várias com a gramática correta", () => {
    expect(textoResumoNotificacoes(1)).toBe("Você tem 1 notificação nova");
    expect(textoResumoNotificacoes(5)).toBe("Você tem 5 notificações novas");
  });

  it("mantém a ordem da fila, deduplica ids e mostra no máximo três cards", () => {
    const fila = [{ id: "1" }, { id: "2" }, { id: "3" }];
    const comQuarta = enfileirarToast(fila, { id: "4" });
    expect(enfileirarToast(comQuarta, { id: "2" })).toBe(comQuarta);
    expect(toastsVisiveis(comQuarta)).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }]);
    expect(enfileirarToast(comQuarta.slice(1), { id: "5" })).toEqual([
      { id: "2" }, { id: "3" }, { id: "4" }, { id: "5" },
    ]);
  });

  it("descarta sinais de outros usuários e payloads inválidos", () => {
    const payload = JSON.stringify({ id: "notif-1", usuarioId: "usuario-a", lida: false });
    expect(idDaNotificacaoDoUsuario(payload, "usuario-a")).toBe("notif-1");
    expect(idDaNotificacaoDoUsuario(payload, "usuario-b")).toBeNull();
    expect(idDaNotificacaoDoUsuario("não-json", "usuario-a")).toBeNull();
  });

  it("libera a demonstração só para ADMIN fora de produção", () => {
    expect(podeGerarToastsDemonstracao("ADMIN", "development")).toBe(true);
    expect(podeGerarToastsDemonstracao("ADMIN", "production")).toBe(false);
    expect(podeGerarToastsDemonstracao("ADMIN_INTERNO", "development")).toBe(false);
    expect(podeGerarToastsDemonstracao("CLIENTE", "test")).toBe(false);
  });

  it("gera quatro estilos temporários e substitui a rodada anterior sem remover avisos reais", () => {
    const amostras = criarAmostrasToastDemonstracao("rodada-1", new Date("2026-11-03T12:00:00Z"));
    expect(amostras.map((toast) => toast.tipoVisual)).toEqual(["sucesso", "aviso", "informacao", "erro"]);
    expect(amostras.every((toast) => toast.demonstracao && toast.url === "/notificacoes")).toBe(true);

    const fila = [
      { id: "real", demonstracao: false },
      { id: "demo-antiga", demonstracao: true },
    ];
    expect(substituirAmostrasToast(fila, [{ id: "demo-nova", demonstracao: true }])).toEqual([
      { id: "real", demonstracao: false },
      { id: "demo-nova", demonstracao: true },
    ]);
  });
});
