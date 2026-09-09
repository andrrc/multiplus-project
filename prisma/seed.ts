import { PrismaClient } from "@prisma/client";
import { randomBytes, createHash } from "node:crypto";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "talita@multiplusambiental.com.br";
  const nome = process.env.SEED_ADMIN_NOME ?? "Talita";

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    console.log(`Usuário ADMIN ${email} já existe (id ${existente.id}) — nada a fazer.`);
    return;
  }

  const usuario = await prisma.usuario.create({
    data: { nome, email, perfil: "ADMIN" },
  });

  // Mesmo fluxo de onboarding do RF-030 (link de definição de senha) — só que
  // aqui, sem um ADMIN anterior para disparar o convite, o link sai no console.
  const tokenPlano = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(tokenPlano).digest("hex");
  await prisma.tokenAcesso.create({
    data: {
      usuarioId: usuario.id,
      tokenHash,
      tipo: "DEFINIR_SENHA",
      expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  console.log("\nUsuário ADMIN criado:", usuario.email);
  console.log("Link para definir a senha (válido por 7 dias):");
  console.log(`${baseUrl}/definir-senha?token=${tokenPlano}\n`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
