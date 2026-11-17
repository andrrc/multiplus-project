/** Comprovantes do colaborador externo: conferência do conteúdo, limites, nome seguro e situação do envio. */
import { describe, expect, it } from "vitest";
import {
  ACCEPT_COMPROVANTE,
  descricaoDaExigencia,
  detectarTipoComprovante,
  ehImagemComprovante,
  EXTENSAO_POR_TIPO,
  lerExigenciaDoComprovante,
  lerInstrucoesDoComprovante,
  LIMITE_ARQUIVO_COMPROVANTE_BYTES,
  mensagemDeErroComprovante,
  nomeSeguroDoArquivo,
  origemConfere,
  situacaoDaTarefaDoColaborador,
  situacaoDoEnvio,
  validarTamanhoComprovante,
} from "@/lib/comprovantes-arquivos";

const bytes = (...valores: number[]) => new Uint8Array(valores);
const texto = (valor: string) => new TextEncoder().encode(valor);

describe("tipo do arquivo pelo conteúdo", () => {
  it("reconhece JPEG, PNG, WebP e PDF pelos bytes iniciais, ignorando o nome", () => {
    expect(detectarTipoComprovante(bytes(0xff, 0xd8, 0xff, 0xe0), "foto.png")).toBe("image/jpeg");
    expect(detectarTipoComprovante(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0), "foto.jpg")).toBe("image/png");
    expect(detectarTipoComprovante(new Uint8Array([...texto("RIFF"), 0, 0, 0, 0, ...texto("WEBP")]), "foto")).toBe("image/webp");
    expect(detectarTipoComprovante(texto("%PDF-1.7 conteúdo"), "laudo.pdf")).toBe("application/pdf");
  });

  it("aceita planilha e documento do Office só quando assinatura e extensão combinam", () => {
    const zip = bytes(0x50, 0x4b, 0x03, 0x04, 0x14);
    expect(detectarTipoComprovante(zip, "dados.xlsx")).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(detectarTipoComprovante(zip, "texto.docx")).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(detectarTipoComprovante(zip, "pacote.zip")).toBeNull();
    expect(detectarTipoComprovante(zip, "programa.exe")).toBeNull();
    const ole = bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
    expect(detectarTipoComprovante(ole, "dados.xls")).toBe("application/vnd.ms-excel");
    expect(detectarTipoComprovante(ole, "texto.doc")).toBe("application/msword");
    expect(detectarTipoComprovante(ole, "texto.ppt")).toBeNull();
  });

  it("aceita CSV de texto e recusa conteúdo binário com a extensão csv", () => {
    expect(detectarTipoComprovante(texto("a;b\n1;2\n"), "medicoes.CSV")).toBe("text/csv");
    expect(detectarTipoComprovante(bytes(0x61, 0x00, 0x62), "medicoes.csv")).toBeNull();
    expect(detectarTipoComprovante(new Uint8Array(0), "vazio.csv")).toBeNull();
  });

  it("recusa executável, script e texto disfarçados de imagem", () => {
    expect(detectarTipoComprovante(texto("MZ\u0090\u0000"), "foto.jpg")).toBeNull();
    expect(detectarTipoComprovante(texto("<script>alert(1)</script>"), "foto.png")).toBeNull();
    expect(detectarTipoComprovante(texto("<svg onload=alert(1)>"), "imagem.svg")).toBeNull();
    expect(detectarTipoComprovante(texto("#!/bin/sh\nrm -rf /"), "script.sh")).toBeNull();
  });

  it("tem uma extensão de chave para cada tipo aceito e só as imagens abrem na página", () => {
    for (const tipo of Object.keys(EXTENSAO_POR_TIPO)) expect(EXTENSAO_POR_TIPO[tipo as keyof typeof EXTENSAO_POR_TIPO]).toMatch(/^[a-z]{3,4}$/);
    expect(ehImagemComprovante("image/jpeg")).toBe(true);
    expect(ehImagemComprovante("application/pdf")).toBe(false);
    expect(ehImagemComprovante("image/svg+xml")).toBe(false);
    expect(ACCEPT_COMPROVANTE).toContain(".pdf");
  });
});

describe("limites e nome do arquivo", () => {
  it("recusa arquivo vazio e acima de 10 MB", () => {
    expect(() => validarTamanhoComprovante(0)).toThrow(/vazio/);
    expect(() => validarTamanhoComprovante(LIMITE_ARQUIVO_COMPROVANTE_BYTES)).not.toThrow();
    expect(() => validarTamanhoComprovante(LIMITE_ARQUIVO_COMPROVANTE_BYTES + 1)).toThrow(/10 MB/);
  });

  it("tira caminho e caracteres de controle do nome e limita a 200 caracteres", () => {
    expect(nomeSeguroDoArquivo("../../etc/passwd")).toBe("passwd");
    expect(nomeSeguroDoArquivo("C:\\fotos\\caldeira 1.jpg")).toBe("caldeira 1.jpg");
    expect(nomeSeguroDoArquivo("foto\u0000\u001f.jpg")).toBe("foto.jpg");
    expect(nomeSeguroDoArquivo("   ")).toBe("arquivo");
    expect(nomeSeguroDoArquivo("a".repeat(500))).toHaveLength(200);
  });
});

