/**
 * RF-039, RF-040, RF-042, RF-043; RN-005, RN-007 — regras puras do módulo de
 * Administração e Acesso: status derivado, granularidade por perfil, guarda de rota,
 * política de senha e limite de tentativas.
 *
 * O que depende de banco (RLS, cascata de desativação, token) está nos testes de
 * integração; aqui ficam só as decisões que a aplicação toma sozinha.
 */
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { statusAcesso, granularidadeDoPerfil } from "@/lib/usuarios";
import {
  menuDoPerfil,
  PADRAO_ROTAS_DO_PROXY,
  perfilPodeAcessar,
  proxyAvaliaCaminho,
  telaInicial,
} from "@/lib/navegacao";
import { avaliarSenha, validarPoliticaSenha } from "@/lib/politica-senha";
import { limparRateLimit, registrarTentativa } from "@/lib/rate-limit";

describe("RF-040 — status de acesso derivado", () => {
  it("é Ativo quando o usuário está ativo e já definiu senha", () => {
    expect(statusAcesso({ ativo: true, senhaHash: "hash" })).toBe("ATIVO");
  });

  it("é Pendente de ativação enquanto o convite não foi usado", () => {
    expect(statusAcesso({ ativo: true, senhaHash: null })).toBe("PENDENTE");
  });

  it("é Desativado independentemente de já ter senha definida", () => {
    expect(statusAcesso({ ativo: false, senhaHash: "hash" })).toBe("DESATIVADO");
    expect(statusAcesso({ ativo: false, senhaHash: null })).toBe("DESATIVADO");
  });
});

describe("RN-005 — granularidade da atribuição por perfil", () => {
  it("Colaborador Interno é atribuído por projeto e Externo por tarefa", () => {
    expect(granularidadeDoPerfil("ADMIN_INTERNO")).toBe("PROJETO");
    expect(granularidadeDoPerfil("ADMIN_EXTERNO")).toBe("TAREFA");
  });

  it("Administrador e Cliente não recebem atribuição", () => {
    expect(granularidadeDoPerfil("ADMIN")).toBeNull();
    expect(granularidadeDoPerfil("CLIENTE")).toBeNull();
  });
});

describe("RF-043 — menu e tela inicial por perfil", () => {
  it("o menu do colaborador não traz Clientes nem Usuários", () => {
    const hrefsInterno = menuDoPerfil("ADMIN_INTERNO").map((i) => i.href);
    const hrefsExterno = menuDoPerfil("ADMIN_EXTERNO").map((i) => i.href);

    expect(hrefsInterno).not.toContain("/clientes");
    expect(hrefsInterno).not.toContain("/usuarios");
    expect(hrefsExterno).not.toContain("/clientes");
    expect(hrefsExterno).not.toContain("/usuarios");
  });

  it("todo perfil tem acesso a Meu Perfil", () => {
    for (const perfil of ["ADMIN", "ADMIN_INTERNO", "ADMIN_EXTERNO", "CLIENTE"] as const) {
      expect(menuDoPerfil(perfil).map((i) => i.href)).toContain("/meu-perfil");
    }
  });

  it("cada perfil tem uma tela inicial que ele próprio consegue acessar", () => {
    for (const perfil of ["ADMIN", "ADMIN_INTERNO", "ADMIN_EXTERNO", "CLIENTE"] as const) {
      expect(perfilPodeAcessar(perfil, telaInicial(perfil))).toBe(true);
    }
  });
});

