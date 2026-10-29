import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { promisify } from "node:util";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const executarArquivo = promisify(execFile);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARQUIVOS_COMPOSE = ["docker-compose.yml", "docker-compose.local.yml"];
const VARIAVEIS_OBRIGATORIAS = [
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "POSTGRES_DB",
  "DATABASE_URL",
  "APP_DATABASE_PASSWORD",
  "APP_DATABASE_URL",
  "AUTH_SECRET",
  "MINIO_ROOT_USER",
  "MINIO_ROOT_PASSWORD",
  "MINIO_BUCKET",
];

export function lerVariaveisEnv(conteudo) {
  const variaveis = {};

  for (const linha of conteudo.split(/\r?\n/)) {
    const correspondencia = linha.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!correspondencia) continue;

    const [, nome, valorBruto] = correspondencia;
    let valor = valorBruto;
    const valorEntreAspas = valor.match(/^(["'])(.*)\1(?:\s+#.*)?$/);
    if (valorEntreAspas) valor = valorEntreAspas[2];
    else valor = valor.replace(/\s+#.*$/, "").trim();
    variaveis[nome] = valor;
  }

  return variaveis;
}

export function ocultarSegredos(texto, valoresSecretos = []) {
  let seguro = String(texto ?? "");
  for (const segredo of valoresSecretos) {
    if (segredo && segredo.length >= 2) seguro = seguro.split(segredo).join("[oculto]");
  }
  return seguro
    .replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, "postgresql://[URL do banco ocultada]")
    .replace(/(https?:\/\/)[^\s/@:]+:[^\s/@]+@/gi, "$1[credenciais ocultadas]@");
}

export function lerServicosCompose(saida) {
  const texto = String(saida ?? "").trim();
  if (!texto) return [];

  try {
    const json = JSON.parse(texto);
    return Array.isArray(json) ? json : [json];
  } catch {
    return texto.split(/\r?\n/).flatMap((linha) => {
      try {
        return [JSON.parse(linha)];
      } catch {
        return [];
      }
    });
  }
}

export function bancoEhLocal(url) {
  try {
    const endereco = new URL(url);
    const hostLocal = ["localhost", "127.0.0.1", "::1"].includes(endereco.hostname);
    const nomeBanco = endereco.pathname.replace(/^\//, "");
    return hostLocal && endereco.port === "5434" && nomeBanco === "multiplus";
  } catch {
    return false;
  }
}

// A auditoria nunca deve consultar um daemon indicado por SSH ou por host externo.
export function dockerEhLocal(endpoint) {
  return /^npipe:\/\//i.test(endpoint)
    || /^unix:\/\//i.test(endpoint)
    || /^tcp:\/\/(?:localhost|127\.0\.0\.1|\[?::1\]?):\d+$/i.test(endpoint);
}

export function servicoDockerSaudavel(estado, saude = "") {
  return /running|up/i.test(estado)
    && !/unhealthy|starting/i.test(saude);
}

export function resumirStatusMigracoes(saida, sucesso) {
  const linhas = String(saida ?? "").split(/\r?\n/).map((linha) => linha.trim()).filter(Boolean);
  if (sucesso && linhas.some((linha) => /database schema is up to date/i.test(linha))) {
    return "Banco está em dia com as migrations.";
  }
  if (linhas.some((linha) => /following migration.*not been applied|migrations? (?:are )?pending/i.test(linha))) {
    return "Há migrations pendentes; nenhuma foi aplicada pela auditoria.";
  }

  const diagnostico = linhas.filter((linha) =>
    !/deprecated|pris.ly|environment variables loaded|prisma schema loaded/i.test(linha),
  ).slice(-2);
  return diagnostico.join(" ").slice(0, 300) || "Não foi possível resumir o estado das migrations.";
}

function resumirErroCompose(saida, segredos) {
  const diagnostico = String(saida ?? "").split(/\r?\n/).map((linha) => linha.trim()).filter((linha) =>
    linha && !/^time=/i.test(linha) && !/^command failed:/i.test(linha),
  ).slice(-1).join(" ");
  return ocultarSegredos(diagnostico || "O Compose não conseguiu validar os arquivos locais.", segredos).slice(0, 400);
}

export function formatarRelatorio(resultados) {
  const simbolos = { OK: "✓", ATENÇÃO: "!", FALHA: "✗", INFO: "i" };
  const linhas = ["Auditoria local do Múltiplus", "Somente leitura: nenhum serviço ou dado foi alterado.", ""];

  for (const resultado of resultados) {
    linhas.push(`${simbolos[resultado.status] ?? "i"} ${resultado.status}  ${resultado.titulo}`);
    if (resultado.detalhe) linhas.push(`  ${resultado.detalhe}`);
    if (resultado.proximoPasso) linhas.push(`  Próximo passo: ${resultado.proximoPasso}`);
  }

  const falhas = resultados.filter(({ status }) => status === "FALHA").length;
  const atencoes = resultados.filter(({ status }) => status === "ATENÇÃO").length;
  linhas.push("", `Resumo: ${falhas} falha(s), ${atencoes} atenção(ões).`);
  return linhas.join("\n");
}

async function existe(caminho) {
  try {
    await access(caminho);
    return true;
  } catch {
    return false;
  }
}

async function comando(binario, argumentos, opcoes = {}) {
  try {
    const { stdout, stderr } = await executarArquivo(binario, argumentos, {
      cwd: RAIZ,
      env: opcoes.env ?? process.env,
      shell: opcoes.shell ?? false,
      timeout: opcoes.timeout ?? 10_000,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });
    return { ok: true, saida: `${stdout}${stderr}`.trim() };
  } catch (erro) {
    return {
      ok: false,
      codigo: erro.code,
      saida: `${erro.stdout ?? ""}${erro.stderr ?? ""}${erro.message ?? ""}`.trim(),
    };
  }
}

function criarVerificadorPorta(host, porta, tempoLimite = 700) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port: porta });
    const terminar = (aberta) => {
      socket.destroy();
      resolve(aberta);
    };
    socket.setTimeout(tempoLimite);
    socket.once("connect", () => terminar(true));
    socket.once("timeout", () => terminar(false));
    socket.once("error", () => terminar(false));
  });
}

