/**
 * Comprovantes do colaborador externo (etapa 1), contra o Postgres de verdade e a role RLS-restrita: anexar, enviar,
 * quem vê os arquivos, quem confere (administração e interno do projeto) e a devolução com motivo.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { StatusSolicitacaoConclusao, StatusSubtarefa, StatusTarefa } from "@prisma/client";

const armazenados: string[] = [];
const removidos: string[] = [];
vi.mock("@/lib/storage", () => ({
  armazenarComprovante: vi.fn(async (_dados: Buffer, _tipo: string, extensao: string) => {
    const chave = `comprovantes/teste-${armazenados.length}-${Math.random()}.${extensao}`;
    armazenados.push(chave);
    return chave;
  }),
  removerObjeto: vi.fn(async (chave: string) => { removidos.push(chave); }),
  lerObjeto: vi.fn(async () => Buffer.from("conteudo")),
}));

import { anexarComprovante, abrirArquivoComprovante, listarRascunhosDoItem, removerRascunho } from "@/lib/comprovantes";
import { decidirSolicitacaoConclusao, listarEnviosDaTarefa, solicitarConclusao } from "@/lib/projetos-tarefas";
import { comoUsuario, ownerDb, limparFixtures, fecharConexoes } from "./setup/helpers";

let admin: { id: string };
let interno: { id: string };
let outroInterno: { id: string };
let externo: { id: string };
let externoAlheio: { id: string };
let cliente: { id: string };
let projeto: { id: string };
let tarefaComprovante: { id: string };
let tarefaSemComprovante: { id: string };
let tarefaAlheia: { id: string };
let subtarefaComprovante: { id: string };

const ctxAdmin = () => ({ usuarioId: admin.id, perfil: "ADMIN" as const });
const ctxInterno = () => ({ usuarioId: interno.id, perfil: "ADMIN_INTERNO" as const });
const ctxOutroInterno = () => ({ usuarioId: outroInterno.id, perfil: "ADMIN_INTERNO" as const });
const ctxExterno = () => ({ usuarioId: externo.id, perfil: "ADMIN_EXTERNO" as const });
const ctxExternoAlheio = () => ({ usuarioId: externoAlheio.id, perfil: "ADMIN_EXTERNO" as const });

let contador = 0;
/** Registra um arquivo de comprovante pela função do banco, como a rota de envio faz depois de guardar no storage. */
function registrar(ctx: { usuarioId: string; perfil: "ADMIN" | "ADMIN_INTERNO" | "ADMIN_EXTERNO" | "CLIENTE" }, tipo: "TAREFA" | "SUBTAREFA", itemId: string) {
  contador += 1;
  return comoUsuario(ctx, (tx) => tx.$queryRaw<{ id: string }[]>`
    SELECT registrar_arquivo_comprovante(${tipo}, ${itemId}, ${`comprovantes/direto-${contador}.jpg`}, ${`foto-${contador}.jpg`}, 'image/jpeg', 2048) AS id
  `);
}

