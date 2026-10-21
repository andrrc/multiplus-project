/** RF-051 / RF-039 — privacidade, vínculo, transação, concorrência e histórico real no Postgres. */
import { beforeEach, afterAll, describe, it, expect } from "vitest";
import { ownerDb, comoUsuario, limparFixtures, fecharConexoes } from "./setup/helpers";
import { criarCliente, atualizarCliente, listarClientes, buscarClienteContextual } from "@/lib/clientes";
import { buscarLaudoTecnico, salvarAnotacaoLaudo, listarAnotacoesLaudo, definirAnotacaoLaudoAtiva } from "@/lib/laudos-tecnicos";
import type { ContextoUsuario } from "@/lib/prisma-app";
import { buscarProjetoPortal, listarProjetosPortal } from "@/lib/portal-cliente";

let admin: ContextoUsuario;
let interno: ContextoUsuario;
let externos: ContextoUsuario[];
let clienteId: string;
let laudoId: string;
const dadosPF = { tipo: "PESSOA_FISICA" as const, nome: "Maria", cpf: "52998224725", segmento: "", origemContato: "", pessoasEnvolvidas: [] };
beforeEach(async () => {
  await limparFixtures();
  const a = await ownerDb.usuario.create({ data: { nome: "Talita", email: "laudo-admin@teste.local", perfil: "ADMIN" } });
  const i = await ownerDb.usuario.create({ data: { nome: "Interno", email: "laudo-interno@teste.local", perfil: "ADMIN_INTERNO" } });
  admin = { usuarioId: a.id, perfil: "ADMIN" };
  interno = { usuarioId: i.id, perfil: "ADMIN_INTERNO" };
  const cliente = await criarCliente(admin, { ...dadosPF, laudoTecnico: { possui: true, nome: "Laudo inicial", tipo: "RURAL", responsavelId: i.id } });
  clienteId = cliente.id;
  laudoId = (await buscarLaudoTecnico(admin, clienteId))!.id;
  externos = [];
  for (const perfil of ["ADMIN_EXTERNO", "CLIENTE"] as const) {
    const u = await ownerDb.usuario.create({ data: { nome: perfil, email: `laudo-${perfil}@teste.local`, perfil, clienteId: perfil === "CLIENTE" ? clienteId : null } });
    externos.push({ usuarioId: u.id, perfil });
  }
});
afterAll(async () => { await limparFixtures(); await fecharConexoes(); });

