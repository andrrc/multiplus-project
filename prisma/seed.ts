import { PrismaClient } from "@prisma/client";
import { randomBytes, createHash } from "node:crypto";

const prisma = new PrismaClient();

async function main() {
  // Permite definir a conta inicial por ambiente sem editar o seed.
  const email = process.env.SEED_ADMIN_EMAIL ?? "talita@multiplusambiental.com.br";
  const nome = process.env.SEED_ADMIN_NOME ?? "Talita";

  // Seed é repetível: se o ADMIN já existe, não cria outro nem substitui seus dados.
  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    console.log(`Usuário ADMIN ${email} já existe (id ${existente.id}) — nada a fazer.`);
    return;
  }

  // Cria a conta sem senha para que o primeiro acesso use o fluxo normal de definição.
  const usuario = await prisma.usuario.create({
    data: { nome, email, perfil: "ADMIN" },
  });

  // Mesmo fluxo de onboarding do RF-030 (link de definição de senha) — só que
  // aqui, sem um ADMIN anterior para disparar o convite, o link sai no console.
  // O link contém token aleatório; apenas seu hash é persistido na tabela de acesso.
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

  // O seed imprime o link para provisionamento inicial, quando ainda não há ADMIN para convidar.
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  console.log("\nUsuário ADMIN criado:", usuario.email);
  console.log("Link para definir a senha (válido por 7 dias):");
  console.log(`${baseUrl}/definir-senha?token=${tokenPlano}\n`);
}

main()
  .catch((erro) => {
    // Faz o processo terminar com código de erro, para que Docker/CI detectem falha no seed.
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Fecha o pool de conexões mesmo quando a criação do usuário falhar.
    await prisma.$disconnect();
  });