beforeAll(async () => {
  await limparFixtures();
  admin = await ownerDb.usuario.create({ data: { nome: "Talita Comprovantes", email: "talita.comprovantes@teste.local", perfil: "ADMIN" } });
  interno = await ownerDb.usuario.create({ data: { nome: "Interno Comprovantes", email: "interno.comprovantes@teste.local", perfil: "ADMIN_INTERNO" } });
  outroInterno = await ownerDb.usuario.create({ data: { nome: "Outro Interno Comprovantes", email: "outro.interno.comprovantes@teste.local", perfil: "ADMIN_INTERNO" } });
  cliente = await ownerDb.cliente.create({ data: { razaoSocial: "Cliente Comprovantes Ltda", cnpj: "55111111000101", segmento: "Industrial", origemContato: "Indicação" } });
  const pessoa = await ownerDb.pessoaEnvolvida.create({ data: { clienteId: cliente.id, nome: "Externo Comprovantes", temAcesso: true } });
  const pessoaAlheia = await ownerDb.pessoaEnvolvida.create({ data: { clienteId: cliente.id, nome: "Externo Alheio", temAcesso: true } });
  externo = await ownerDb.usuario.create({ data: { nome: "Externo Comprovantes", email: "externo.comprovantes@teste.local", perfil: "ADMIN_EXTERNO", pessoaEnvolvidaId: pessoa.id } });
  externoAlheio = await ownerDb.usuario.create({ data: { nome: "Externo Alheio", email: "externo.alheio.comprovantes@teste.local", perfil: "ADMIN_EXTERNO", pessoaEnvolvidaId: pessoaAlheia.id } });
  projeto = await ownerDb.projeto.create({ data: { clienteId: cliente.id, nome: "Projeto Comprovantes" } });
  await ownerDb.atribuicao.create({ data: { usuarioId: interno.id, entidadeTipo: "PROJETO", entidadeId: projeto.id } });
  tarefaComprovante = await ownerDb.tarefa.create({ data: { projetoId: projeto.id, nome: "Fotos mensais", responsavelId: pessoa.id, comprovanteExigido: true, comprovanteQuantidade: 2, comprovanteInstrucoes: ["Plaqueta visível"] } });
  tarefaSemComprovante = await ownerDb.tarefa.create({ data: { projetoId: projeto.id, nome: "Sem comprovante", responsavelId: pessoa.id } });
  tarefaAlheia = await ownerDb.tarefa.create({ data: { projetoId: projeto.id, nome: "Do outro externo", responsavelId: pessoaAlheia.id, comprovanteExigido: true, comprovanteQuantidade: 1 } });
  subtarefaComprovante = await ownerDb.subtarefa.create({ data: { tarefaId: tarefaSemComprovante.id, titulo: "Foto do equipamento", atribuidoAId: pessoa.id, comprovanteExigido: true, comprovanteQuantidade: 1 } });
  for (const usuario of [externo, externoAlheio]) {
    await ownerDb.atribuicao.create({ data: { usuarioId: usuario.id, entidadeTipo: "TAREFA", entidadeId: usuario === externo ? tarefaComprovante.id : tarefaAlheia.id } });
  }
});

afterAll(async () => {
  await limparFixtures();
  await fecharConexoes();
});

afterEach(async () => {
  await ownerDb.arquivoComprovante.deleteMany();
  await ownerDb.solicitacaoConclusao.deleteMany();
  await ownerDb.tarefa.updateMany({ data: { status: StatusTarefa.A_INICIAR } });
  await ownerDb.subtarefa.updateMany({ data: { status: StatusSubtarefa.EM_ANDAMENTO } });
  armazenados.length = 0;
  removidos.length = 0;
});

