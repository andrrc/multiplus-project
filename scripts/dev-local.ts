import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

type CanListen = (port: number) => Promise<boolean>;

export function portIsAvailable(port: number): Promise<boolean> {
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
  for (let port = startPort; port <= endPort; port += 1) {
    if (await canListen(port)) return port;
  }
  return null;
}

export function getLocalUrl(port: number): string {
  return `http://localhost:${port}`;
}

async function main() {
  const port = await findAvailablePort();
  if (port === null) {
    console.error("Não encontrei uma porta livre entre 3001 e 3100 para o Múltiplus.");
    process.exitCode = 1;
    return;
  }

  const url = getLocalUrl(port);
  const nextCli = resolve(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  console.log(`Múltiplus local: ${url}`);

  const next = spawn(process.execPath, [nextCli, "dev", "--port", String(port)], {
    cwd: process.cwd(),
    env: { ...process.env, AUTH_URL: url },
    stdio: "inherit",
    windowsHide: true,
  });

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
  void main();
}
