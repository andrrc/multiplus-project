/**
 * RF-042 — perfil próprio do usuário (Tela A6).
 *
 * É a única escrita liberada a todo perfil autenticado, e ela toca `senhaHash`. A auditoria
 * da Sprint 3 (§ 5.4) encontrou o requisito sem nenhum teste: a regra central — trocar a
 * senha **informando a senha atual** — não era verificada por nada.
 *
 * Os testes de senha conferem o hash no banco, e não só o retorno da função: um `return`
 * dizendo "recusado" enquanto a coluna já foi reescrita passaria por qualquer asserção feita
 * apenas sobre o valor devolvido.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { ownerDb, limparFixtures, fecharConexoes } from "./setup/helpers";
import { alterarMinhaSenha, atualizarMeuNome } from "@/lib/usuarios";
import { hashSenha, verificarSenha } from "@/lib/senha";

const SENHA_ATUAL = "multiplus2026";
const SENHA_NOVA = "ambiental2027";

async function criarColaborador(email: string, comSenha = true) {
  return ownerDb.usuario.create({
    data: {
      nome: "Joana Colaboradora",
      email,
      perfil: "ADMIN_INTERNO",
      senhaHash: comSenha ? await hashSenha(SENHA_ATUAL) : null,
    },
  });
}

function hashNoBanco(usuarioId: string) {
  return ownerDb.usuario
    .findUniqueOrThrow({ where: { id: usuarioId }, select: { senhaHash: true } })
    .then((u) => u.senhaHash);
}

beforeEach(async () => {
  await limparFixtures();
});

afterEach(async () => {
  await limparFixtures();
});

afterAll(async () => {
  await fecharConexoes();
});

describe("RF-042 — trocar a própria senha exige a senha atual", () => {
  it("senha atual correta troca a senha", async () => {
    const usuario = await criarColaborador("troca.ok@teste.local");
    const ctx = { usuarioId: usuario.id, perfil: "ADMIN_INTERNO" as const };

    expect(await alterarMinhaSenha(ctx, SENHA_ATUAL, SENHA_NOVA)).toEqual({ sucesso: true });

    const hash = await hashNoBanco(usuario.id);
    expect(hash).not.toBe(usuario.senhaHash);
    expect(await verificarSenha(SENHA_NOVA, hash!)).toBe(true);
    expect(await verificarSenha(SENHA_ATUAL, hash!)).toBe(false);
  });

  it("senha atual errada é recusada e o hash permanece inalterado", async () => {
    const usuario = await criarColaborador("troca.errada@teste.local");
    const ctx = { usuarioId: usuario.id, perfil: "ADMIN_INTERNO" as const };

    expect(await alterarMinhaSenha(ctx, "nao-e-a-minha-senha", SENHA_NOVA)).toEqual({
      sucesso: false,
      motivo: "senha_atual_incorreta",
    });

    // O ponto do teste: a sessão estar aberta não substitui a senha atual, e a recusa não
    // pode ter escrito nada antes de recusar.
    expect(await hashNoBanco(usuario.id)).toBe(usuario.senhaHash);
  });

  it("nova senha fora da política é recusada, mesmo com a senha atual correta", async () => {
    const usuario = await criarColaborador("troca.fraca@teste.local");
    const ctx = { usuarioId: usuario.id, perfil: "ADMIN_INTERNO" as const };

    // "curta" falha em tamanho e em número (RF-032, src/lib/politica-senha.ts).
    expect(await alterarMinhaSenha(ctx, SENHA_ATUAL, "curta")).toEqual({
      sucesso: false,
      motivo: "senha_fraca",
    });

    expect(await hashNoBanco(usuario.id)).toBe(usuario.senhaHash);
  });

  it("quem nunca ativou o acesso não troca senha por aqui — usa o link do convite", async () => {
    const usuario = await criarColaborador("troca.semsenha@teste.local", false);
    const ctx = { usuarioId: usuario.id, perfil: "ADMIN_INTERNO" as const };

    expect(await alterarMinhaSenha(ctx, "", SENHA_NOVA)).toEqual({
      sucesso: false,
      motivo: "sem_senha",
    });

    // Continua sem senha: o caminho de primeiro acesso é o token (RF-030), não este.
    expect(await hashNoBanco(usuario.id)).toBeNull();
  });

  it("a senha de outra pessoa não é alcançada pelo contexto de quem chama", async () => {
    const eu = await criarColaborador("troca.eu@teste.local");
    const outra = await criarColaborador("troca.outra@teste.local");
    const ctx = { usuarioId: eu.id, perfil: "ADMIN_INTERNO" as const };

    await alterarMinhaSenha(ctx, SENHA_ATUAL, SENHA_NOVA);

    // A função só mexe na linha da sessão (ctx.usuarioId); a da outra pessoa fica intacta.
    expect(await hashNoBanco(outra.id)).toBe(outra.senhaHash);
  });
});

describe("RF-042 — editar o próprio nome", () => {
  it("o colaborador grava o próprio nome", async () => {
    const usuario = await criarColaborador("nome.colaborador@teste.local");
    const ctx = { usuarioId: usuario.id, perfil: "ADMIN_INTERNO" as const };

    expect(await atualizarMeuNome(ctx, "  Joana C. Silva  ")).toEqual({ sucesso: true });

    const depois = await ownerDb.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
    expect(depois.nome).toBe("Joana C. Silva");
  });

  it("o Administrador também grava o próprio nome", async () => {
    const admin = await ownerDb.usuario.create({
      data: { nome: "Talita", email: "nome.admin@teste.local", perfil: "ADMIN" },
    });
    const ctx = { usuarioId: admin.id, perfil: "ADMIN" as const };

    expect(await atualizarMeuNome(ctx, "Talita Múltiplus")).toEqual({ sucesso: true });

    const depois = await ownerDb.usuario.findUniqueOrThrow({ where: { id: admin.id } });
    expect(depois.nome).toBe("Talita Múltiplus");
  });

  it("nome em branco é recusado e não apaga o que estava lá", async () => {
    const usuario = await criarColaborador("nome.branco@teste.local");
    const ctx = { usuarioId: usuario.id, perfil: "ADMIN_INTERNO" as const };

    expect(await atualizarMeuNome(ctx, "   ")).toEqual({
      sucesso: false,
      motivo: "nome_obrigatorio",
    });

    const depois = await ownerDb.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
    expect(depois.nome).toBe("Joana Colaboradora");
  });
});