describe("mensagem de erro para o colaborador", () => {
  it("extrai a regra de negócio de um erro do banco e esconde qualquer outro detalhe", () => {
    expect(mensagemDeErroComprovante(new Error("Raw query failed. Code: `P0001`. Message: `ERROR: RN-009: este item não exige comprovante.`"))).toBe("este item não exige comprovante.");
    expect(mensagemDeErroComprovante(new Error("RN-007: sem permissão para solicitar a conclusão deste item."))).toBe("sem permissão para solicitar a conclusão deste item.");
    expect(mensagemDeErroComprovante(new Error("Cada arquivo deve ter no máximo 10 MB."))).toBe("Cada arquivo deve ter no máximo 10 MB.");
    expect(mensagemDeErroComprovante(new Error("connect ECONNREFUSED 10.0.0.5:9000"))).toBe("Não foi possível enviar o arquivo. Tente novamente.");
  });
});

describe("situação do envio de um item", () => {
  const aberto = { status: "EM_ANDAMENTO" };

  it("concluída e cancelada nunca voltam; pedido pendente aguarda; o último rejeitado é devolvido", () => {
    expect(situacaoDoEnvio({ status: "CONCLUIDO" }, null)).toBe("concluida");
    expect(situacaoDoEnvio({ status: "CANCELADO" }, { status: "REJEITADA" })).toBe("concluida");
    expect(situacaoDoEnvio(aberto, { status: "PENDENTE" })).toBe("aguardando");
    expect(situacaoDoEnvio(aberto, { status: "REJEITADA" })).toBe("devolvida");
    expect(situacaoDoEnvio(aberto, { status: "CANCELADA" })).toBe("para_enviar");
    expect(situacaoDoEnvio(aberto, null)).toBe("para_enviar");
  });

  it("na lista, a tarefa do colaborador vale pelo próprio pedido e traz o motivo da devolução", () => {
    const resultado = situacaoDaTarefaDoColaborador(
      { status: "EM_ANDAMENTO", ativo: true, meu: true, ultimaSolicitacao: { status: "REJEITADA", comentarioDecisao: "Foto desfocada." } },
      [],
    );
    expect(resultado).toEqual({ situacao: "devolvida", motivoDevolucao: "Foto desfocada." });
  });

  it("quem só tem subtarefas vê a mais urgente entre as abertas dele, ignorando as dos colegas e as fechadas", () => {
    const tarefa = { status: "EM_ANDAMENTO", ativo: true, meu: false, ultimaSolicitacao: null };
    const sub = (extra: Partial<{ status: string; meu: boolean; ativo: boolean; s: string | null; c: string | null }>) => ({
      status: extra.status ?? "EM_ANDAMENTO",
      ativo: extra.ativo ?? true,
      meu: extra.meu ?? true,
      ultimaSolicitacao: extra.s === undefined || extra.s === null ? null : { status: extra.s, comentarioDecisao: extra.c ?? null },
    });
    expect(situacaoDaTarefaDoColaborador(tarefa, [sub({ s: "PENDENTE" }), sub({ s: "REJEITADA", c: "Refazer." })]).situacao).toBe("devolvida");
    expect(situacaoDaTarefaDoColaborador(tarefa, [sub({ s: "PENDENTE" }), sub({})]).situacao).toBe("para_enviar");
    expect(situacaoDaTarefaDoColaborador(tarefa, [sub({ s: "PENDENTE" })]).situacao).toBe("aguardando");
    expect(situacaoDaTarefaDoColaborador(tarefa, [sub({ meu: false, s: "REJEITADA" }), sub({ status: "CONCLUIDO" }), sub({ ativo: false })]).situacao).toBe("concluida");
    expect(situacaoDaTarefaDoColaborador({ ...tarefa, status: "CONCLUIDO" }, [sub({ s: "REJEITADA" })]).situacao).toBe("concluida");
  });
});

describe("campos de comprovante do formulário", () => {
  it("sem exigir, zera quantidade e lista", () => {
    expect(lerExigenciaDoComprovante(false, "5", "algo")).toEqual({ comprovanteExigido: false, comprovanteQuantidade: null, comprovanteInstrucoes: [] });
  });

  it("exigindo, valida a quantidade de 1 a 20 e lê a lista um item por linha", () => {
    expect(lerExigenciaDoComprovante(true, "3", "Plaqueta visível\r\n\r\n  Painel de controle  ")).toEqual({
      comprovanteExigido: true,
      comprovanteQuantidade: 3,
      comprovanteInstrucoes: ["Plaqueta visível", "Painel de controle"],
    });
    for (const invalida of ["", "0", "21", "2,5", "abc", "-1"]) {
      expect(() => lerExigenciaDoComprovante(true, invalida, "")).toThrow(/quantidade/);
    }
  });

  it("limita a lista a 20 itens de 200 caracteres", () => {
    expect(() => lerInstrucoesDoComprovante(Array.from({ length: 21 }, (_, i) => `item ${i}`).join("\n"))).toThrow(/no máximo 20/);
    expect(() => lerInstrucoesDoComprovante("x".repeat(201))).toThrow(/200 caracteres/);
    expect(lerInstrucoesDoComprovante(null)).toEqual([]);
  });

  it("descreve a exigência em português", () => {
    expect(descricaoDaExigencia(1)).toBe("1 foto ou arquivo");
    expect(descricaoDaExigencia(3)).toBe("3 fotos ou arquivos");
    expect(descricaoDaExigencia(null)).toBeNull();
  });
});

describe("origem da requisição", () => {
  it("aceita a mesma origem e a ausência de cabeçalho; recusa outro site e origem inválida", () => {
    expect(origemConfere("https://app.multiplus.com.br", "app.multiplus.com.br")).toBe(true);
    expect(origemConfere(null, "app.multiplus.com.br")).toBe(true);
    expect(origemConfere("https://malicioso.example", "app.multiplus.com.br")).toBe(false);
    expect(origemConfere("não é uma url", "app.multiplus.com.br")).toBe(false);
    expect(origemConfere("https://app.multiplus.com.br", null)).toBe(false);
  });
});