async function consultarSaudeHttp(porta) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 500);
  try {
    const resposta = await fetch(`http://127.0.0.1:${porta}/api/health`, {
      cache: "no-store",
      redirect: "manual",
      signal: controlador.signal,
    });
    const corpo = await resposta.text();
    return { status: resposta.status, multiplus: corpo.includes('"status":"ok"') || corpo.includes('"status":"indisponivel"') };
  } catch {
    return null;
  } finally {
    clearTimeout(temporizador);
  }
}

function criarResultado(status, titulo, detalhe, proximoPasso) {
  return { status, titulo, detalhe, proximoPasso };
}

export async function auditarAmbiente({
  raiz = RAIZ,
  executar = comando,
  testarPorta = criarVerificadorPorta,
  consultarSaude = consultarSaudeHttp,
  ambiente = process.env,
} = {}) {
  const resultados = [];
  const caminhoEnv = path.join(raiz, ".env");
  let textoEnv = "";
  const arquivoEnvExiste = await existe(caminhoEnv);
  if (arquivoEnvExiste) textoEnv = await readFile(caminhoEnv, "utf8");
  const variaveisArquivo = lerVariaveisEnv(textoEnv);
  // Variáveis já exportadas pelo processo têm a mesma precedência que no Compose.
  const variaveis = { ...variaveisArquivo, ...ambiente };
  const segredos = Object.entries(variaveis)
    .filter(([nome, valor]) => valor && /PASSWORD|SECRET|TOKEN|API_KEY|DATABASE_URL|_USER$/i.test(nome))
    .map(([, valor]) => valor);
  const envSanitizado = { ...variaveisArquivo, ...ambiente };

  resultados.push(arquivoEnvExiste
    ? criarResultado("OK", "Arquivo .env", "Arquivo local encontrado; valores não serão exibidos.")
    : criarResultado("ATENÇÃO", "Arquivo .env", "Não encontrado.", "Copie .env.example para .env e preencha as configurações locais."));

  const ausentes = VARIAVEIS_OBRIGATORIAS.filter((nome) => !String(variaveis[nome] ?? "").trim());
  resultados.push(ausentes.length
    ? criarResultado("FALHA", "Configuração local", `Variáveis vazias ou ausentes: ${ausentes.join(", ")}.`, "Preencha essas variáveis no .env; o relatório não mostra seus valores.")
    : criarResultado("OK", "Configuração local", `As ${VARIAVEIS_OBRIGATORIAS.length} variáveis necessárias estão presentes.`));

  const versaoNode = Number(process.versions.node.split(".")[0]);
  resultados.push(versaoNode >= 20
    ? criarResultado("OK", "Node.js", `Versão ${process.versions.node}.`)
    : criarResultado("FALHA", "Node.js", `Versão ${process.versions.node}; o projeto requer Node 20 ou superior.`, "Instale Node.js 20 ou superior e abra um terminal novo."));

  const versaoNpmDoAmbiente = ambiente.npm_config_user_agent?.match(/(?:^|\s)npm\/([^\s]+)/)?.[1];
  const npm = versaoNpmDoAmbiente
    ? { ok: true, saida: versaoNpmDoAmbiente }
    : await executar("npm", ["--version"], {
      env: envSanitizado,
      shell: process.platform === "win32",
    });
  resultados.push(npm.ok
    ? criarResultado("OK", "npm", `Versão ${ocultarSegredos(npm.saida, segredos)}.`)
    : criarResultado("FALHA", "npm", "O comando npm não está disponível neste terminal.", "Instale Node.js com npm e abra um terminal novo."));

  const dependenciasInstaladas = await existe(path.join(raiz, "node_modules", "next"))
    && await existe(path.join(raiz, "node_modules", "@prisma", "client"))
    && await existe(path.join(raiz, "node_modules", "tsx"));
  resultados.push(dependenciasInstaladas
    ? criarResultado("OK", "Dependências do projeto", "Next.js, Prisma Client e tsx encontrados em node_modules.")
    : criarResultado("FALHA", "Dependências do projeto", "Next.js, Prisma Client ou tsx não encontrado.", "Execute npm install na pasta do projeto."));

  const docker = await executar("docker", ["--version"], { env: envSanitizado });
  resultados.push(docker.ok
    ? criarResultado("OK", "Docker CLI", ocultarSegredos(docker.saida, segredos))
    : criarResultado("FALHA", "Docker CLI", "O comando docker não está disponível.", "Instale o Docker Desktop e habilite a integração com esta distribuição/terminal."));

  let endpointDocker = envSanitizado.DOCKER_HOST ?? "";
  if (!endpointDocker) {
    const endpoint = await executar("docker", ["context", "inspect", "--format", "{{.Endpoints.docker.Host}}"], { env: envSanitizado });
    if (endpoint.ok) endpointDocker = endpoint.saida.trim();
  }
  const dockerLocal = dockerEhLocal(endpointDocker);
  resultados.push(dockerLocal
    ? criarResultado("OK", "Destino do Docker", "O endpoint configurado é local.")
    : criarResultado("FALHA", "Destino do Docker", "Endpoint ausente ou remoto; a auditoria não consultou esse daemon.", "Selecione o contexto local do Docker Desktop ou configure um endpoint local."));

  let daemonAtivo = false;
  let composePronto = false;
  let composeConfigOk = false;
  if (docker.ok && dockerLocal) {
    const info = await executar("docker", ["info", "--format", "{{.ServerVersion}}"], { env: envSanitizado });
    daemonAtivo = info.ok;
    resultados.push(info.ok
      ? criarResultado("OK", "Docker Engine", `Daemon ativo (versão ${ocultarSegredos(info.saida, segredos)}).`)
      : criarResultado("FALHA", "Docker Engine", "O Docker CLI existe, mas não conseguiu falar com o daemon.", "Abra o Docker Desktop e aguarde o Engine ficar pronto."));

    const versaoCompose = await executar("docker", ["compose", "version", "--short"], { env: envSanitizado });
    composePronto = versaoCompose.ok;
    resultados.push(versaoCompose.ok
      ? criarResultado("OK", "Docker Compose", `Plugin disponível (versão ${ocultarSegredos(versaoCompose.saida, segredos)}).`)
      : criarResultado("FALHA", "Docker Compose", "O plugin docker compose não está disponível.", "Atualize ou habilite o Compose V2 no Docker Desktop."));

    if (composePronto) {
      const argumentosCompose = ARQUIVOS_COMPOSE.flatMap((arquivo) => ["-f", arquivo]);
      const configuracao = await executar("docker", ["compose", ...argumentosCompose, "config", "--services"], { env: envSanitizado });
      composeConfigOk = configuracao.ok;
      resultados.push(configuracao.ok
        ? criarResultado("OK", "Configuração Docker local", "Compose base e override local foram interpretados.")
        : criarResultado("FALHA", "Configuração Docker local", resumirErroCompose(configuracao.saida, segredos), "Corrija as variáveis indicadas no .env e rode a auditoria novamente."));

      if (composeConfigOk && daemonAtivo) {
        const estado = await executar("docker", ["compose", ...argumentosCompose, "ps", "--all", "--format", "json"], { env: envSanitizado });
        if (estado.ok) {
          const servicos = lerServicosCompose(estado.saida);
          for (const nome of ["postgres", "minio"]) {
            const servico = servicos.find((item) => item.Service === nome || item.service === nome);
            const situacao = servico?.State ?? servico?.state ?? "ausente";
            const saude = servico?.Health ?? servico?.health ?? "";
            resultados.push(servicoDockerSaudavel(situacao, saude)
              ? criarResultado("OK", `Serviço ${nome}`, `Estado ${situacao}${saude ? `, saúde ${saude}` : ""}.`)
              : criarResultado("ATENÇÃO", `Serviço ${nome}`, `Estado ${situacao}${saude ? `, saúde ${saude}` : ""}.`, "Se precisar iniciar o ambiente, use o comando do setup local documentado no README."));
          }
        } else {
          resultados.push(criarResultado("ATENÇÃO", "Estado dos serviços Docker", ocultarSegredos(estado.saida, segredos).slice(0, 400), "Confira o estado com docker compose ps depois de corrigir a configuração."));
        }
      } else if (!composeConfigOk && daemonAtivo) {
        const estado = await executar("docker", [
          "ps", "--all", "--filter", "label=com.docker.compose.project=multiplus",
          "--format", '{{.Label "com.docker.compose.service"}}|{{.State}}|{{.Status}}',
        ], { env: envSanitizado });
        const servicos = estado.ok ? estado.saida.split(/\r?\n/).filter(Boolean) : [];
        for (const nome of ["postgres", "minio"]) {
          const [servico, situacao, saude = ""] = servicos.find((linha) => linha.startsWith(`${nome}|`))?.split("|") ?? [];
          resultados.push(servicoDockerSaudavel(situacao, saude)
            ? criarResultado("OK", `Serviço ${nome}`, `Estado ${situacao}${saude ? `; ${saude}` : ""}. A configuração Compose não pôde ser validada.`)
            : criarResultado("ATENÇÃO", `Serviço ${nome}`, `Container ${servico ? `em estado ${situacao}` : "não encontrado"}. A configuração Compose não pôde ser validada.`, "Confira o estado do serviço após corrigir a configuração local."));
        }
      }
    }
  }

  const portasInfra = await Promise.all([
    { nome: "Postgres", porta: 5434 },
    { nome: "MinIO API", porta: 9000 },
    { nome: "MinIO Console", porta: 9001 },
  ].map(async ({ nome, porta }) => ({ nome, porta, aberta: await testarPorta("127.0.0.1", porta) })));
  for (const { nome, porta, aberta } of portasInfra) {
    resultados.push(aberta
      ? criarResultado("OK", `Porta ${porta} (${nome})`, "Há um serviço escutando localmente.")
      : criarResultado("ATENÇÃO", `Porta ${porta} (${nome})`, "Nenhum serviço respondeu nesta porta.", "Confira se o serviço correspondente está iniciado no Compose local."));
  }

  const portasApp = await Promise.all(Array.from({ length: 100 }, (_, indice) => 3001 + indice)
    .map(async (porta) => ({ porta, aberta: await testarPorta("127.0.0.1", porta) })));
  const portasLivres = portasApp.filter(({ aberta }) => !aberta);
  resultados.push(portasLivres.length
    ? criarResultado("OK", "Porta para o app local", `${portasLivres.length} porta(s) livres entre 3001 e 3100; npm run dev escolhe a primeira disponível.`)
    : criarResultado("FALHA", "Porta para o app local", "Todas as portas entre 3001 e 3100 estão ocupadas.", "Feche um servidor local que não esteja usando e rode a auditoria novamente."));

  const appsAtivos = await Promise.all(portasApp.filter(({ aberta }) => aberta).map(async ({ porta }) => ({
    porta,
    resposta: await consultarSaude(porta),
  })));
  const multiplus = appsAtivos.find(({ resposta }) => resposta?.multiplus);
  if (multiplus?.resposta.status === 200) {
    resultados.push(criarResultado("OK", "Aplicação local", `Múltiplus respondeu com saúde normal em http://localhost:${multiplus.porta}.`));
  } else if (multiplus) {
    resultados.push(criarResultado("ATENÇÃO", "Aplicação local", `Múltiplus respondeu HTTP ${multiplus.resposta.status} em http://localhost:${multiplus.porta}; o app está acessível, mas a checagem de saúde falhou.`, "Confira o resultado de Postgres e os logs do servidor npm run dev."));
  } else {
    const portasComOutroServico = appsAtivos.filter(({ resposta }) => resposta);
    const semRespostaHttp = appsAtivos.filter(({ resposta }) => !resposta);
    if (semRespostaHttp.length) {
      resultados.push(criarResultado("ATENÇÃO", "Aplicação local", `Há ${semRespostaHttp.length} porta(s) ocupada(s) na faixa do app, mas o endpoint local não respondeu a tempo.`, "Confira o terminal do npm run dev e tente abrir a URL impressa por ele."));
    } else {
      resultados.push(criarResultado("INFO", "Aplicação local", portasComOutroServico.length
        ? `Nenhuma resposta de saúde do Múltiplus encontrada; há ${portasComOutroServico.length} porta(s) com outro serviço.`
        : "Nenhum servidor do Múltiplus foi encontrado na faixa 3001–3100.", "Se estiver pronto para testar, execute npm run dev e use a URL impressa no terminal."));
    }
  }

  const urlsBancoLocais = ["DATABASE_URL", "APP_DATABASE_URL"].every((nome) => bancoEhLocal(variaveis[nome]));
  let bancoPrincipalConectado = false;
  if (dependenciasInstaladas && urlsBancoLocais) {
    try {
      const { PrismaClient } = await import("@prisma/client");
      for (const { nome, url } of [
        { nome: "Conexão do banco (DATABASE_URL)", url: variaveis.DATABASE_URL },
        { nome: "Conexão do app (APP_DATABASE_URL)", url: variaveis.APP_DATABASE_URL },
      ]) {
        const prisma = new PrismaClient({ datasources: { db: { url } } });
        try {
          // SELECT 1 confirma a conexão sem ler tabelas de negócio nem alterar dados.
          await prisma.$queryRaw`SELECT 1`;
          if (nome === "Conexão do banco (DATABASE_URL)") bancoPrincipalConectado = true;
          resultados.push(criarResultado("OK", nome, "Consulta de leitura SELECT 1 concluída."));
        } catch (erro) {
          resultados.push(criarResultado("FALHA", nome, ocultarSegredos(erro.message, segredos).slice(0, 400), "Confira se Postgres está ativo e se as credenciais/URLs locais correspondem ao banco."));
        } finally {
          await prisma.$disconnect();
        }
      }
    } catch (erro) {
      resultados.push(criarResultado("ATENÇÃO", "Conexões Prisma", ocultarSegredos(erro.message, segredos).slice(0, 400), "Execute npx prisma generate depois de instalar as dependências."));
    }
  } else {
    const detalhe = !urlsBancoLocais
      ? "Não testadas: as URLs precisam apontar para localhost:5434/multiplus; nenhum banco remoto foi consultado."
      : "Não testadas porque dependências ou URLs locais de banco não estão disponíveis.";
    resultados.push(criarResultado("INFO", "Conexões de banco", detalhe));
  }

  if (bancoPrincipalConectado) {
    const prismaCli = path.join(raiz, "node_modules", "prisma", "build", "index.js");
    if (await existe(prismaCli)) {
      // `migrate status` apenas compara o banco e o diretório; não aplica migrations.
      const migration = await executar(process.execPath, [prismaCli, "migrate", "status"], {
        env: { ...envSanitizado, DATABASE_URL: variaveis.DATABASE_URL },
      });
      resultados.push(migration.ok
        ? criarResultado("OK", "Migrations", resumirStatusMigracoes(migration.saida, true))
        : criarResultado("ATENÇÃO", "Migrations", resumirStatusMigracoes(migration.saida, false), "Confira o estado das migrations; a auditoria não aplica nenhuma migration."));
    } else {
      resultados.push(criarResultado("INFO", "Migrations", "Não verificadas; Prisma CLI não está instalado."));
    }
  }

  return resultados;
}

async function main() {
  const resultados = await auditarAmbiente();
  console.log(formatarRelatorio(resultados));
  if (resultados.some(({ status }) => status === "FALHA")) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((erro) => {
    console.error("A auditoria local não conseguiu concluir:", ocultarSegredos(erro.message));
    process.exitCode = 1;
  });
}
