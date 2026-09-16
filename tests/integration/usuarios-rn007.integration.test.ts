/**
 * RF-040, RF-041, RF-042; RN-005, RN-007 — permissões de usuário e atribuição.
 *
 * Testa no serviço (src/lib/usuarios.ts), que é o que as Server Actions chamam, e também
 * direto na RLS — o plano da sprint é explícito em querer isso testado no endpoint e não
 * na UI, porque esconder o botão não é permissão.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/email", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/email")>();
  return { ...mod, enviarEmail: vi.fn(async () => {}) };
});

import { ownerDb, comoUsuario, limparFixtures, fecharConexoes } from "./setup/helpers";
import {
  adicionarAtribuicao,
  atualizarUsuario,
  criarUsuarioInterno,
  listarAtribuicoesDetalhadas,
  listarUsuarios,
  removerAtribuicao,
} from "@/lib/usuarios";

type Fixture = Awaited<ReturnType<typeof montarFixture>>;

async function montarFixture() {
  const admin = await ownerDb.usuario.create({
    data: { nome: "Talita", email: "talita.rn007@teste.local", perfil: "ADMIN" },
  });
  const interno = await ownerDb.usuario.create({
    data: { nome: "Interno", email: "interno.rn007@teste.local", perfil: "ADMIN_INTERNO" },
  });

  const cliente = await ownerDb.cliente.create({
    data: {
      tipo: "PESSOA_JURIDICA",
      razaoSocial: "Empreendimento Beta",
      cnpj: "22333444000192",
      segmento: "Indústria",
      origemContato: "Indicação",
    },
  });
  const projeto = await ownerDb.projeto.create({
    data: { clienteId: cliente.id, nome: "Licenciamento Beta" },
  });
  const tarefa = await ownerDb.tarefa.create({
    data: { projetoId: projeto.id, nome: "Protocolar LO" },
  });

  return {
    ctxAdmin: { usuarioId: admin.id, perfil: "ADMIN" as const },
    ctxInterno: { usuarioId: interno.id, perfil: "ADMIN_INTERNO" as const },
    adminId: admin.id,
    internoId: interno.id,
    clienteId: cliente.id,
    projetoId: projeto.id,
    tarefaId: tarefa.id,
  };
}

let f: Fixture;

beforeEach(async () => {
  await limparFixtures();
  f = await montarFixture();
});

afterEach(async () => {
  await limparFixtures();
  vi.clearAllMocks();
});

afterAll(async () => {
  await fecharConexoes();
});

describe("RN-007 — leitura de usuários é só do Administrador", () => {
  it("o Administrador lista os usuários internos", async () => {
    const usuarios = await listarUsuarios(f.ctxAdmin);
    expect(usuarios.map((u) => u.email)).toEqual(
      expect.arrayContaining(["talita.rn007@teste.local", "interno.rn007@teste.local"]),
    );
  });

  it("o Colaborador Interno não lista ninguém pelo serviço", async () => {
    expect(await listarUsuarios(f.ctxInterno)).toEqual([]);
  });

  it("e a RLS também não devolve outros usuários a ele, nem passando por fora do serviço", async () => {
    const pelaRls = await comoUsuario(f.ctxInterno, (tx) => tx.usuario.findMany());

    // A política permite ao usuário ver a própria linha — e só ela.
    expect(pelaRls).toHaveLength(1);
    expect(pelaRls[0]?.id).toBe(f.internoId);
  });

  it("o perfil CLIENTE fica fora da listagem de usuários internos", async () => {
    await ownerDb.usuario.create({
      data: {
        nome: "Cliente",
        email: "cliente.rn007@teste.local",
        perfil: "CLIENTE",
        clienteId: f.clienteId,
      },
    });

    const emails = (await listarUsuarios(f.ctxAdmin)).map((u) => u.email);
    expect(emails).not.toContain("cliente.rn007@teste.local");
  });
});

describe("RN-007 — escrita em Usuario e Atribuicao é só do Administrador", () => {
  it("o serviço recusa criação de usuário por Colaborador Interno", async () => {
    const resultado = await criarUsuarioInterno(f.ctxInterno, {
      nome: "Intruso",
      email: "intruso.rn007@teste.local",
      perfil: "ADMIN_INTERNO",
      atribuicoes: [],
    });

    expect(resultado).toEqual({ sucesso: false, motivo: "sem_permissao" });
    expect(await ownerDb.usuario.findUnique({ where: { email: "intruso.rn007@teste.local" } })).toBeNull();
  });

  it("o serviço recusa edição de usuário por Colaborador Interno", async () => {
    const resultado = await atualizarUsuario(f.ctxInterno, f.adminId, {
      nome: "Talita alterada",
      email: "talita.rn007@teste.local",
      perfil: "ADMIN",
    });

    expect(resultado).toEqual({ sucesso: false, motivo: "sem_permissao" });
  });

  it("a RLS recusa a escrita direta em usuarios, sem passar pelo serviço", async () => {
    const { count } = await comoUsuario(f.ctxInterno, (tx) =>
      tx.usuario.updateMany({ where: { id: f.internoId }, data: { perfil: "ADMIN" } }),
    );

    expect(count).toBe(0);
  });

  it("a RLS recusa a escrita direta em atribuicoes", async () => {
    await expect(
      comoUsuario(f.ctxInterno, (tx) =>
        tx.atribuicao.create({
          data: { usuarioId: f.internoId, entidadeTipo: "PROJETO", entidadeId: f.projetoId },
        }),
      ),
    ).rejects.toThrow();
  });

  it("o serviço recusa atribuição feita por quem não é Administrador", async () => {
    const resultado = await adicionarAtribuicao(f.ctxInterno, f.internoId, {
      entidadeTipo: "PROJETO",
      entidadeId: f.projetoId,
    });

    expect(resultado).toEqual({ sucesso: false, motivo: "sem_permissao" });
  });
});

describe("RN-005 — granularidade da atribuição", () => {
  it("recusa atribuir tarefa a Colaborador Interno", async () => {
    const resultado = await adicionarAtribuicao(f.ctxAdmin, f.internoId, {
      entidadeTipo: "TAREFA",
      entidadeId: f.tarefaId,
    });

    expect(resultado).toEqual({ sucesso: false, motivo: "incompativel_com_perfil" });
  });

  it("recusa criar usuário com atribuição da granularidade errada", async () => {
    const resultado = await criarUsuarioInterno(f.ctxAdmin, {
      nome: "Externo",
      email: "externo.rn007@teste.local",
      perfil: "ADMIN_EXTERNO",
      atribuicoes: [{ entidadeTipo: "PROJETO", entidadeId: f.projetoId }],
    });

    expect(resultado).toEqual({ sucesso: false, motivo: "atribuicao_incompativel" });
  });

  it("recusa atribuição para Administrador, que enxerga tudo sem atribuição", async () => {
    const resultado = await criarUsuarioInterno(f.ctxAdmin, {
      nome: "Outro admin",
      email: "outroadmin.rn007@teste.local",
      perfil: "ADMIN",
      atribuicoes: [{ entidadeTipo: "PROJETO", entidadeId: f.projetoId }],
    });

    expect(resultado).toEqual({ sucesso: false, motivo: "atribuicao_incompativel" });
  });

  it("trocar o perfil remove as atribuições que não valem mais na nova granularidade", async () => {
    await adicionarAtribuicao(f.ctxAdmin, f.internoId, {
      entidadeTipo: "PROJETO",
      entidadeId: f.projetoId,
    });

    const resultado = await atualizarUsuario(f.ctxAdmin, f.internoId, {
      nome: "Interno",
      email: "interno.rn007@teste.local",
      perfil: "ADMIN_EXTERNO",
    });

    expect(resultado).toEqual({ sucesso: true, atribuicoesRemovidas: 1 });
    expect(await ownerDb.atribuicao.count({ where: { usuarioId: f.internoId } })).toBe(0);
  });
});

describe("RF-040 — e-mail único", () => {
  it("recusa e-mail já cadastrado, sem criar o usuário", async () => {
    const resultado = await criarUsuarioInterno(f.ctxAdmin, {
      nome: "Duplicado",
      email: "interno.rn007@teste.local",
      perfil: "ADMIN_INTERNO",
      atribuicoes: [],
    });

    expect(resultado).toEqual({ sucesso: false, motivo: "email_duplicado" });
    expect(await ownerDb.usuario.count({ where: { email: "interno.rn007@teste.local" } })).toBe(1);
  });

  it("normaliza o e-mail para minúsculas, para o duplicado não escapar pela caixa", async () => {
    const resultado = await criarUsuarioInterno(f.ctxAdmin, {
      nome: "Maiúsculo",
      email: "INTERNO.RN007@TESTE.LOCAL",
      perfil: "ADMIN_INTERNO",
      atribuicoes: [],
    });

    expect(resultado).toEqual({ sucesso: false, motivo: "email_duplicado" });
  });
});

describe("RF-030/RF-040 — campos de cadastro", () => {
  it("grava cargo, telefone, CPF e observações, com CPF sem máscara", async () => {
    const resultado = await criarUsuarioInterno(f.ctxAdmin, {
      nome: "Bióloga",
      email: "biologa.cadastro@teste.local",
      perfil: "ADMIN_INTERNO",
      atribuicoes: [],
      cargo: "Bióloga",
      telefone: "(19) 99999-0000",
      cpf: "111.444.777-35",
      observacoes: "Responsável pelos laudos de fauna.",
    });

    expect(resultado.sucesso).toBe(true);
    if (!resultado.sucesso) return;

    const usuario = await ownerDb.usuario.findUniqueOrThrow({
      where: { id: resultado.usuarioId },
    });
    expect(usuario.cargo).toBe("Bióloga");
    expect(usuario.telefone).toBe("(19) 99999-0000");
    expect(usuario.cpf).toBe("11144477735");
    expect(usuario.cnpj).toBeNull();
    expect(usuario.observacoes).toBe("Responsável pelos laudos de fauna.");
  });

  it("campo em branco vira NULL, não string vazia", async () => {
    const resultado = await criarUsuarioInterno(f.ctxAdmin, {
      nome: "Sem extras",
      email: "semextras.cadastro@teste.local",
      perfil: "ADMIN_INTERNO",
      atribuicoes: [],
      cargo: "   ",
      telefone: "",
      cpf: "",
      observacoes: "",
    });

    expect(resultado.sucesso).toBe(true);
    if (!resultado.sucesso) return;

    const usuario = await ownerDb.usuario.findUniqueOrThrow({
      where: { id: resultado.usuarioId },
    });
    expect(usuario.cargo).toBeNull();
    expect(usuario.telefone).toBeNull();
    expect(usuario.cpf).toBeNull();
    expect(usuario.observacoes).toBeNull();
  });

  it("aceita CNPJ para colaborador pessoa jurídica", async () => {
    const resultado = await criarUsuarioInterno(f.ctxAdmin, {
      nome: "Consultoria Terceirizada",
      email: "consultoria.cadastro@teste.local",
      perfil: "ADMIN_EXTERNO",
      atribuicoes: [],
      cnpj: "11.222.333/0001-81",
    });

    expect(resultado.sucesso).toBe(true);
    if (!resultado.sucesso) return;

    const usuario = await ownerDb.usuario.findUniqueOrThrow({
      where: { id: resultado.usuarioId },
    });
    expect(usuario.cnpj).toBe("11222333000181");
    expect(usuario.cpf).toBeNull();
  });

  it("recusa CPF e CNPJ inválidos, sem criar o usuário", async () => {
    const comCpfRuim = await criarUsuarioInterno(f.ctxAdmin, {
      nome: "CPF ruim",
      email: "cpfruim.cadastro@teste.local",
      perfil: "ADMIN_INTERNO",
      atribuicoes: [],
      cpf: "111.111.111-11",
    });
    expect(comCpfRuim).toEqual({ sucesso: false, motivo: "cpf_invalido" });

    const comCnpjRuim = await criarUsuarioInterno(f.ctxAdmin, {
      nome: "CNPJ ruim",
      email: "cnpjruim.cadastro@teste.local",
      perfil: "ADMIN_EXTERNO",
      atribuicoes: [],
      cnpj: "11.111.111/1111-11",
    });
    expect(comCnpjRuim).toEqual({ sucesso: false, motivo: "cnpj_invalido" });

    expect(
      await ownerDb.usuario.count({
        where: { email: { in: ["cpfruim.cadastro@teste.local", "cnpjruim.cadastro@teste.local"] } },
      }),
    ).toBe(0);
  });

  it("recusa CPF e CNPJ preenchidos ao mesmo tempo", async () => {
    const resultado = await criarUsuarioInterno(f.ctxAdmin, {
      nome: "Os dois",
      email: "osdois.cadastro@teste.local",
      perfil: "ADMIN_INTERNO",
      atribuicoes: [],
      cpf: "111.444.777-35",
      cnpj: "11.222.333/0001-81",
    });

    expect(resultado).toEqual({ sucesso: false, motivo: "cpf_e_cnpj" });
  });

  it("apagar um campo na edição limpa a coluna, em vez de manter o valor antigo", async () => {
    const criacao = await criarUsuarioInterno(f.ctxAdmin, {
      nome: "Com cargo",
      email: "comcargo.cadastro@teste.local",
      perfil: "ADMIN_INTERNO",
      atribuicoes: [],
      cargo: "Estagiário",
      telefone: "(19) 98888-0000",
    });
    expect(criacao.sucesso).toBe(true);
    if (!criacao.sucesso) return;

    // Caso-limite que o `undefined` do Prisma esconderia: sem tratar, o campo esvaziado no
    // formulário voltaria preenchido depois de salvar.
    await atualizarUsuario(f.ctxAdmin, criacao.usuarioId, {
      nome: "Com cargo",
      email: "comcargo.cadastro@teste.local",
      perfil: "ADMIN_INTERNO",
      cargo: "",
      telefone: "",
    });

    const usuario = await ownerDb.usuario.findUniqueOrThrow({
      where: { id: criacao.usuarioId },
    });
    expect(usuario.cargo).toBeNull();
    expect(usuario.telefone).toBeNull();
  });

  it("a busca da listagem alcança o cargo, não só nome e e-mail", async () => {
    await criarUsuarioInterno(f.ctxAdmin, {
      nome: "Pessoa Qualquer",
      email: "qualquer.cadastro@teste.local",
      perfil: "ADMIN_INTERNO",
      atribuicoes: [],
      cargo: "Engenheira Ambiental",
    });

    const achados = await listarUsuarios(f.ctxAdmin, { busca: "Engenheira" });
    expect(achados.map((u) => u.email)).toEqual(["qualquer.cadastro@teste.local"]);
    expect(achados[0].cargo).toBe("Engenheira Ambiental");
  });
});

describe("RF-041 / RN-006 — origem da atribuição", () => {
  it("atribuição manual pode ser removida", async () => {
    await adicionarAtribuicao(f.ctxAdmin, f.internoId, {
      entidadeTipo: "PROJETO",
      entidadeId: f.projetoId,
    });

    const [atribuicao] = await listarAtribuicoesDetalhadas(f.ctxAdmin, f.internoId);
    expect(atribuicao.origem).toBe("MANUAL");

    expect(await removerAtribuicao(f.ctxAdmin, atribuicao.id)).toEqual({ sucesso: true });
    expect(await ownerDb.atribuicao.count({ where: { usuarioId: f.internoId } })).toBe(0);
  });

  it("atribuição vinda de ser responsável pela tarefa é marcada como automática e não pode ser removida", async () => {
    const pessoa = await ownerDb.pessoaEnvolvida.create({
      data: {
        clienteId: f.clienteId,
        nome: "Carlos",
        email: "carlos.rn007@teste.local",
        temAcesso: true,
      },
    });
    const externo = await ownerDb.usuario.create({
      data: {
        nome: "Carlos",
        email: "carlos.rn007@teste.local",
        perfil: "ADMIN_EXTERNO",
        pessoaEnvolvidaId: pessoa.id,
      },
    });
    await ownerDb.tarefa.update({
      where: { id: f.tarefaId },
      data: { responsavelId: pessoa.id },
    });
    await ownerDb.atribuicao.create({
      data: { usuarioId: externo.id, entidadeTipo: "TAREFA", entidadeId: f.tarefaId },
    });

    const [atribuicao] = await listarAtribuicoesDetalhadas(f.ctxAdmin, externo.id);
    expect(atribuicao.origem).toBe("AUTOMATICA");

    expect(await removerAtribuicao(f.ctxAdmin, atribuicao.id)).toEqual({
      sucesso: false,
      motivo: "automatica",
    });
    expect(await ownerDb.atribuicao.count({ where: { usuarioId: externo.id } })).toBe(1);
  });

  it("caso-limite: usuário sem Pessoa Envolvida em tarefa sem responsável é MANUAL, não automática", async () => {
    // Os dois lados são NULL aqui. Em JS `null === null` é verdadeiro, então sem o guard
    // explícito de `!= null` esta atribuição viraria "automática" e ficaria impossível de
    // remover — a versão em JS do bug de NULL corrigido na trigger da RN-004.
    const externo = await ownerDb.usuario.create({
      data: { nome: "Externo", email: "externo.semvinculo@teste.local", perfil: "ADMIN_EXTERNO" },
    });
    await ownerDb.atribuicao.create({
      data: { usuarioId: externo.id, entidadeTipo: "TAREFA", entidadeId: f.tarefaId },
    });

    const [atribuicao] = await listarAtribuicoesDetalhadas(f.ctxAdmin, externo.id);
    expect(atribuicao.origem).toBe("MANUAL");
    expect(await removerAtribuicao(f.ctxAdmin, atribuicao.id)).toEqual({ sucesso: true });
  });
});

describe("RF-042 — cada um enxerga as próprias atribuições", () => {
  it("o usuário lê as próprias atribuições", async () => {
    await adicionarAtribuicao(f.ctxAdmin, f.internoId, {
      entidadeTipo: "PROJETO",
      entidadeId: f.projetoId,
    });

    const minhas = await listarAtribuicoesDetalhadas(f.ctxInterno, f.internoId);
    expect(minhas).toHaveLength(1);
    expect(minhas[0].entidadeNome).toBe("Licenciamento Beta");
  });

  it("mas não lê as de outra pessoa", async () => {
    const outro = await ownerDb.usuario.create({
      data: { nome: "Outro", email: "outro.rn007@teste.local", perfil: "ADMIN_INTERNO" },
    });
    await adicionarAtribuicao(f.ctxAdmin, outro.id, {
      entidadeTipo: "PROJETO",
      entidadeId: f.projetoId,
    });

    expect(await listarAtribuicoesDetalhadas(f.ctxInterno, outro.id)).toEqual([]);
  });
});

describe("RF-041 — usuário sem atribuição não enxerga nada ao entrar", () => {
  it("um Colaborador Interno recém-criado não vê cliente, projeto nem tarefa", async () => {
    const resultado = await criarUsuarioInterno(f.ctxAdmin, {
      nome: "Recém-criado",
      email: "recem.rn007@teste.local",
      perfil: "ADMIN_INTERNO",
      atribuicoes: [],
    });
    expect(resultado.sucesso).toBe(true);
    if (!resultado.sucesso) return;

    const ctx = { usuarioId: resultado.usuarioId, perfil: "ADMIN_INTERNO" as const };

    expect(await comoUsuario(ctx, (tx) => tx.cliente.findMany())).toEqual([]);
    expect(await comoUsuario(ctx, (tx) => tx.projeto.findMany())).toEqual([]);
    expect(await comoUsuario(ctx, (tx) => tx.tarefa.findMany())).toEqual([]);
    expect(await comoUsuario(ctx, (tx) => tx.documento.findMany())).toEqual([]);
  });

  it("e passa a enxergar exatamente o projeto atribuído, depois da atribuição", async () => {
    await adicionarAtribuicao(f.ctxAdmin, f.internoId, {
      entidadeTipo: "PROJETO",
      entidadeId: f.projetoId,
    });

    const projetos = await comoUsuario(f.ctxInterno, (tx) => tx.projeto.findMany());
    expect(projetos).toHaveLength(1);
    expect(projetos[0].id).toBe(f.projetoId);
  });
});
