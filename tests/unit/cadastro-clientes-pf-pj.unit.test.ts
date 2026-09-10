/**
 * RF-034 (escolha do tipo), RF-035 (cadastro PF) e ADR-006 (validação de campo obrigatório
 * por tipo fica na aplicação, não no banco). Módulo SRS: Cadastro de Clientes (Seção 3.1).
 */
import { describe, expect, it } from "vitest";
import { validarNovoCliente } from "@/lib/validacao-cliente";
import type { NovoClienteInput, NovoClientePFInput, NovoClientePJInput } from "@/lib/clientes";

const PJ_VALIDO: NovoClientePJInput = {
  tipo: "PESSOA_JURIDICA",
  razaoSocial: "Ambiental Teste Ltda",
  cnpj: "11.222.333/0001-81",
  segmento: "Indústria",
  origemContato: "Google",
  responsavelLegal: {
    nome: "Responsável Teste",
    endereco: "Rua Teste, 1",
    rg: "1234567",
    cpf: "111.444.777-35",
    telefone: "11988887777",
    email: "responsavel@teste.local",
  },
  pontoContato: {
    nome: "Contato Teste",
    endereco: "Rua Teste, 1",
    rg: "1234567",
    cpf: "111.444.777-35",
    telefone: "11988886666",
    email: "contato@teste.local",
    cargo: "Gerente",
  },
  pessoasOperacional: [],
};

const PF_VALIDO: NovoClientePFInput = {
  tipo: "PESSOA_FISICA",
  nome: "Maria Proprietária",
  cpf: "111.444.777-35",
  rg: "9876543",
  endereco: "Sítio Teste, s/n",
  cep: "18000-000",
  municipio: "Votorantim",
  email: "maria@teste.local",
  segmento: "Proprietário rural",
  origemContato: "Indicação",
  pessoasOperacional: [],
};

describe("validarNovoCliente — Pessoa Jurídica (RF-001, RF-026, RF-027)", () => {
  it("aceita um cadastro PJ válido", () => {
    expect(validarNovoCliente(PJ_VALIDO)).toBeNull();
  });

  it("rejeita CNPJ inválido", () => {
    expect(validarNovoCliente({ ...PJ_VALIDO, cnpj: "00000000000000" })).toBe("CNPJ inválido.");
  });

  it("rejeita razão social vazia", () => {
    expect(validarNovoCliente({ ...PJ_VALIDO, razaoSocial: "   " })).toBe("Informe a razão social.");
  });

  it("rejeita CPF inválido do Responsável Legal", () => {
    const dados: NovoClienteInput = {
      ...PJ_VALIDO,
      responsavelLegal: { ...PJ_VALIDO.responsavelLegal, cpf: "111.444.777-36" },
    };
    expect(validarNovoCliente(dados)).toBe("CPF do Responsável Legal inválido.");
  });

  it("rejeita segmento que não é da lista de Pessoa Jurídica (RF-002)", () => {
    // "Proprietário rural" é da lista de PF, não de PJ.
    expect(validarNovoCliente({ ...PJ_VALIDO, segmento: "Proprietário rural" })).toBe(
      "Segmento inválido para o tipo de cliente selecionado.",
    );
  });
});

describe("validarNovoCliente — Pessoa Física (RF-034, RF-035)", () => {
  it("aceita um cadastro PF válido, sem exigir CNPJ/Responsável Legal/Ponto de Contato", () => {
    expect(validarNovoCliente(PF_VALIDO)).toBeNull();
  });

  it("rejeita CPF inválido", () => {
    expect(validarNovoCliente({ ...PF_VALIDO, cpf: "111.444.777-36" })).toBe("CPF inválido.");
  });

  it("rejeita nome vazio", () => {
    expect(validarNovoCliente({ ...PF_VALIDO, nome: "  " })).toBe("Informe o nome.");
  });

  it("rejeita e-mail vazio — RF-031 depende dele pra criar o acesso", () => {
    expect(validarNovoCliente({ ...PF_VALIDO, email: "" })).toBe(
      "Informe o e-mail — é por onde o acesso é criado (RF-031).",
    );
  });

  it("rejeita segmento que não é da lista de Pessoa Física (RF-002)", () => {
    // "Indústria" é da lista de PJ, não de PF.
    expect(validarNovoCliente({ ...PF_VALIDO, segmento: "Indústria" })).toBe(
      "Segmento inválido para o tipo de cliente selecionado.",
    );
  });
});