describe("RF-051 — segurança e persistência", () => {
  it("ADMIN consulta; todos os demais, inclusive responsável, não leem nem escrevem", async () => {
    const nota = await salvarAnotacaoLaudo(admin, clienteId, laudoId, { texto: "Privado", links: ["https://drive.google.com/segredo"] });
    expect((await buscarLaudoTecnico(admin, clienteId))?.nome).toBe("Laudo inicial");
    for (const ctx of [interno, ...externos]) {
      await expect(buscarLaudoTecnico(ctx, clienteId)).rejects.toThrow(/RF-051/);
      await expect(salvarAnotacaoLaudo(ctx, clienteId, laudoId, { texto: "X", links: [] })).rejects.toThrow(/RF-051/);
      await expect(listarClientes(ctx, undefined, undefined, false, "sem")).rejects.toThrow(/RF-051/);
      expect(await comoUsuario(ctx, (tx) => tx.laudoTecnico.findMany())).toEqual([]);
      expect(await comoUsuario(ctx, (tx) => tx.anotacaoLaudoTecnico.findMany())).toEqual([]);
      expect(await comoUsuario(ctx, (tx) => tx.linkAnotacaoLaudoTecnico.findMany())).toEqual([]);
      await expect(comoUsuario(ctx, (tx) => tx.anotacaoLaudoTecnico.create({ data: { laudoId, autorId: ctx.usuarioId, texto: "X" } }))).rejects.toThrow(/row-level security|Laudo|laudo/);
      expect((await comoUsuario(ctx, (tx) => tx.anotacaoLaudoTecnico.updateMany({ where: { id: nota.id }, data: { texto: "Invadido" } }))).count).toBe(0);
    }
    expect(await ownerDb.atribuicao.count()).toBe(0);
    expect(await ownerDb.notificacao.count()).toBe(0);
    const projeto = await ownerDb.projeto.create({ data: { clienteId, nome: "Projeto" } });
    await ownerDb.atribuicao.create({ data: { usuarioId: interno.usuarioId, entidadeTipo: "PROJETO", entidadeId: projeto.id } });
    const contextual = await buscarClienteContextual(interno, clienteId);
    expect(contextual?.id).toBe(clienteId);
    expect(contextual).not.toHaveProperty("laudoTecnico");
    expect(JSON.stringify(contextual)).not.toContain("segredo");
    const portal = await buscarProjetoPortal(externos[1], projeto.id);
    expect(portal?.id).toBe(projeto.id);
    expect(JSON.stringify(portal)).not.toContain("segredo");
    expect(JSON.stringify(await listarProjetosPortal(externos[1]))).not.toContain("laudo");
  });
  it("salva cliente/laudo atomicamente e omissão na edição preserva o laudo", async () => {
    await expect(criarCliente(admin, { ...dadosPF, cpf: "11144477735", laudoTecnico: { possui: true, nome: "X", tipo: "RURAL", responsavelId: externos[0].usuarioId } })).rejects.toThrow(/equipe interna/);
    expect(await ownerDb.cliente.count()).toBe(1);
    await atualizarCliente(admin, clienteId, { tipo: "PESSOA_FISICA", nome: "Maria editada", segmento: "", origemContato: "" });
    expect((await buscarLaudoTecnico(admin, clienteId))?.versao).toBe(1);
    await expect(atualizarCliente(admin, clienteId, { tipo: "PESSOA_FISICA", nome: "Não salvar", segmento: "", origemContato: "", laudoTecnico: { possui: true, nome: "X", tipo: "RURAL", responsavelId: "ausente", versao: 1 } })).rejects.toThrow(/equipe interna/);
    expect((await ownerDb.cliente.findUniqueOrThrow({ where: { id: clienteId } })).razaoSocial).toBe("Maria editada");
  });
  it("recusa troca de cliente/anotação, autor forjado e versão obsoleta", async () => {
    const nota = await salvarAnotacaoLaudo(admin, clienteId, laudoId, { texto: "Original", links: [] });
    await expect(salvarAnotacaoLaudo(admin, "outro", laudoId, { texto: "X", links: [] }, nota.id, 1)).rejects.toThrow(/Laudo não encontrado/);
    await salvarAnotacaoLaudo(admin, clienteId, laudoId, { texto: "Nova", links: [] }, nota.id, 1);
    await expect(salvarAnotacaoLaudo(admin, clienteId, laudoId, { texto: "Perdida", links: [] }, nota.id, 1)).rejects.toThrow(/outra sessão/);
    await expect(comoUsuario(admin, (tx) => tx.anotacaoLaudoTecnico.create({ data: { laudoId, texto: "Forjada", autorId: interno.usuarioId } }))).rejects.toThrow(/Autor ou versão/);
    expect((await ownerDb.anotacaoLaudoTecnico.findUniqueOrThrow({ where: { id: nota.id } })).texto).toBe("Nova");
  });
  it("preserva inatividade individual e bloqueia escrita direta em ascendentes desativados", async () => {
    const nota = await salvarAnotacaoLaudo(admin, clienteId, laudoId, { texto: "A", links: [] });
    await definirAnotacaoLaudoAtiva(admin, clienteId, laudoId, nota.id, 1, false);
    await expect(salvarAnotacaoLaudo(admin, clienteId, laudoId, { texto: "X", links: [] }, nota.id, 2)).rejects.toThrow(/Anotação desativada/);
    const editar = (possui: boolean, versao: number) => atualizarCliente(admin, clienteId, { tipo: "PESSOA_FISICA", nome: "Maria", segmento: "", origemContato: "", laudoTecnico: { possui, nome: "Laudo inicial", tipo: "RURAL", responsavelId: interno.usuarioId, versao } });
    await editar(false, 1);
    await expect(salvarAnotacaoLaudo(admin, clienteId, laudoId, { texto: "X", links: [] })).rejects.toThrow(/somente leitura/);
    await expect(comoUsuario(admin, (tx) => tx.laudoTecnico.update({ where: { id: laudoId }, data: { nome: "X", versao: { increment: 1 } } }))).rejects.toThrow(/Laudo desativado/);
    await editar(true, 2);
    expect((await listarAnotacoesLaudo(admin, clienteId, laudoId)).total).toBe(0);
    expect((await listarAnotacoesLaudo(admin, clienteId, laudoId, "", true)).total).toBe(1);
    await definirAnotacaoLaudoAtiva(admin, clienteId, laudoId, nota.id, 2, true);
    await ownerDb.cliente.update({ where: { id: clienteId }, data: { ativo: false } });
    await expect(salvarAnotacaoLaudo(admin, clienteId, laudoId, { texto: "X", links: [] })).rejects.toThrow(/somente leitura/);
    await expect(comoUsuario(admin, (tx) => tx.anotacaoLaudoTecnico.update({ where: { id: nota.id }, data: { texto: "X", versao: { increment: 1 } } }))).rejects.toThrow(/somente leitura/);
    await ownerDb.cliente.update({ where: { id: clienteId }, data: { ativo: true } });
    expect((await listarAnotacoesLaudo(admin, clienteId, laudoId)).total).toBe(1);
  });
  it("busca texto/links, pagina estavelmente e combina filtros de clientes", async () => {
    for (let n = 0; n < 22; n++) await salvarAnotacaoLaudo(admin, clienteId, laudoId, { texto: `Nota ${n}`, links: n === 0 ? ["https://drive.google.com/localizavel"] : [] });
    const primeira = await listarAnotacoesLaudo(admin, clienteId, laudoId);
    const segunda = await listarAnotacoesLaudo(admin, clienteId, laudoId, "", false, 2);
    expect(primeira.itens).toHaveLength(20);
    expect(segunda.itens).toHaveLength(2);
    expect(new Set([...primeira.itens, ...segunda.itens].map((n) => n.id)).size).toBe(22);
    expect((await listarAnotacoesLaudo(admin, clienteId, laudoId, "localizavel")).total).toBe(1);
    expect((await listarAnotacoesLaudo(admin, clienteId, laudoId, "Nota 21")).total).toBe(1);
    expect((await listarClientes(admin, "Maria", undefined, false, "com")).map((c) => c.id)).toEqual([clienteId]);
    expect(await listarClientes(admin, undefined, undefined, false, "sem")).toEqual([]);
    expect(await listarClientes(admin, undefined, "outra", false, "com")).toEqual([]);
  });
  it("UNIQUE impede dois laudos; concorrência permite uma edição e recusa a outra", async () => {
    await expect(comoUsuario(admin, (tx) => tx.laudoTecnico.create({ data: { clienteId, nome: "Duplicado", tipo: "RURAL", responsavelId: admin.usuarioId } }))).rejects.toThrow(/Unique constraint/);
    const nota = await salvarAnotacaoLaudo(admin, clienteId, laudoId, { texto: "A", links: [] });
    const resultados = await Promise.allSettled(["B", "C"].map((texto) => salvarAnotacaoLaudo(admin, clienteId, laudoId, { texto, links: [] }, nota.id, 1)));
    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(resultados.filter((r) => r.status === "rejected")).toHaveLength(1);
  });
  it("recusa responsáveis inexistentes/inativos e preserva quem saiu da equipe", async () => {
    await ownerDb.usuario.update({ where: { id: interno.usuarioId }, data: { ativo: false } });
    await atualizarCliente(admin, clienteId, { tipo: "PESSOA_FISICA", nome: "Maria", segmento: "", origemContato: "", laudoTecnico: { possui: true, nome: "Revisado", tipo: "AMBIENTAL", responsavelId: interno.usuarioId, versao: 1 } });
    expect((await buscarLaudoTecnico(admin, clienteId))!.responsavel.ativo).toBe(false);
    for (const responsavelId of ["ausente", externoId(), interno.usuarioId]) {
      await expect(criarCliente(admin, { ...dadosPF, cpf: "11144477735", laudoTecnico: { possui: true, nome: "X", tipo: "RURAL", responsavelId } })).rejects.toThrow(/equipe interna/);
    }
    function externoId() { return externos[0].usuarioId; }
  });
  it("o banco recusa anotação vazia, último link removido, protocolos e alteração de autor/vínculo", async () => {
    await expect(comoUsuario(admin, (tx) => tx.anotacaoLaudoTecnico.create({ data: { laudoId, autorId: admin.usuarioId, texto: " " } }))).rejects.toThrow(/anotação ou inclua/);
    const nota = await salvarAnotacaoLaudo(admin, clienteId, laudoId, { texto: "", links: ["https://drive.google.com/unico"] });
    await expect(comoUsuario(admin, (tx) => tx.linkAnotacaoLaudoTecnico.deleteMany({ where: { anotacaoId: nota.id } }))).rejects.toThrow(/anotação ou inclua/);
    await expect(comoUsuario(admin, (tx) => tx.linkAnotacaoLaudoTecnico.create({ data: { anotacaoId: nota.id, url: "javascript:alert(1)", ordem: 1 } }))).rejects.toThrow(/laudo_link_http/);
    await expect(comoUsuario(admin, (tx) => tx.anotacaoLaudoTecnico.update({ where: { id: nota.id }, data: { autorId: interno.usuarioId, versao: { increment: 1 } } }))).rejects.toThrow(/Vínculo e autor/);
    await expect(comoUsuario(admin, (tx) => tx.anotacaoLaudoTecnico.delete({ where: { id: nota.id } }))).rejects.toThrow(/permission denied/);
    expect(await ownerDb.linkAnotacaoLaudoTecnico.count()).toBe(1);
  });
  it("IDs reais de outro laudo não permitem editar nem alternar anotações", async () => {
    const outro = await criarCliente(admin, { ...dadosPF, cpf: "11144477735", laudoTecnico: { possui: true, nome: "Outro", tipo: "RURAL", responsavelId: admin.usuarioId } });
    const laudoOutro = (await buscarLaudoTecnico(admin, outro.id))!;
    const nota = await salvarAnotacaoLaudo(admin, clienteId, laudoId, { texto: "Segura", links: [] });
    await expect(salvarAnotacaoLaudo(admin, outro.id, laudoOutro.id, { texto: "Invasão", links: [] }, nota.id, 1)).rejects.toThrow(/Anotação não encontrada/);
    await expect(definirAnotacaoLaudoAtiva(admin, outro.id, laudoOutro.id, nota.id, 1, false)).rejects.toThrow(/outra sessão/);
    await expect(comoUsuario(admin, (tx) => tx.anotacaoLaudoTecnico.update({ where: { id: nota.id }, data: { laudoId: laudoOutro.id, versao: { increment: 1 } } }))).rejects.toThrow(/Vínculo e autor/);
  });
  it("filtros preservam cliente desativado e datas iguais não repetem registros nas páginas", async () => {
    for (let i = 0; i < 21; i++) await ownerDb.anotacaoLaudoTecnico.create({ data: { laudoId, autorId: admin.usuarioId, texto: "Mesmo horário", criadoEm: new Date("2026-10-21T12:00:00Z") } });
    const p1 = await listarAnotacoesLaudo(admin, clienteId, laudoId);
    const p2 = await listarAnotacoesLaudo(admin, clienteId, laudoId, "", false, 2);
    expect(new Set([...p1.itens, ...p2.itens].map((n) => n.id)).size).toBe(21);
    expect((await listarAnotacoesLaudo(admin, clienteId, laudoId, "", false, 999)).pagina).toBe(2);
    await ownerDb.cliente.update({ where: { id: clienteId }, data: { ativo: false, municipio: "Cuiabá" } });
    expect(await listarClientes(admin, "Maria", "Cuiabá", false, "com")).toEqual([]);
    expect((await listarClientes(admin, "Maria", "Cuiabá", true, "com")).map((c) => c.id)).toEqual([clienteId]);
  });
});