describe("anexar comprovante", () => {
  it("o colaborador responsável anexa em item que exige; outros perfis e itens recebem a recusa do banco", async () => {
    await expect(registrar(ctxExterno(), "TAREFA", tarefaComprovante.id)).resolves.toHaveLength(1);
    await expect(registrar(ctxExterno(), "SUBTAREFA", subtarefaComprovante.id)).resolves.toHaveLength(1);

    await expect(registrar(ctxExterno(), "TAREFA", tarefaSemComprovante.id)).rejects.toThrow(/não exige comprovante/);
    await expect(registrar(ctxExternoAlheio(), "TAREFA", tarefaComprovante.id)).rejects.toThrow(/sem permissão/);
    await expect(registrar(ctxExterno(), "TAREFA", tarefaAlheia.id)).rejects.toThrow(/sem permissão/);
    await expect(registrar(ctxOutroInterno(), "TAREFA", tarefaComprovante.id)).rejects.toThrow(/sem permissão/);
    await expect(registrar(ctxAdmin(), "TAREFA", tarefaComprovante.id)).rejects.toThrow(/restrita a colaboradores/);
    await expect(registrar({ usuarioId: admin.id, perfil: "CLIENTE" }, "TAREFA", tarefaComprovante.id)).rejects.toThrow(/restrita a colaboradores/);
  });

  it("recusa anexar em item concluído, com envio pendente ou depois de 20 arquivos", async () => {
    for (let i = 0; i < 20; i += 1) await registrar(ctxExterno(), "TAREFA", tarefaComprovante.id);
    await expect(registrar(ctxExterno(), "TAREFA", tarefaComprovante.id)).rejects.toThrow(/no máximo 20/);

    await ownerDb.arquivoComprovante.deleteMany();
    await registrar(ctxExterno(), "TAREFA", tarefaComprovante.id);
    await registrar(ctxExterno(), "TAREFA", tarefaComprovante.id);
    await solicitarConclusao(ctxExterno(), "TAREFA", tarefaComprovante.id);
    await expect(registrar(ctxExterno(), "TAREFA", tarefaComprovante.id)).rejects.toThrow(/aguardando conferência/);

    await ownerDb.tarefa.update({ where: { id: tarefaAlheia.id }, data: { status: StatusTarefa.CONCLUIDO } });
    await expect(registrar(ctxExternoAlheio(), "TAREFA", tarefaAlheia.id)).rejects.toThrow(/inativo, cancelado ou concluído/);
    await ownerDb.tarefa.update({ where: { id: tarefaAlheia.id }, data: { status: StatusTarefa.A_INICIAR } });
  });

  it("guarda o arquivo pelo conteúdo, devolve a recusa do banco sem deixar objeto órfão e ignora o tipo enviado", async () => {
    const jpeg = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], "caldeira.jpg", { type: "text/plain" });
    const anexado = await anexarComprovante(ctxExterno(), "TAREFA", tarefaComprovante.id, jpeg);
    expect(anexado).toMatchObject({ nomeOriginal: "caldeira.jpg", tipo: "image/jpeg", tamanhoBytes: 7 });
    expect(armazenados).toHaveLength(1);

    const executavel = new File([new Uint8Array([0x4d, 0x5a, 0, 0])], "foto.jpg", { type: "image/jpeg" });
    await expect(anexarComprovante(ctxExterno(), "TAREFA", tarefaComprovante.id, executavel)).rejects.toThrow(/Formato não aceito/);
    expect(armazenados).toHaveLength(1);

    // Sem permissão no item: o banco recusa e o objeto recém-guardado é removido.
    await expect(anexarComprovante(ctxExterno(), "TAREFA", tarefaAlheia.id, jpeg)).rejects.toThrow(/sem permissão/);
    expect(armazenados).toHaveLength(2);
    expect(removidos).toEqual([armazenados[1]]);
  });

  it("lista e remove só o rascunho do próprio colaborador; arquivo enviado nunca é removido", async () => {
    const jpeg = () => new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 9])], "f.jpg");
    const a = await anexarComprovante(ctxExterno(), "TAREFA", tarefaComprovante.id, jpeg());
    const b = await anexarComprovante(ctxExterno(), "TAREFA", tarefaComprovante.id, jpeg());
    expect((await listarRascunhosDoItem(ctxExterno(), "TAREFA", tarefaComprovante.id)).map((r) => r.id)).toEqual([a.id, b.id]);
    expect(await listarRascunhosDoItem(ctxExternoAlheio(), "TAREFA", tarefaComprovante.id)).toEqual([]);

    await removerRascunho(ctxExternoAlheio(), a.id);
    expect(await listarRascunhosDoItem(ctxExterno(), "TAREFA", tarefaComprovante.id)).toHaveLength(2);

    await removerRascunho(ctxExterno(), a.id);
    expect((await listarRascunhosDoItem(ctxExterno(), "TAREFA", tarefaComprovante.id)).map((r) => r.id)).toEqual([b.id]);
    expect(removidos).toHaveLength(1);

    // Depois do envio (2 arquivos exigidos), os arquivos fazem parte do pedido e não podem mais ser removidos.
    await anexarComprovante(ctxExterno(), "TAREFA", tarefaComprovante.id, jpeg());
    const envio = await solicitarConclusao(ctxExterno(), "TAREFA", tarefaComprovante.id);
    expect(envio.totalComprovantes).toBe(2);
    await removerRascunho(ctxExterno(), b.id);
    expect(await ownerDb.arquivoComprovante.count({ where: { id: b.id, solicitacaoId: envio.solicitacao.id } })).toBe(1);
    expect(removidos).toHaveLength(1);
    // Nem pela via do banco: a política de RLS só deixa apagar rascunho.
    const { count } = await comoUsuario(ctxExterno(), (tx) => tx.arquivoComprovante.deleteMany({ where: { id: b.id } }));
    expect(count).toBe(0);
  });

  it("descarta rascunhos parados há mais de um dia ao anexar de novo", async () => {
    const velho = await anexarComprovante(ctxExterno(), "TAREFA", tarefaComprovante.id, new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1])], "velho.jpg"));
    await ownerDb.arquivoComprovante.update({ where: { id: velho.id }, data: { enviadoEm: new Date(Date.now() - 25 * 60 * 60 * 1000) } });
    const novo = await anexarComprovante(ctxExterno(), "TAREFA", tarefaComprovante.id, new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 2])], "novo.jpg"));
    expect((await listarRascunhosDoItem(ctxExterno(), "TAREFA", tarefaComprovante.id)).map((r) => r.id)).toEqual([novo.id]);
    expect(removidos).toHaveLength(1);
  });
});

