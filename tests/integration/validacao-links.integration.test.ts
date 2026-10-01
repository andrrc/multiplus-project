// RF-013, RF-016/RF-017 — links externos persistidos devem usar somente HTTP ou HTTPS.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adicionarDocumento } from "@/lib/clientes";
import { criarComentario } from "@/lib/comentarios";
import { criarDocumentoProjeto } from "@/lib/projetos-tarefas";
import { fecharConexoes, limparFixtures, ownerDb } from "./setup/helpers";

let ctx: { usuarioId: string; perfil: "ADMIN" };
let clienteId = "";
let projetoId = "";

beforeAll(async () => {
  await limparFixtures();
  const admin = await ownerDb.usuario.create({ data: { nome: "Talita Links", email: "talita.links@teste.local", perfil: "ADMIN" } });
  const cliente = await ownerDb.cliente.create({ data: { razaoSocial: "Cliente Links Ltda", cnpj: "33444555000196", segmento: "Industrial", origemContato: "Indicação" } });
  const projeto = await ownerDb.projeto.create({ data: { clienteId: cliente.id, nome: "Projeto Links" } });
  ctx = { usuarioId: admin.id, perfil: "ADMIN" };
  clienteId = cliente.id;
  projetoId = projeto.id;
});

afterAll(async () => {
  await limparFixtures();
  await fecharConexoes();
});

describe("validação de esquema de links no servidor", () => {
  it("recusa javascript: em comentário sem persistir e aceita HTTP/HTTPS", async () => {
    await expect(criarComentario(ctx, { projetoId }, "Comentário inseguro", "javascript:alert(1)")).rejects.toThrow("http ou https");
    expect(await ownerDb.comentario.count({ where: { projetoId } })).toBe(0);

    const comentarioHttp = await criarComentario(ctx, { projetoId }, "Comentário HTTP", "http://example.com/referencia");
    const comentarioHttps = await criarComentario(ctx, { projetoId }, "Comentário HTTPS", "https://example.com/referencia");
    expect(comentarioHttp.link).toBe("http://example.com/referencia");
    expect(comentarioHttps.link).toBe("https://example.com/referencia");
    await expect(criarComentario(ctx, { projetoId }, "Comentário inválido", "/relativo")).rejects.toThrow("http ou https");
  });

  it("recusa javascript: em documento do cliente sem persistir e aceita HTTP/HTTPS", async () => {
    await expect(adicionarDocumento(ctx, clienteId, "Inseguro", "javascript:alert(1)")).rejects.toThrow("http ou https");
    expect(await ownerDb.documento.count({ where: { clienteId, projetoId: null } })).toBe(0);

    const documentoHttp = await adicionarDocumento(ctx, clienteId, "HTTP", "http://example.com/cliente");
    const documentoHttps = await adicionarDocumento(ctx, clienteId, "HTTPS", "https://example.com/cliente");
    expect(documentoHttp.link).toBe("http://example.com/cliente");
    expect(documentoHttps.link).toBe("https://example.com/cliente");
  });

  it("recusa javascript: em documento do projeto sem persistir e aceita HTTP/HTTPS", async () => {
    const dados = { clienteId, projetoId, nome: "Documento", link: "javascript:alert(1)" };
    await expect(criarDocumentoProjeto(ctx, dados)).rejects.toThrow("http ou https");
    expect(await ownerDb.documento.count({ where: { projetoId } })).toBe(0);

    const documentoHttp = await criarDocumentoProjeto(ctx, { ...dados, link: "http://example.com/projeto" });
    const documentoHttps = await criarDocumentoProjeto(ctx, { ...dados, link: "https://example.com/projeto" });
    expect(documentoHttp.link).toBe("http://example.com/projeto");
    expect(documentoHttps.link).toBe("https://example.com/projeto");
  });
});
