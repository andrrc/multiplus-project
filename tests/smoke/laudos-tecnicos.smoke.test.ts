/** RF-051 / RF-039 — ciclo completo do laudo para PF, PJ e cliente existente. */
import { beforeEach, afterAll, expect, it } from "vitest";
import { ownerDb, limparFixtures, fecharConexoes } from "../integration/setup/helpers";
import { criarCliente, atualizarCliente, listarClientes } from "@/lib/clientes";
import { buscarLaudoTecnico, salvarAnotacaoLaudo, definirAnotacaoLaudoAtiva, listarAnotacoesLaudo } from "@/lib/laudos-tecnicos";
import type { DadosLaudoInput } from "@/lib/validacao-laudo";
import type { ContextoUsuario } from "@/lib/prisma-app";

let ctx: ContextoUsuario;
beforeEach(async () => {
  await limparFixtures();
  const u = await ownerDb.usuario.create({ data: { nome: "Talita", perfil: "ADMIN", email: "laudo-smoke@teste.local" } });
  ctx = { usuarioId: u.id, perfil: "ADMIN" };
});
afterAll(async () => { await limparFixtures(); await fecharConexoes(); });

it.each(["PF", "PJ", "existente"])("RF-051 — ciclo de laudo para %s", async (modo) => {
  const laudoTecnico = { possui: true, nome: "Análise técnica", tipo: "AMBIENTAL" as const, responsavelId: ctx.usuarioId };
  const pessoa = { nome: "", endereco: "", rg: "", cpf: "", telefone: "", email: "" };
  const cliente = await criarCliente(ctx, modo === "PJ"
    ? { tipo: "PESSOA_JURIDICA", razaoSocial: "Empresa", cnpj: "11222333000181", segmento: "", origemContato: "", pessoasEnvolvidas: [], responsavelLegal: pessoa, pontoContato: pessoa, laudoTecnico }
    : { tipo: "PESSOA_FISICA", nome: "Pessoa", cpf: "52998224725", segmento: "", origemContato: "", pessoasEnvolvidas: [], ...(modo === "existente" ? {} : { laudoTecnico }) });
  const editar = (laudo: DadosLaudoInput) => atualizarCliente(ctx, cliente.id, modo === "PJ"
    ? { tipo: "PESSOA_JURIDICA", razaoSocial: "Empresa", segmento: "", origemContato: "", responsavelLegal: pessoa, pontoContato: pessoa, laudoTecnico: laudo }
    : { tipo: "PESSOA_FISICA", nome: "Pessoa", segmento: "", origemContato: "", laudoTecnico: laudo });
  if (modo === "existente") await editar(laudoTecnico);
  let laudo = (await buscarLaudoTecnico(ctx, cliente.id))!;
  expect(laudo.nome).toBe("Análise técnica");
  const novoResponsavel = await ownerDb.usuario.create({ data: { nome: "Equipe", email: "equipe-smoke@teste.local", perfil: "ADMIN_INTERNO" } });
  await editar({ ...laudoTecnico, nome: "Análise revisada", tipo: "RURAL", responsavelId: novoResponsavel.id, versao: laudo.versao });
  laudo = (await buscarLaudoTecnico(ctx, cliente.id))!;
  expect(laudo.tipo).toBe("RURAL");
  expect(laudo.responsavelId).toBe(novoResponsavel.id);
  const nota = await salvarAnotacaoLaudo(ctx, cliente.id, laudo.id, { texto: "Primeira", links: ["https://drive.google.com/a", "https://drive.google.com/b"] });
  await salvarAnotacaoLaudo(ctx, cliente.id, laudo.id, { texto: "Revisada", links: ["https://drive.google.com/c"] }, nota.id, nota.versao);
  await definirAnotacaoLaudoAtiva(ctx, cliente.id, laudo.id, nota.id, 2, false);
  expect((await listarAnotacoesLaudo(ctx, cliente.id, laudo.id)).total).toBe(0);
  await editar({ ...laudoTecnico, possui: false, versao: laudo.versao });
  expect((await listarClientes(ctx, undefined, undefined, false, "com"))).toEqual([]);
  const inativo = (await buscarLaudoTecnico(ctx, cliente.id))!;
  await editar({ possui: true, nome: inativo.nome, tipo: inativo.tipo, responsavelId: inativo.responsavelId, versao: inativo.versao });
  expect((await buscarLaudoTecnico(ctx, cliente.id))!.id).toBe(laudo.id);
  expect((await listarAnotacoesLaudo(ctx, cliente.id, laudo.id, "Revisada", true)).total).toBe(1);
  await definirAnotacaoLaudoAtiva(ctx, cliente.id, laudo.id, nota.id, 3, true);
  const historico = await listarAnotacoesLaudo(ctx, cliente.id, laudo.id);
  expect(historico.itens[0].links.map((l) => l.url)).toEqual(["https://drive.google.com/c"]);
  expect(await ownerDb.documento.count()).toBe(0);
  expect(await ownerDb.atribuicao.count()).toBe(0);
  expect(await ownerDb.notificacao.count()).toBe(0);
});