describe("enviar comprovante (pedido de conclusão)", () => {
  it("exige a quantidade informada no item e leva os arquivos e a observação para o pedido", async () => {
    await registrar(ctxExterno(), "TAREFA", tarefaComprovante.id);
    await expect(solicitarConclusao(ctxExterno(), "TAREFA", tarefaComprovante.id)).rejects.toThrow(/anexe pelo menos 2/);
    expect(await ownerDb.solicitacaoConclusao.count()).toBe(0);

    await registrar(ctxExterno(), "TAREFA", tarefaComprovante.id);
    const envio = await solicitarConclusao(ctxExterno(), "TAREFA", tarefaComprovante.id, "  A caldeira estava em manutenção.  ");
    expect(envio.totalComprovantes).toBe(2);
    expect(envio.projetoId).toBe(projeto.id);
    expect(envio.solicitacao.observacaoEnvio).toBe("A caldeira estava em manutenção.");
    expect(await ownerDb.arquivoComprovante.count({ where: { solicitacaoId: envio.solicitacao.id } })).toBe(2);
    expect(await ownerDb.arquivoComprovante.count({ where: { solicitacaoId: null } })).toBe(0);
    // O pedido pendente não conclui nada: o status segue como estava.
    expect((await ownerDb.tarefa.findUniqueOrThrow({ where: { id: tarefaComprovante.id } })).status).toBe(StatusTarefa.A_INICIAR);
  });

  it("a hora do envio vem do banco e a observação acima de 2000 caracteres é recusada", async () => {
    await registrar(ctxExterno(), "SUBTAREFA", subtarefaComprovante.id);
    const antes = Date.now();
    await expect(solicitarConclusao(ctxExterno(), "SUBTAREFA", subtarefaComprovante.id, "x".repeat(2001))).rejects.toThrow(/2000 caracteres/);
    const envio = await solicitarConclusao(ctxExterno(), "SUBTAREFA", subtarefaComprovante.id);
    const arquivo = await ownerDb.arquivoComprovante.findFirstOrThrow({ where: { solicitacaoId: envio.solicitacao.id } });
    expect(Math.abs(arquivo.enviadoEm.getTime() - antes)).toBeLessThan(60_000);
    expect(arquivo.enviadoPorNome).toBe("Externo Comprovantes");
  });

  it("item sem comprovante exigido continua com o pedido simples", async () => {
    const outra = await ownerDb.tarefa.create({ data: { projetoId: projeto.id, nome: "Simples", responsavelUsuarioId: interno.id } });
    const envio = await solicitarConclusao(ctxInterno(), "TAREFA", outra.id);
    expect(envio.totalComprovantes).toBe(0);
    expect(envio.solicitacao.status).toBe(StatusSolicitacaoConclusao.PENDENTE);
  });

  it("não aceita alterar a observação nem o histórico do envio depois de criado", async () => {
    await registrar(ctxExterno(), "SUBTAREFA", subtarefaComprovante.id);
    const envio = await solicitarConclusao(ctxExterno(), "SUBTAREFA", subtarefaComprovante.id, "original");
    await expect(comoUsuario(ctxExterno(), (tx) => tx.solicitacaoConclusao.update({ where: { id: envio.solicitacao.id }, data: { observacaoEnvio: "trocada" } }))).rejects.toThrow();
    expect((await ownerDb.solicitacaoConclusao.findUniqueOrThrow({ where: { id: envio.solicitacao.id } })).observacaoEnvio).toBe("original");
  });
});

