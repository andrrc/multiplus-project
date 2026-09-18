/**
 * RF-030, RF-039, RF-040, RF-041, RF-043 — módulo Administração e Acesso.
 *
 * Smoke test dos dois fluxos que a sprint precisa demonstrar para a Talita, ponta a ponta,
 * pelo código real de produção contra o banco de teste:
 *
 *   1. criar usuário → convite por e-mail → definir senha → login → tela inicial do perfil
 *   2. desativar cliente → some da listagem → reativar → volta íntegro
 *
 * Não é teste de UI (ver docs/padrao-testes-por-sprint-multiplus.md, Seção 6): chama os
 * mesmos serviços que as Server Actions chamam.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/email", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/email")>();
  return { ...mod, enviarEmail: vi.fn(async () => {}) };
});

import { ownerDb, limparFixtures, fecharConexoes } from "../integration/setup/helpers";
import { criarUsuarioInterno, gerarLinkConvite, listarUsuarios, reenviarConvite } from "@/lib/usuarios";
import { definirAtivo } from "@/lib/desativacao";
import {
  listarClientes,
  buscarClienteDetalheSeguro,
  criarCliente,
  criarAcessoCliente,
} from "@/lib/clientes";
import { criarAcessoPessoaEnvolvida } from "@/lib/pessoas-envolvidas";
import { validarTokenAcesso, consumirTokenAcesso } from "@/lib/tokens";
import { hashSenha } from "@/lib/senha";
import { autenticarComCredenciais } from "@/server/auth/credentials";
import { telaInicial } from "@/lib/navegacao";
import { PESSOA_VAZIA } from "@/lib/heranca-pessoa";
import { enviarEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const emailMock = vi.mocked(enviarEmail);

function extrairTokenDoEmail(html: string): string {
  const match = html.match(/token=([a-f0-9]+)/);
  if (!match) throw new Error("link de definição de senha não encontrado no corpo do e-mail");
  return match[1];
}

beforeAll(async () => {
  await limparFixtures();
});

afterEach(async () => {
  await limparFixtures();
  vi.clearAllMocks();
});

afterAll(async () => {
  await fecharConexoes();
});

async function criarAdmin(email: string) {
  const admin = await ownerDb.usuario.create({
    data: { nome: "Talita", email, perfil: "ADMIN" },
  });
  return { usuarioId: admin.id, perfil: "ADMIN" as const };
}

describe("criar usuário interno → convite → definir senha → login → tela inicial", () => {
  it("percorre o fluxo inteiro e o colaborador entra vendo só o que lhe foi atribuído", async () => {
    const ctxAdmin = await criarAdmin("talita.smoke-admacesso@teste.local");

    // A Talita cadastra um cliente com um projeto, que é o trabalho a ser atribuído.
    const cliente = await criarCliente(ctxAdmin, {
      tipo: "PESSOA_JURIDICA",
      razaoSocial: "Empreendimento Gama",
      cnpj: "33444555000103",
      segmento: "Indústria",
      origemContato: "Indicação",
      responsavelLegal: { ...PESSOA_VAZIA, nome: "Ana", telefone: "11999990000" },
      pontoContato: { ...PESSOA_VAZIA, nome: "Bruno", telefone: "11988880000" },
      pessoasEnvolvidas: [],
    });
    const projeto = await ownerDb.projeto.create({
      data: { clienteId: cliente.id, nome: "Licenciamento Gama" },
    });

    // 1. Cria o Colaborador Interno já atribuído ao projeto.
    const criacao = await criarUsuarioInterno(ctxAdmin, {
      nome: "Joana Colaboradora",
      email: "joana.smoke-admacesso@teste.local",
      perfil: "ADMIN_INTERNO",
      atribuicoes: [{ entidadeTipo: "PROJETO", entidadeId: projeto.id }],
    });

    expect(criacao.sucesso).toBe(true);
    if (!criacao.sucesso) return;
    expect(criacao.convite).toBe("enviado");

    // 2. A listagem mostra a pessoa como pendente, com a atribuição contada.
    const naListagem = (await listarUsuarios(ctxAdmin)).find((u) => u.id === criacao.usuarioId);
    expect(naListagem?.status).toBe("PENDENTE");
    expect(naListagem?.totalAtribuicoes).toBe(1);

    // 3. Ela recebe o e-mail e define a senha pelo link.
    expect(emailMock).toHaveBeenCalledTimes(1);
    const token = extrairTokenDoEmail(emailMock.mock.calls[0][0].html);

    const validacao = await validarTokenAcesso(token);
    expect(validacao.valido).toBe(true);
    if (!validacao.valido) return;

    await prisma.usuario.update({
      where: { id: validacao.usuarioId },
      data: { senhaHash: await hashSenha("multiplus2026") },
    });
    await consumirTokenAcesso(validacao.tokenId);

    // 4. Entra no sistema com a senha que acabou de definir.
    const autenticada = await autenticarComCredenciais({
      email: "joana.smoke-admacesso@teste.local",
      senha: "multiplus2026",
    });

    expect(autenticada).not.toBeNull();
    expect(autenticada?.perfil).toBe("ADMIN_INTERNO");

    // 5. Cai na tela inicial do próprio perfil (RF-043) e enxerga o projeto atribuído.
    expect(telaInicial(autenticada!.perfil)).toBe("/meus-projetos");

    const ctxJoana = { usuarioId: autenticada!.id, perfil: autenticada!.perfil };
    const clientesQueEnxerga = await listarClientes(ctxJoana);
    expect(clientesQueEnxerga.map((c) => c.id)).toEqual([cliente.id]);

    // 6. E a listagem de usuários agora a mostra como ativa.
    const depois = (await listarUsuarios(ctxAdmin)).find((u) => u.id === criacao.usuarioId);
    expect(depois?.status).toBe("ATIVO");
  });

  it("um colaborador sem atribuição entra e não encontra nada", async () => {
    const ctxAdmin = await criarAdmin("talita.smoke-semvinculo@teste.local");

    await criarCliente(ctxAdmin, {
      tipo: "PESSOA_JURIDICA",
      razaoSocial: "Empreendimento Delta",
      cnpj: "44555666000114",
      segmento: "Indústria",
      origemContato: "Indicação",
      responsavelLegal: { ...PESSOA_VAZIA, nome: "Ana", telefone: "11999990000" },
      pontoContato: { ...PESSOA_VAZIA, nome: "Bruno", telefone: "11988880000" },
      pessoasEnvolvidas: [],
    });

    const criacao = await criarUsuarioInterno(ctxAdmin, {
      nome: "Sem Atribuição",
      email: "semvinculo.smoke@teste.local",
      perfil: "ADMIN_INTERNO",
      atribuicoes: [],
    });
    expect(criacao.sucesso).toBe(true);
    if (!criacao.sucesso) return;

    const ctx = { usuarioId: criacao.usuarioId, perfil: "ADMIN_INTERNO" as const };
    expect(await listarClientes(ctx)).toEqual([]);

    // E a listagem sinaliza isso para a Talita resolver (RF-040).
    const naListagem = (await listarUsuarios(ctxAdmin)).find((u) => u.id === criacao.usuarioId);
    expect(naListagem?.totalAtribuicoes).toBe(0);
  });
});

describe("RF-040 — falha do Resend não impede a criação do usuário", () => {
  it("cria o usuário mesmo com o envio falhando, e o convite pode ser reenviado depois", async () => {
    const ctxAdmin = await criarAdmin("talita.smoke-resend@teste.local");

    emailMock.mockRejectedValueOnce(new Error("Resend indisponível"));

    const criacao = await criarUsuarioInterno(ctxAdmin, {
      nome: "Pessoa Convidada",
      email: "convidada.smoke@teste.local",
      perfil: "ADMIN_EXTERNO",
      atribuicoes: [],
    });

    expect(criacao.sucesso).toBe(true);
    if (!criacao.sucesso) return;

    // O usuário existe: derrubar a criação deixaria o e-mail ocupado por alguém que a
    // Talita não conseguiria mais cadastrar.
    expect(criacao.convite).toBe("falha_no_envio");
    expect(await ownerDb.usuario.findUnique({ where: { id: criacao.usuarioId } })).not.toBeNull();

    // E a ação de reenviar (Tela A1) funciona quando o serviço volta.
    const reenvio = await reenviarConvite(ctxAdmin, criacao.usuarioId);
    expect(reenvio).toEqual({ sucesso: true, convite: "enviado" });
  });

  it("reenviar convite é recusado para quem já definiu a senha", async () => {
    const ctxAdmin = await criarAdmin("talita.smoke-reenvio@teste.local");

    const usuario = await ownerDb.usuario.create({
      data: {
        nome: "Já ativou",
        email: "jaativou.smoke@teste.local",
        perfil: "ADMIN_INTERNO",
        senhaHash: await hashSenha("multiplus2026"),
      },
    });

    expect(await reenviarConvite(ctxAdmin, usuario.id)).toEqual({
      sucesso: false,
      motivo: "ja_ativou",
    });
  });

  it("Talita gera um link manual único quando precisa compartilhar o convite", async () => {
    const ctxAdmin = await criarAdmin("talita.smoke-link-manual@teste.local");
    const usuario = await ownerDb.usuario.create({
      data: { nome: "Convite manual", email: "link.manual@teste.local", perfil: "ADMIN_INTERNO" },
    });

    const primeiro = await gerarLinkConvite(ctxAdmin, usuario.id);
    expect(primeiro.sucesso).toBe(true);
    if (!primeiro.sucesso) return;

    const tokenAnterior = extrairTokenDoEmail(`<a href="${primeiro.link}">link</a>`);
    expect(await validarTokenAcesso(tokenAnterior)).toMatchObject({ valido: true, usuarioId: usuario.id });

    const segundo = await gerarLinkConvite(ctxAdmin, usuario.id);
    expect(segundo.sucesso).toBe(true);
    if (!segundo.sucesso) return;

    expect(await validarTokenAcesso(tokenAnterior)).toEqual({ valido: false, motivo: "ja_usado" });
    const tokenNovo = extrairTokenDoEmail(`<a href="${segundo.link}">link</a>`);
    expect(await validarTokenAcesso(tokenNovo)).toMatchObject({ valido: true, usuarioId: usuario.id });
  });
});

describe("RF-039 — desativar cliente → some da listagem → reativar → volta íntegro", () => {
  it("percorre o ciclo sem perder nenhum dado do cadastro", async () => {
    const ctxAdmin = await criarAdmin("talita.smoke-desativacao@teste.local");

    const cliente = await criarCliente(ctxAdmin, {
      tipo: "PESSOA_JURIDICA",
      razaoSocial: "Empreendimento Épsilon",
      cnpj: "55666777000125",
      segmento: "Indústria",
      origemContato: "Indicação",
      municipio: "Campinas",
      estado: "SP",
      responsavelLegal: { ...PESSOA_VAZIA, nome: "Ana", telefone: "11999990000" },
      pontoContato: { ...PESSOA_VAZIA, nome: "Bruno", telefone: "11988880000" },
      pessoasEnvolvidas: [
        {
          tipo: "PESSOA",
          nome: "Carlos",
          telefone: "11977770000",
          email: "carlos.smoke-desativacao@teste.local",
          temAcesso: false,
        },
      ],
    });

    const antes = await buscarClienteDetalheSeguro(ctxAdmin, cliente.id);
    expect(antes?.pessoasEnvolvidas).toHaveLength(1);

    // Desativa.
    expect(await definirAtivo(ctxAdmin, "cliente", cliente.id, false)).toEqual({ sucesso: true });

    // Some da listagem padrão, mas aparece com o toggle (RF-039).
    expect(await listarClientes(ctxAdmin)).toEqual([]);
    const comToggle = await listarClientes(ctxAdmin, undefined, undefined, true);
    expect(comToggle.map((c) => c.id)).toEqual([cliente.id]);

    // A auditoria registra quem desativou e quando.
    const desativado = await ownerDb.cliente.findUniqueOrThrow({ where: { id: cliente.id } });
    expect(desativado.desativadoPor).toBe(ctxAdmin.usuarioId);
    expect(desativado.desativadoEm).not.toBeNull();

    // Reativa.
    expect(await definirAtivo(ctxAdmin, "cliente", cliente.id, true)).toEqual({ sucesso: true });

    const depois = await buscarClienteDetalheSeguro(ctxAdmin, cliente.id);
    expect(depois?.cliente.razaoSocial).toBe("Empreendimento Épsilon");
    expect(depois?.cliente.municipio).toBe("Campinas");
    expect(depois?.pessoasEnvolvidas).toHaveLength(1);
    expect(depois?.responsavelLegal?.nome).toBe("Ana");
    expect(depois?.pontoContato?.nome).toBe("Bruno");

    const reativado = await ownerDb.cliente.findUniqueOrThrow({ where: { id: cliente.id } });
    expect(reativado.desativadoEm).toBeNull();
    expect(reativado.desativadoPor).toBeNull();

    expect((await listarClientes(ctxAdmin)).map((c) => c.id)).toEqual([cliente.id]);
  });

  it("usuário desativado não consegue mais entrar, e o histórico dele continua no banco", async () => {
    const ctxAdmin = await criarAdmin("talita.smoke-bloqueio@teste.local");

    const usuario = await ownerDb.usuario.create({
      data: {
        nome: "Colaborador",
        email: "colaborador.smoke-bloqueio@teste.local",
        perfil: "ADMIN_INTERNO",
        senhaHash: await hashSenha("multiplus2026"),
      },
    });

    expect(
      await autenticarComCredenciais({
        email: "colaborador.smoke-bloqueio@teste.local",
        senha: "multiplus2026",
      }),
    ).not.toBeNull();

    expect(await definirAtivo(ctxAdmin, "usuario", usuario.id, false)).toEqual({ sucesso: true });

    expect(
      await autenticarComCredenciais({
        email: "colaborador.smoke-bloqueio@teste.local",
        senha: "multiplus2026",
      }),
    ).toBeNull();

    // Desativar nunca apaga: o registro continua lá, com o histórico atrelado a ele.
    expect(await ownerDb.usuario.findUnique({ where: { id: usuario.id } })).not.toBeNull();
  });

  it("cliente desativado não aceita criação de acesso, e nenhum e-mail é disparado", async () => {
    const ctxAdmin = await criarAdmin("talita.smoke-acessodesativado@teste.local");

    const cliente = await criarCliente(ctxAdmin, {
      tipo: "PESSOA_JURIDICA",
      razaoSocial: "Empreendimento Zeta",
      cnpj: "66777888000136",
      segmento: "Indústria",
      origemContato: "Indicação",
      responsavelLegal: { ...PESSOA_VAZIA, nome: "Ana", telefone: "11999990000" },
      pontoContato: {
        ...PESSOA_VAZIA,
        nome: "Bruno",
        telefone: "11988880000",
        email: "bruno.smoke-acessodesativado@teste.local",
      },
      pessoasEnvolvidas: [
        {
          tipo: "PESSOA",
          nome: "Carlos",
          telefone: "11977770000",
          email: "carlos.smoke-acessodesativado@teste.local",
          temAcesso: false,
        },
      ],
    });

    const detalhe = await buscarClienteDetalheSeguro(ctxAdmin, cliente.id);
    const pessoaId = detalhe!.pessoasEnvolvidas[0].id;

    expect(await definirAtivo(ctxAdmin, "cliente", cliente.id, false)).toEqual({ sucesso: true });
    emailMock.mockClear();

    // Antes desta correção os dois caminhos passavam: o bloco "Acesso do cliente" não era
    // condicionado a cliente.ativo, e os dois serviços rodam na role dona, então a herança da
    // RLS não os alcançava. Resultado: nascia um Usuario e saía e-mail de definição de senha
    // para um cadastro que acabou de sair do ar.
    expect(await criarAcessoCliente(cliente.id)).toEqual({
      sucesso: false,
      motivo: "cliente_desativado",
    });
    expect(await criarAcessoPessoaEnvolvida(pessoaId)).toEqual({
      sucesso: false,
      motivo: "cliente_desativado",
    });

    expect(emailMock).not.toHaveBeenCalled();
    expect(await ownerDb.usuario.findUnique({ where: { id: cliente.id } })).toBeNull();
    expect(
      await ownerDb.usuario.findUnique({
        where: { email: "bruno.smoke-acessodesativado@teste.local" },
      }),
    ).toBeNull();
    expect(
      await ownerDb.usuario.findUnique({
        where: { email: "carlos.smoke-acessodesativado@teste.local" },
      }),
    ).toBeNull();

    // A pessoa envolvida não fica marcada como tendo acesso por uma tentativa recusada.
    const pessoa = await ownerDb.pessoaEnvolvida.findUniqueOrThrow({ where: { id: pessoaId } });
    expect(pessoa.temAcesso).toBe(false);

    // Reativar devolve o caminho: o mesmo serviço, no mesmo cliente, agora cria o acesso.
    expect(await definirAtivo(ctxAdmin, "cliente", cliente.id, true)).toEqual({ sucesso: true });
    expect(await criarAcessoCliente(cliente.id)).toEqual({ sucesso: true, convite: "enviado" });
    expect(emailMock).toHaveBeenCalledTimes(1);
  });

  it("a Talita não consegue desativar o próprio acesso", async () => {
    const ctxAdmin = await criarAdmin("talita.smoke-autodesativacao@teste.local");

    expect(await definirAtivo(ctxAdmin, "usuario", ctxAdmin.usuarioId, false)).toEqual({
      sucesso: false,
      motivo: "auto_desativacao",
    });

    const talita = await ownerDb.usuario.findUniqueOrThrow({ where: { id: ctxAdmin.usuarioId } });
    expect(talita.ativo).toBe(true);
  });
});
