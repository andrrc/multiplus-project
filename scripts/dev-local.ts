import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

type CanListen = (port: number) => Promise<boolean>;

export function portIsAvailable(port: number): Promise<boolean> {
  // Tenta abrir um servidor TCP temporário; erro significa que a porta já está ocupada.
  return new Promise((resolveAvailability) => {
    const server = createServer();
    server.once("error", () => resolveAvailability(false));
    server.listen(port, () => {
      server.close(() => resolveAvailability(true));
    });
  });
}

export async function findAvailablePort(
  startPort = 3001,
  endPort = 3100,
  canListen: CanListen = portIsAvailable,
): Promise<number | null> {
  // Procura sequencialmente para sempre retornar a primeira porta livre no intervalo.
  for (let port = startPort; port <= endPort; port += 1) {
    if (await canListen(port)) return port;
  }
  return null;
}

export function getLocalUrl(port: number): string {
  // Centraliza a origem local usada no log e na configuração de autenticação.
  return `http://localhost:${port}`;
}

async function main() {
  // A porta 3000 pode pertencer a outro projeto; o script procura uma porta livre a partir de 3001.
  const port = await findAvailablePort();
  if (port === null) {
    console.error("Não encontrei uma porta livre entre 3001 e 3100 para o Múltiplus.");
    process.exitCode = 1;
    return;
  }

  const url = getLocalUrl(port);
  // Usa a instalação do Next deste repositório, sem depender de uma instalação global.
  const nextCli = resolve(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  console.log(`Múltiplus local: ${url}`);

  const next = spawn(process.execPath, [nextCli, "dev", "--port", String(port)], {
    cwd: process.cwd(),
    env: { ...process.env, AUTH_URL: url },
    stdio: "inherit",
    windowsHide: true,
  });

  // Encaminha Ctrl+C e encerramento ao processo filho para permitir shutdown limpo.
  const forwardSignal = (signal: NodeJS.Signals) => next.kill(signal);
  process.once("SIGINT", forwardSignal);
  process.once("SIGTERM", forwardSignal);

  next.once("error", (error) => {
    console.error("Não foi possível iniciar o servidor do Múltiplus:", error.message);
    process.exitCode = 1;
  });
  next.once("exit", (code, signal) => {
    process.removeListener("SIGINT", forwardSignal);
    process.removeListener("SIGTERM", forwardSignal);
    process.exitCode = code ?? (signal ? 1 : 0);
  });
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  // Permite importar as funções nos testes sem iniciar o servidor de desenvolvimento.
  void main();
}