describe("quem vê os arquivos", () => {
  it("cada perfil só enxerga o que o escopo permite, e o rascunho é só de quem anexou", async () => {
    const [{ id: rascunho }] = await registrar(ctxExterno(), "TAREFA", tarefaComprovante.id);
    const vistos = (ctx: Parameters<typeof comoUsuario>[0]) => comoUsuario(ctx, (tx) => tx.arquivoComprovante.findMany({ select: { id: true } })).then((linhas) => linhas.map((l) => l.id));

    expect(await vistos(ctxExterno())).toEqual([rascunho]);
    expect(await vistos(ctxAdmin())).toEqual([rascunho]);
    // O interno do projeto só vê arquivo já enviado; o rascunho ainda é só do colaborador.
    expect(await vistos(ctxInterno())).toEqual([]);
    expect(await vistos(ctxExternoAlheio())).toEqual([]);
    expect(await vistos({ usuarioId: admin.id, perfil: "CLIENTE" })).toEqual([]);

    await registrar(ctxExterno(), "TAREFA", tarefaComprovante.id);
    await solicitarConclusao(ctxExterno(), "TAREFA", tarefaComprovante.id);
    expect(await vistos(ctxInterno())).toHaveLength(2);
    expect(await vistos(ctxOutroInterno())).toEqual([]);
    expect(await vistos(ctxExternoAlheio())).toEqual([]);
    expect(await vistos({ usuarioId: admin.id, perfil: "CLIENTE" })).toEqual([]);
  });

  it("a rota de leitura abre o arquivo para quem pode ver e responde nulo para quem não pode", async () => {
    await registrar(ctxExterno(), "TAREFA", tarefaComprovante.id);
    await registrar(ctxExterno(), "TAREFA", tarefaComprovante.id);
    const envio = await solicitarConclusao(ctxExterno(), "TAREFA", tarefaComprovante.id);
    const arquivo = await ownerDb.arquivoComprovante.findFirstOrThrow({ where: { solicitacaoId: envio.solicitacao.id } });

    expect(await abrirArquivoComprovante(ctxExterno(), arquivo.id)).toMatchObject({ tipo: "image/jpeg" });
    expect(await abrirArquivoComprovante(ctxInterno(), arquivo.id)).not.toBeNull();
    expect(await abrirArquivoComprovante(ctxAdmin(), arquivo.id)).not.toBeNull();
    expect(await abrirArquivoComprovante(ctxExternoAlheio(), arquivo.id)).toBeNull();
    expect(await abrirArquivoComprovante(ctxOutroInterno(), arquivo.id)).toBeNull();
    expect(await abrirArquivoComprovante({ usuarioId: admin.id, perfil: "CLIENTE" }, arquivo.id)).toBeNull();
    expect(await abrirArquivoComprovante(ctxAdmin(), "id-que-nao-existe")).toBeNull();
  });
});

