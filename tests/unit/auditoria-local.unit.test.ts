/** RF/RN: não se aplica — auditoria local somente de leitura do ambiente de desenvolvimento. */
import { describe, expect, it } from "vitest";
import {
  bancoEhLocal,
  auditarAmbiente,
  dockerEhLocal,
  formatarRelatorio,
  lerServicosCompose,
  lerVariaveisEnv,
  ocultarSegredos,
  resumirStatusMigracoes,
  servicoDockerSaudavel,
} from "../../scripts/auditoria-local.mjs";

describe("auditoria local de desenvolvimento", () => {
  it("lê variáveis sem exibir conteúdo de valores ou comentários", () => {
    expect(lerVariaveisEnv('APP_DATABASE_PASSWORD="senha teste" # local\nAUTH_SECRET=abc123\n# comentário\n')).toEqual({
      APP_DATABASE_PASSWORD: "senha teste",
      AUTH_SECRET: "abc123",
    });
  });

  it("oculta credenciais e URLs de banco na saída", () => {
    const mensagem = ocultarSegredos(
      "falha postgresql://usuario:segredo@localhost:5434/multiplus",
      ["segredo"],
    );
    expect(mensagem).not.toContain("segredo");
    expect(mensagem).not.toContain("usuario");
    expect(mensagem).toContain("URL do banco ocultada");
  });

  it("lê a saída JSON do estado do Compose em linhas separadas", () => {
    expect(lerServicosCompose('{"Service":"postgres","State":"running"}\n{"Service":"minio","State":"exited"}'))
      .toEqual([
        { Service: "postgres", State: "running" },
        { Service: "minio", State: "exited" },
      ]);
  });

  it("só considera banco local a URL do Postgres do projeto", () => {
    expect(bancoEhLocal("postgresql://usuario:senha@localhost:5434/multiplus?schema=public")).toBe(true);
    expect(bancoEhLocal("postgresql://usuario:senha@db.externo:5432/multiplus")).toBe(false);
    expect(bancoEhLocal("postgresql://usuario:senha@localhost:5434/multiplus_test")).toBe(false);
    expect(bancoEhLocal("não é uma URL")).toBe(false);
  });

  it("só permite consultar endpoints Docker locais", () => {
    expect(dockerEhLocal("npipe:////./pipe/dockerDesktopLinuxEngine")).toBe(true);
    expect(dockerEhLocal("unix:///var/run/docker.sock")).toBe(true);
    expect(dockerEhLocal("tcp://localhost:2375")).toBe(true);
    expect(dockerEhLocal("ssh://servidor-remoto")).toBe(false);
    expect(dockerEhLocal("tcp://docker.example.com:2375")).toBe(false);
  });

  it("distingue container saudável, iniciando, parado e não saudável", () => {
    expect(servicoDockerSaudavel("running", "healthy")).toBe(true);
    expect(servicoDockerSaudavel("running", "health: starting")).toBe(false);
    expect(servicoDockerSaudavel("running", "unhealthy")).toBe(false);
    expect(servicoDockerSaudavel("exited", "")).toBe(false);
  });

  it("só executa consultas locais e nunca inicia ou altera serviços", async () => {
    const comandos: string[] = [];
    const ambiente = {
      NODE_ENV: "test" as const,
      npm_config_user_agent: "npm/11.15.0 node/v24.15.0 win32",
      POSTGRES_USER: "dev",
      POSTGRES_PASSWORD: "senha-teste",
      POSTGRES_DB: "multiplus",
      DATABASE_URL: "postgresql://dev:senha@db.externo:5432/multiplus",
      APP_DATABASE_PASSWORD: "",
      APP_DATABASE_URL: "postgresql://app:senha@db.externo:5432/multiplus",
      AUTH_SECRET: "segredo-teste",
      MINIO_ROOT_USER: "dev-minio",
      MINIO_ROOT_PASSWORD: "senha-minio",
      MINIO_BUCKET: "multiplus-uploads",
    };
    const executar = async (_binario: string, argumentos: string[]) => {
      comandos.push(argumentos.join(" "));
      if (argumentos[0] === "--version") return { ok: true, saida: "Docker version 29.9.1" };
      if (argumentos[0] === "context") return { ok: true, saida: "npipe:////./pipe/dockerDesktopLinuxEngine" };
      if (argumentos[0] === "info") return { ok: true, saida: "29.9.1" };
      if (argumentos[0] === "compose" && argumentos[1] === "version") return { ok: true, saida: "5.6.0" };
      if (argumentos.includes("config")) return { ok: false, saida: "error while interpolating APP_DATABASE_PASSWORD; valor sentinela senha-teste" };
      if (argumentos.includes("ps")) return { ok: true, saida: '{"Service":"postgres","State":"running","Health":"healthy"}\n{"Service":"minio","State":"exited"}' };
      return { ok: false, saida: "comando inesperado" };
    };

    const resultados = await auditarAmbiente({
      executar,
      ambiente,
      testarPorta: async () => false,
    });

    expect(resultados.find(({ titulo }) => titulo === "Conexões de banco")?.detalhe).toContain("nenhum banco remoto foi consultado");
    expect(resultados.filter(({ status }) => status === "FALHA").length).toBeGreaterThanOrEqual(2);
    expect(resultados.find(({ titulo }) => titulo === "Configuração Docker local")?.detalhe).not.toContain("senha-teste");
    expect(resultados.find(({ titulo }) => titulo === "Serviço minio")?.status).toBe("ATENÇÃO");
    expect(comandos.some((comando) => /\b(up|down|build|migrate|seed|rm|prune)\b/.test(comando))).toBe(false);
  });

  it("relata a faixa do app ocupada sem tentar encerrar os processos", async () => {
    const resultados = await auditarAmbiente({
      ambiente: {
        NODE_ENV: "test" as const,
        npm_config_user_agent: "npm/11.15.0 node/v24.15.0 win32",
        DATABASE_URL: "postgresql://dev:senha@db.externo:5432/multiplus",
        APP_DATABASE_URL: "postgresql://app:senha@db.externo:5432/multiplus",
      },
      executar: async () => ({ ok: false, saida: "indisponível" }),
      testarPorta: async (_host, porta) => porta >= 3001 && porta <= 3100,
      consultarSaude: async () => null,
    });

    expect(resultados.find(({ titulo }) => titulo === "Porta para o app local")?.status).toBe("FALHA");
    expect(resultados.find(({ titulo }) => titulo === "Aplicação local")?.status).toBe("ATENÇÃO");
  });

  it("mostra próximos passos e resume falhas sem incluir detalhes secretos", () => {
    const relatorio = formatarRelatorio([
      { status: "FALHA", titulo: "Configuração local", detalhe: "APP_DATABASE_PASSWORD ausente.", proximoPasso: "Preencha no .env." },
    ]);
    expect(relatorio).toContain("FALHA  Configuração local");
    expect(relatorio).toContain("Próximo passo: Preencha no .env.");
    expect(relatorio).toContain("Resumo: 1 falha(s), 0 atenção(ões).");
    expect(relatorio).toContain("nenhum serviço ou dado foi alterado");
  });

  it("resume migrations sem repetir avisos do Prisma", () => {
    expect(resumirStatusMigracoes(
      "Prisma schema loaded from prisma/schema.prisma\nDatabase schema is up to date!\n",
      true,
    )).toBe("Banco está em dia com as migrations.");
    expect(resumirStatusMigracoes(
      "The following migration(s) have not been applied:\n20261029000000_nova_regra\n",
      false,
    )).toBe("Há migrations pendentes; nenhuma foi aplicada pela auditoria.");
  });
});
