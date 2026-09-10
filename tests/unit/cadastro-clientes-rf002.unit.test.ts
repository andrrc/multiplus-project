/**
 * RF-002 (segmento: lista fechada + campo customizado quando "Outro/Outros"), RF-002c
 * (Estado/Município via API do IBGE, com fallback de indisponibilidade — mesma categoria de
 * risco do RF-001) e RF-002d (obrigatoriedade mínima: só tipo, nome/razão social, CNPJ/CPF e
 * o campo customizado de segmento continuam obrigatórios). Módulo SRS: Cadastro de Clientes
 * (Seção 3.1), reunião de aprovação da Sprint 2.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { validarNovoCliente } from "@/lib/validacao-cliente";
import { ehOpcaoOutro, ehSegmentoCustomizado, resolverSegmento } from "@/lib/opcoes-cliente";
import { listarEstados, listarMunicipiosPorEstado } from "@/lib/localidades";
import type { NovoClientePFInput, NovoClientePJInput } from "@/lib/clientes";

const PJ_VALIDO: NovoClientePJInput = {
  tipo: "PESSOA_JURIDICA",
  razaoSocial: "Ambiental Teste Ltda",
  cnpj: "11.222.333/0001-81",
  segmento: "Indústria",
  origemContato: "Google",
  responsavelLegal: { nome: "", endereco: "", rg: "", cpf: "", telefone: "", email: "" },
  pontoContato: { nome: "", endereco: "", rg: "", cpf: "", telefone: "", email: "", cargo: "" },
  pessoasEnvolvidas: [],
};

const PF_VALIDO: NovoClientePFInput = {
  tipo: "PESSOA_FISICA",
  nome: "Maria Proprietária",
  cpf: "111.444.777-35",
  segmento: "Proprietário rural",
  origemContato: "Indicação",
  pessoasEnvolvidas: [],
};

describe("RF-002 — segmento customizado quando 'Outro'/'Outros' é selecionado", () => {
  it("ehOpcaoOutro reconhece o literal certo por tipo (Outro para PF, Outros para PJ)", () => {
    expect(ehOpcaoOutro("PESSOA_FISICA", "Outro")).toBe(true);
    expect(ehOpcaoOutro("PESSOA_FISICA", "Outros")).toBe(false);
    expect(ehOpcaoOutro("PESSOA_JURIDICA", "Outros")).toBe(true);
  });

  it("resolverSegmento troca o literal pelo texto customizado só quando aplicável", () => {
    expect(resolverSegmento("PESSOA_JURIDICA", "Outros", "Consultoria ambiental")).toBe(
      "Consultoria ambiental",
    );
    expect(resolverSegmento("PESSOA_JURIDICA", "Indústria", "ignorado")).toBe("Indústria");
  });

  it("ehSegmentoCustomizado detecta valor salvo que não bate com a lista fechada do tipo", () => {
    expect(ehSegmentoCustomizado("PESSOA_JURIDICA", "Consultoria ambiental")).toBe(true);
    expect(ehSegmentoCustomizado("PESSOA_JURIDICA", "Indústria")).toBe(false);
    expect(ehSegmentoCustomizado("PESSOA_JURIDICA", "")).toBe(false);
  });

  it("validarNovoCliente rejeita 'Outros' sem o campo customizado preenchido", () => {
    expect(validarNovoCliente({ ...PJ_VALIDO, segmento: "Outros" })).toBe(
      'Informe o segmento no campo "Outros".',
    );
  });

  it("validarNovoCliente aceita 'Outros' com o campo customizado preenchido", () => {
    expect(
      validarNovoCliente({ ...PJ_VALIDO, segmento: "Outros", segmentoCustomizado: "Consultoria" }),
    ).toBeNull();
  });
});

describe("RF-002d — obrigatoriedade mínima no cadastro de cliente", () => {
  it("PJ sem nenhum dado de Responsável Legal/Ponto de Contato é aceito", () => {
    expect(validarNovoCliente(PJ_VALIDO)).toBeNull();
  });

  it("PJ com CPF do Responsável Legal mal formatado continua bloqueando (formato vale mesmo opcional)", () => {
    expect(
      validarNovoCliente({
        ...PJ_VALIDO,
        responsavelLegal: { ...PJ_VALIDO.responsavelLegal, cpf: "111.444.777-36" },
      }),
    ).toBe("CPF do Responsável Legal inválido.");
  });

  it("PJ com e-mail do Ponto de Contato mal formatado continua bloqueando", () => {
    expect(
      validarNovoCliente({
        ...PJ_VALIDO,
        pontoContato: { ...PJ_VALIDO.pontoContato, email: "invalido" },
      }),
    ).toBe("E-mail do Ponto de Contato inválido.");
  });

  it("PF sem segmento/origem/RG/endereço é aceito — só tipo, nome e CPF continuam obrigatórios", () => {
    expect(validarNovoCliente({ ...PF_VALIDO, segmento: "", origemContato: "" })).toBeNull();
  });
});

describe("RF-002c — Estado/Município via API do IBGE, com fallback de indisponibilidade", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("manda User-Agent (mesmo cuidado do RF-001 — API pública sujeita a bloqueio de WAF)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await listarEstados();

    const [, opcoes] = fetchMock.mock.calls[0];
    expect((opcoes.headers as Record<string, string>)["User-Agent"]).toBeTruthy();
  });

  it("retorna null (indisponível) quando a API cai — não bloqueia o cadastro, campo é opcional", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    expect(await listarEstados()).toBeNull();
    expect(await listarMunicipiosPorEstado("SP")).toBeNull();
  });

  it("retorna a lista quando a API responde normalmente", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([{ sigla: "SP", nome: "São Paulo" }]), { status: 200 }),
      ),
    );

    expect(await listarEstados()).toEqual([{ sigla: "SP", nome: "São Paulo" }]);
  });
});