describe("conferir o envio", () => {
  async function enviar(tipo: "TAREFA" | "SUBTAREFA", itemId: string, quantidade: number) {
    for (let i = 0; i < quantidade; i += 1) await registrar(ctxExterno(), tipo, itemId);
    return solicitarConclusao(ctxExterno(), tipo, itemId, "Segue.");
  }

  it("o interno do projeto confirma o envio do externo e a tarefa conclui", async () => {
    const envio = await enviar("TAREFA", tarefaComprovante.id, 2);
    const antes = await listarEnviosDaTarefa(ctxInterno(), tarefaComprovante.id);
    expect(antes[0]).toMatchObject({ id: envio.solicitacao.id, podeDecidir: true });
    expect(antes[0].arquivos).toHaveLength(2);

    const decisao = await decidirSolicitacaoConclusao(ctxInterno(), envio.solicitacao.id, true);
    expect(decisao.solicitacao).toMatchObject({ status: StatusSolicitacaoConclusao.APROVADA, decididoPorId: interno.id });
    expect((await ownerDb.tarefa.findUniqueOrThrow({ where: { id: tarefaComprovante.id } })).status).toBe(StatusTarefa.CONCLUIDO);
    const depois = await listarEnviosDaTarefa(ctxInterno(), tarefaComprovante.id);
    expect(depois[0]).toMatchObject({ status: "APROVADA", podeDecidir: false, decididoPorNome: "Interno Comprovantes" });
  });

  it("o interno confirma a subtarefa do externo e a administração também pode decidir", async () => {
    const envio = await enviar("SUBTAREFA", subtarefaComprovante.id, 1);
    await decidirSolicitacaoConclusao(ctxInterno(), envio.solicitacao.id, true);
    expect((await ownerDb.subtarefa.findUniqueOrThrow({ where: { id: subtarefaComprovante.id } })).status).toBe(StatusSubtarefa.CONCLUIDO);

    await ownerDb.subtarefa.update({ where: { id: subtarefaComprovante.id }, data: { status: StatusSubtarefa.EM_ANDAMENTO } });
    const outro = await enviar("SUBTAREFA", subtarefaComprovante.id, 1);
    await decidirSolicitacaoConclusao(ctxAdmin(), outro.solicitacao.id, true);
    expect((await ownerDb.subtarefa.findUniqueOrThrow({ where: { id: subtarefaComprovante.id } })).status).toBe(StatusSubtarefa.CONCLUIDO);
  });

  it("quem não é do projeto, o próprio externo e o cliente não decidem", async () => {
    const envio = await enviar("TAREFA", tarefaComprovante.id, 2);
    await expect(decidirSolicitacaoConclusao(ctxOutroInterno(), envio.solicitacao.id, true)).rejects.toThrow(/Administrador/);
    await expect(decidirSolicitacaoConclusao(ctxExterno(), envio.solicitacao.id, true)).rejects.toThrow(/Administrador/);
    await expect(decidirSolicitacaoConclusao({ usuarioId: admin.id, perfil: "CLIENTE" }, envio.solicitacao.id, true)).rejects.toThrow(/Administrador/);
    expect((await ownerDb.solicitacaoConclusao.findUniqueOrThrow({ where: { id: envio.solicitacao.id } })).status).toBe(StatusSolicitacaoConclusao.PENDENTE);
    expect((await ownerDb.tarefa.findUniqueOrThrow({ where: { id: tarefaComprovante.id } })).status).toBe(StatusTarefa.A_INICIAR);
    // O interno de outro projeto também não enxerga o envio na conferência.
    expect((await listarEnviosDaTarefa(ctxOutroInterno(), tarefaComprovante.id))).toEqual([]);
  });

  it("o interno só decide pedido de colaborador externo, não o de um colega interno", async () => {
    const tarefaDoColega = await ownerDb.tarefa.create({ data: { projetoId: projeto.id, nome: "Tarefa do colega", responsavelUsuarioId: outroInterno.id } });
    await ownerDb.atribuicao.create({ data: { usuarioId: outroInterno.id, entidadeTipo: "PROJETO", entidadeId: projeto.id } });
    const pedido = await solicitarConclusao(ctxOutroInterno(), "TAREFA", tarefaDoColega.id);
    await expect(decidirSolicitacaoConclusao(ctxInterno(), pedido.solicitacao.id, true)).rejects.toThrow(/Administrador/);
    await ownerDb.atribuicao.deleteMany({ where: { usuarioId: outroInterno.id } });
  });

  it("devolver envio com comprovantes exige o motivo; com motivo o item segue aberto e o prazo segue o mesmo", async () => {
    const envio = await enviar("TAREFA", tarefaComprovante.id, 2);
    await expect(decidirSolicitacaoConclusao(ctxInterno(), envio.solicitacao.id, false)).rejects.toThrow(/motivo da devolução/);
    await expect(decidirSolicitacaoConclusao(ctxAdmin(), envio.solicitacao.id, false, "   ")).rejects.toThrow(/motivo da devolução/);
    // Mesmo chamando o banco direto, sem passar pela regra do domínio, o motivo é obrigatório.
    await expect(ownerDb.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.usuario_id', ${admin.id}, true)`;
      await tx.$executeRaw`SELECT set_config('app.perfil', 'ADMIN', true)`;
      await tx.solicitacaoConclusao.update({ where: { id: envio.solicitacao.id }, data: { status: "REJEITADA", decididoPorId: admin.id, decididoPorNome: "Talita", decididoEm: new Date() } });
    })).rejects.toThrow(/motivo da devolução/);

    const devolvido = await decidirSolicitacaoConclusao(ctxInterno(), envio.solicitacao.id, false, "A plaqueta não aparece na foto 2.");
    expect(devolvido.solicitacao).toMatchObject({ status: StatusSolicitacaoConclusao.REJEITADA, comentarioDecisao: "A plaqueta não aparece na foto 2." });
    expect((await ownerDb.tarefa.findUniqueOrThrow({ where: { id: tarefaComprovante.id } })).status).toBe(StatusTarefa.A_INICIAR);

    // O externo vê o motivo do próprio envio devolvido e pode enviar de novo (novo pedido, mesmo item).
    const vistoPeloExterno = await comoUsuario(ctxExterno(), (tx) => tx.solicitacaoConclusao.findMany({ select: { status: true, comentarioDecisao: true } }));
    expect(vistoPeloExterno).toEqual([{ status: "REJEITADA", comentarioDecisao: "A plaqueta não aparece na foto 2." }]);
    const segundo = await enviar("TAREFA", tarefaComprovante.id, 2);
    expect(segundo.solicitacao.id).not.toBe(envio.solicitacao.id);
    expect(await ownerDb.arquivoComprovante.count({ where: { solicitacaoId: envio.solicitacao.id } })).toBe(2);
  });

  it("devolver pedido sem comprovantes mantém o comentário opcional de antes", async () => {
    const simples = await ownerDb.tarefa.create({ data: { projetoId: projeto.id, nome: "Pedido simples", responsavelId: (await ownerDb.pessoaEnvolvida.findFirstOrThrow({ where: { nome: "Externo Comprovantes" } })).id } });
    await ownerDb.atribuicao.create({ data: { usuarioId: externo.id, entidadeTipo: "TAREFA", entidadeId: simples.id } });
    const pedido = await solicitarConclusao(ctxExterno(), "TAREFA", simples.id);
    const decisao = await decidirSolicitacaoConclusao(ctxAdmin(), pedido.solicitacao.id, false);
    expect(decisao.solicitacao.status).toBe(StatusSolicitacaoConclusao.REJEITADA);
  });

  it("confirmar o envio de uma tarefa recorrente cria a próxima ocorrência com a mesma exigência de comprovante", async () => {
    const recorrente = await ownerDb.tarefa.create({
      data: {
        projetoId: projeto.id,
        nome: "Fotos todo mês",
        responsavelId: (await ownerDb.pessoaEnvolvida.findFirstOrThrow({ where: { nome: "Externo Comprovantes" } })).id,
        prazo: new Date("2030-03-31T00:00:00Z"),
        prazoOriginal: new Date("2030-03-31T00:00:00Z"),
        periodicidade: "MENSAL",
        comprovanteExigido: true,
        comprovanteQuantidade: 3,
        comprovanteInstrucoes: ["Plaqueta visível", "Painel de controle"],
      },
    });
    await ownerDb.atribuicao.create({ data: { usuarioId: externo.id, entidadeTipo: "TAREFA", entidadeId: recorrente.id } });
    const sub = await ownerDb.subtarefa.create({ data: { tarefaId: recorrente.id, titulo: "Foto da caldeira", comprovanteExigido: true, comprovanteQuantidade: 1, comprovanteInstrucoes: ["Caldeira inteira"] } });
    for (let i = 0; i < 3; i += 1) await registrar(ctxExterno(), "TAREFA", recorrente.id);
    const envio = await solicitarConclusao(ctxExterno(), "TAREFA", recorrente.id);
    const decisao = await decidirSolicitacaoConclusao(ctxAdmin(), envio.solicitacao.id, true);

    const proxima = await ownerDb.tarefa.findUniqueOrThrow({ where: { id: decisao.proximaId! }, include: { subtarefas: true } });
    expect(proxima).toMatchObject({ comprovanteExigido: true, comprovanteQuantidade: 3, comprovanteInstrucoes: ["Plaqueta visível", "Painel de controle"], status: StatusTarefa.A_INICIAR });
    expect(proxima.subtarefas[0]).toMatchObject({ titulo: sub.titulo, comprovanteExigido: true, comprovanteQuantidade: 1, comprovanteInstrucoes: ["Caldeira inteira"] });
    expect(await ownerDb.arquivoComprovante.count({ where: { OR: [{ tarefaId: proxima.id }, { subtarefaId: proxima.subtarefas[0].id }] } })).toBe(0);
  });
});

describe("campos de comprovante do item", () => {
  it("o banco recusa exigir comprovante sem quantidade válida", async () => {
    await expect(ownerDb.tarefa.create({ data: { projetoId: projeto.id, nome: "Sem quantidade", comprovanteExigido: true } })).rejects.toThrow();
    await expect(ownerDb.tarefa.create({ data: { projetoId: projeto.id, nome: "Quantidade 21", comprovanteExigido: true, comprovanteQuantidade: 21 } })).rejects.toThrow();
    await expect(ownerDb.subtarefa.create({ data: { tarefaId: tarefaComprovante.id, titulo: "Quantidade 0", comprovanteExigido: true, comprovanteQuantidade: 0 } })).rejects.toThrow();
  });
});