describe("RF-043 — guarda de rota", () => {
  it("nega ao colaborador o acesso direto por URL às rotas do Administrador", () => {
    expect(perfilPodeAcessar("ADMIN_INTERNO", "/usuarios")).toBe(false);
    expect(perfilPodeAcessar("ADMIN_EXTERNO", "/clientes")).toBe(false);
    expect(perfilPodeAcessar("CLIENTE", "/usuarios")).toBe(false);
  });

  it("nega também as sub-rotas, não só a raiz da área", () => {
    expect(perfilPodeAcessar("ADMIN_INTERNO", "/usuarios/abc123/editar")).toBe(false);
    expect(perfilPodeAcessar("ADMIN_EXTERNO", "/clientes/abc123")).toBe(false);
    expect(perfilPodeAcessar("ADMIN", "/usuarios/abc123/editar")).toBe(true);
  });

  it("nega rota desconhecida em vez de liberar por omissão", () => {
    // Caso-limite que importa: uma área nova entra fechada até ser declarada no MENU.
    expect(perfilPodeAcessar("ADMIN", "/relatorios")).toBe(false);
    expect(perfilPodeAcessar("ADMIN_INTERNO", "/relatorios")).toBe(false);
  });

  it("libera a raiz, que só redireciona para a tela inicial do perfil", () => {
    expect(perfilPodeAcessar("CLIENTE", "/")).toBe(true);
  });

  it("os arquivos de public/ ficam fora da guarda, senão a logo some de todas as telas", () => {
    // Regressão real: com a guarda negando rota não declarada, /logo-multiplus.png passou a
    // ser redirecionado como se fosse página, e a logo sumiu do menu e das telas de login.
    // Quem resolve é o matcher do proxy, não a função de permissão — por isso o teste é aqui.
    expect(proxyAvaliaCaminho("/logo-multiplus.png")).toBe(false);
    expect(proxyAvaliaCaminho("/favicon.ico")).toBe(false);
    expect(proxyAvaliaCaminho("/_next/static/chunk.js")).toBe(false);

    // E as páginas continuam passando pela guarda.
    expect(proxyAvaliaCaminho("/")).toBe(true);
    expect(proxyAvaliaCaminho("/usuarios")).toBe(true);
    expect(proxyAvaliaCaminho("/usuarios/abc123/editar")).toBe(true);
  });

  it("o matcher escrito em src/proxy.ts é o mesmo que os testes acima exercitam", () => {
    // O `config.matcher` do Next precisa ser um literal — ele é extraído em tempo de build,
    // sem executar os imports, e uma constante importada vira ReferenceError em toda
    // requisição (aconteceu). Como o literal não pode ser importado daqui, o jeito de as
    // duas cópias não divergirem em silêncio é compará-las como texto.
    const proxy = readFileSync(
      new URL("../../src/proxy.ts", import.meta.url),
      "utf8",
    );
    const literal = proxy.match(/matcher:\s*\[\s*("(?:[^"\\]|\\.)*")\s*\]/)?.[1];
    expect(literal).toBeDefined();

    // `JSON.parse` desfaz os escapes do código-fonte (`\\.` no arquivo é `\.` no valor),
    // para comparar os dois padrões já avaliados, não o texto de um contra o valor do outro.
    expect(JSON.parse(literal!)).toBe(PADRAO_ROTAS_DO_PROXY);
  });

  it("colaborador interno pode abrir a lista de tarefas, mas externo não alcança Meus Projetos", () => {
    expect(perfilPodeAcessar("ADMIN_INTERNO", "/minhas-tarefas")).toBe(true);
    expect(perfilPodeAcessar("ADMIN_EXTERNO", "/meus-projetos")).toBe(false);
  });
});

describe("RF-032 — política de senha", () => {
  it("aceita senha com tamanho, letra e número", () => {
    expect(validarPoliticaSenha("multiplus2026")).toBeNull();
  });

  it("recusa senha curta, sem letra ou sem número", () => {
    expect(validarPoliticaSenha("abc1")).not.toBeNull();
    expect(validarPoliticaSenha("12345678")).not.toBeNull();
    expect(validarPoliticaSenha("abcdefgh")).not.toBeNull();
  });

  it("a mensagem nomeia o que falta, não só que está errada", () => {
    const mensagem = validarPoliticaSenha("abcdefgh");
    expect(mensagem).toContain("número");
  });

  it("avaliarSenha marca cada requisito separadamente, para a tela", () => {
    const estado = avaliarSenha("abcdefgh");
    expect(estado.find((r) => r.id === "tamanho")?.ok).toBe(true);
    expect(estado.find((r) => r.id === "letra")?.ok).toBe(true);
    expect(estado.find((r) => r.id === "numero")?.ok).toBe(false);
  });

  it("aceita letra acentuada como letra", () => {
    // Caso-limite de português: /[a-z]/ recusaria "sãopaulo1" sem motivo nenhum.
    expect(validarPoliticaSenha("sãopaulo1")).toBeNull();
  });
});

describe("RF-032 (B2) — limite de tentativas", () => {
  beforeEach(() => {
    limparRateLimit();
  });

  it("permite até o limite e bloqueia a partir dele", () => {
    const chave = "recuperacao:email:alguem@teste.local";
    expect(registrarTentativa(chave, 3, 60_000).permitido).toBe(true);
    expect(registrarTentativa(chave, 3, 60_000).permitido).toBe(true);
    expect(registrarTentativa(chave, 3, 60_000).permitido).toBe(true);
    expect(registrarTentativa(chave, 3, 60_000).permitido).toBe(false);
  });

  it("conta cada chave separadamente", () => {
    registrarTentativa("recuperacao:email:a@teste.local", 1, 60_000);
    expect(registrarTentativa("recuperacao:email:a@teste.local", 1, 60_000).permitido).toBe(false);
    expect(registrarTentativa("recuperacao:email:b@teste.local", 1, 60_000).permitido).toBe(true);
  });

  it("libera de novo depois que a janela expira", () => {
    // Relógio controlado: as três chamadas cairiam no mesmo milissegundo, e a janela
    // nunca venceria sozinha dentro do teste.
    vi.useFakeTimers();
    try {
      const chave = "recuperacao:ip:10.0.0.1";
      expect(registrarTentativa(chave, 1, 60_000).permitido).toBe(true);
      expect(registrarTentativa(chave, 1, 60_000).permitido).toBe(false);

      vi.advanceTimersByTime(60_001);
      expect(registrarTentativa(chave, 1, 60_000).permitido).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
