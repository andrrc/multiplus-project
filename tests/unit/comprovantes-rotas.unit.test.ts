/** Rotas de comprovante: origem, sessão, resposta uniforme para quem não pode ver e cabeçalhos do arquivo entregue. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  obterContexto: vi.fn(),
  anexarComprovante: vi.fn(),
  abrirArquivoComprovante: vi.fn(),
  removerRascunho: vi.fn(),
}));

vi.mock("@/server/auth/contexto", () => ({ obterContexto: mocks.obterContexto }));
vi.mock("@/lib/comprovantes", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/comprovantes")>(),
  anexarComprovante: mocks.anexarComprovante,
  abrirArquivoComprovante: mocks.abrirArquivoComprovante,
  removerRascunho: mocks.removerRascunho,
}));

import { POST } from "@/app/api/comprovantes/route";
import { DELETE, GET } from "@/app/api/comprovantes/[id]/route";

const ctx = { usuarioId: "externo-1", perfil: "ADMIN_EXTERNO" as const };
const params = (id: string) => ({ params: Promise.resolve({ id }) });

function envio(campos: Record<string, string | File>, cabecalhos: Record<string, string> = {}) {
  const corpo = new FormData();
  for (const [campo, valor] of Object.entries(campos)) corpo.set(campo, valor);
  return new Request("https://app.multiplus.test/api/comprovantes", { method: "POST", body: corpo, headers: { host: "app.multiplus.test", ...cabecalhos } });
}

describe("POST /api/comprovantes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.obterContexto.mockResolvedValue(ctx);
    mocks.anexarComprovante.mockResolvedValue({ id: "arq-1", nomeOriginal: "f.jpg", tipo: "image/jpeg", tamanhoBytes: 10 });
  });

  it("recusa requisição vinda de outro site sem tocar no banco", async () => {
    const resposta = await POST(envio({ tipo: "TAREFA", itemId: "t1", arquivo: new File(["x"], "f.jpg") }, { origin: "https://malicioso.example" }));
    expect(resposta.status).toBe(403);
    expect(mocks.anexarComprovante).not.toHaveBeenCalled();
  });

  it("responde 401 sem sessão", async () => {
    mocks.obterContexto.mockRejectedValue(new Error("Sessão não encontrada."));
    const resposta = await POST(envio({ tipo: "TAREFA", itemId: "t1", arquivo: new File(["x"], "f.jpg") }));
    expect(resposta.status).toBe(401);
  });

  it("anexa o arquivo para o próprio colaborador e responde 201 sem cache", async () => {
    const resposta = await POST(envio({ tipo: "SUBTAREFA", itemId: "s1", arquivo: new File(["x"], "f.jpg") }, { origin: "https://app.multiplus.test" }));
    expect(resposta.status).toBe(201);
    expect(resposta.headers.get("cache-control")).toBe("no-store");
    expect((await resposta.json()).arquivo.id).toBe("arq-1");
    expect(mocks.anexarComprovante).toHaveBeenCalledWith(ctx, "SUBTAREFA", "s1", expect.any(File));
  });

  it("recusa tipo de item inválido, item ausente e falta do arquivo", async () => {
    expect((await POST(envio({ tipo: "PROJETO", itemId: "t1", arquivo: new File(["x"], "f.jpg") }))).status).toBe(400);
    expect((await POST(envio({ tipo: "TAREFA", itemId: "", arquivo: new File(["x"], "f.jpg") }))).status).toBe(400);
    expect((await POST(envio({ tipo: "TAREFA", itemId: "t1" }))).status).toBe(400);
    expect(mocks.anexarComprovante).not.toHaveBeenCalled();
  });

  it("traduz a recusa do banco em mensagem para o colaborador, sem vazar detalhe técnico", async () => {
    mocks.anexarComprovante.mockRejectedValue(new Error("Raw query failed. Code: `P0001`. Message: `ERROR: RN-009: este item não exige comprovante.`"));
    const resposta = await POST(envio({ tipo: "TAREFA", itemId: "t1", arquivo: new File(["x"], "f.jpg") }));
    expect(resposta.status).toBe(400);
    expect((await resposta.json()).erro).toBe("este item não exige comprovante.");

    mocks.anexarComprovante.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.5:9000"));
    const generica = await POST(envio({ tipo: "TAREFA", itemId: "t1", arquivo: new File(["x"], "f.jpg") }));
    expect((await generica.json()).erro).toBe("Não foi possível enviar o arquivo. Tente novamente.");
  });
});

describe("GET /api/comprovantes/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.obterContexto.mockResolvedValue(ctx);
  });

  const pedir = (id: string, consulta = "") => GET(new Request(`https://app.multiplus.test/api/comprovantes/${id}${consulta}`), params(id));

  it("entrega a imagem na página, privada, sem cache e com política de conteúdo restrita", async () => {
    mocks.abrirArquivoComprovante.mockResolvedValue({ dados: Buffer.from("img"), tipo: "image/jpeg", nomeOriginal: "caldeira.jpg" });
    const resposta = await pedir("arq-1");
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("content-type")).toBe("image/jpeg");
    expect(resposta.headers.get("cache-control")).toBe("private, no-store");
    expect(resposta.headers.get("x-content-type-options")).toBe("nosniff");
    expect(resposta.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(resposta.headers.get("content-disposition")).toBeNull();
  });

  it("baixa PDF e planilha em vez de abrir, com o nome codificado, e baixa a imagem quando pedido", async () => {
    mocks.abrirArquivoComprovante.mockResolvedValue({ dados: Buffer.from("pdf"), tipo: "application/pdf", nomeOriginal: "laudo de março.pdf" });
    const pdf = await pedir("arq-2");
    expect(pdf.headers.get("content-disposition")).toBe("attachment; filename*=UTF-8''laudo%20de%20mar%C3%A7o.pdf");

    mocks.abrirArquivoComprovante.mockResolvedValue({ dados: Buffer.from("img"), tipo: "image/png", nomeOriginal: "a.png" });
    const imagem = await pedir("arq-3", "?download=1");
    expect(imagem.headers.get("content-disposition")).toContain("attachment");
  });

  it("responde 404 igual para arquivo sem acesso, inexistente e sem sessão", async () => {
    mocks.abrirArquivoComprovante.mockResolvedValue(null);
    const semAcesso = await pedir("alheio");
    expect(semAcesso.status).toBe(404);

    mocks.obterContexto.mockRejectedValue(new Error("Sessão não encontrada."));
    const semSessao = await pedir("qualquer");
    expect(semSessao.status).toBe(404);
    expect(await semSessao.text()).toBe(await semAcesso.text());
  });
});

describe("DELETE /api/comprovantes/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.obterContexto.mockResolvedValue(ctx);
  });

  it("remove o rascunho do próprio colaborador e recusa outra origem", async () => {
    const ok = await DELETE(new Request("https://app.multiplus.test/api/comprovantes/arq-1", { method: "DELETE", headers: { host: "app.multiplus.test", origin: "https://app.multiplus.test" } }), params("arq-1"));
    expect(ok.status).toBe(200);
    expect(mocks.removerRascunho).toHaveBeenCalledWith(ctx, "arq-1");

    const fora = await DELETE(new Request("https://app.multiplus.test/api/comprovantes/arq-1", { method: "DELETE", headers: { host: "app.multiplus.test", origin: "https://malicioso.example" } }), params("arq-1"));
    expect(fora.status).toBe(403);
    expect(mocks.removerRascunho).toHaveBeenCalledTimes(1);
  });
});
