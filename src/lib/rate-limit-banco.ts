import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

type Limite = { chave: string; limite: number };
type Reserva = { chave: string; falhas: number; expiraEm: Date };
const CAPACIDADE = 50_000;
const JANELA_MS = 15 * 60 * 1000;
const chaveInterna = (chave: string) => createHash("sha256").update(chave).digest("hex");

/** Reserva tentativas antes de consultar credenciais, serializando todos os processos. */
export async function reservarLimites(limites: Limite[], pendente: boolean): Promise<Reserva[] | null> {
  const itens = limites.map((item) => ({ ...item, chave: chaveInterna(item.chave) }));
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(731042938)`;
    const agora = new Date();
    await tx.limiteAutenticacao.deleteMany({ where: { expiraEm: { lte: agora } } });
    const existentes = await tx.limiteAutenticacao.findMany({ where: { chave: { in: itens.map((i) => i.chave) } } });
    if (itens.some((item) => {
      const registro = existentes.find((e) => e.chave === item.chave);
      return registro && registro.falhas + registro.pendentes >= item.limite;
    })) return null;
    const quantidade = await tx.limiteAutenticacao.count();
    if (quantidade + itens.length - existentes.length > CAPACIDADE) return null;
    const reservas: Reserva[] = [];
    for (const item of itens) {
      const registro = await tx.limiteAutenticacao.upsert({
        where: { chave: item.chave },
        create: { chave: item.chave, falhas: pendente ? 0 : 1, pendentes: pendente ? 1 : 0, expiraEm: new Date(agora.getTime() + JANELA_MS) },
        update: pendente ? { pendentes: { increment: 1 } } : { falhas: { increment: 1 } },
      });
      reservas.push({ chave: item.chave, falhas: registro.falhas, expiraEm: registro.expiraEm });
    }
    return reservas;
  });
}

/** Finaliza uma reserva sem apagar tentativas concorrentes. */
export async function finalizarLimites(reservas: Reserva[], sucesso: boolean): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(731042938)`;
    for (const reserva of reservas) {
      const { chave } = reserva;
      const atual = await tx.limiteAutenticacao.findUnique({ where: { chave } });
      if (!atual || atual.pendentes < 1 || atual.expiraEm.getTime() !== reserva.expiraEm.getTime()) continue;
      await tx.limiteAutenticacao.update({ where: { chave }, data: {
        pendentes: { decrement: 1 },
        falhas: sucesso ? (atual.pendentes === 1 && atual.falhas === reserva.falhas ? 0 : atual.falhas) : { increment: 1 },
      } });
    }
  });
}
