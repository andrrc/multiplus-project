/**
 * Validação de aplicação por tipo de cliente (RF-034/RF-035, ADR-006 — o banco não impõe
 * qual campo é obrigatório pra qual tipo, essa responsabilidade é toda daqui). Extraído das
 * Server Actions pra ser testável sem depender de sessão/auth (tests/unit).
 */
import { validarCnpj } from "@/lib/cnpj";
import { validarCpf } from "@/lib/cpf";
import { segmentosPorTipo } from "@/lib/opcoes-cliente";
import type { NovoClienteInput, AtualizarClienteInput } from "@/lib/clientes";

export function validarNovoCliente(dados: NovoClienteInput): string | null {
  if (!(segmentosPorTipo(dados.tipo) as readonly string[]).includes(dados.segmento)) {
    return "Segmento inválido para o tipo de cliente selecionado.";
  }

  if (dados.tipo === "PESSOA_JURIDICA") {
    if (!dados.razaoSocial.trim()) return "Informe a razão social.";
    if (!validarCnpj(dados.cnpj)) return "CNPJ inválido.";
    if (!validarCpf(dados.responsavelLegal.cpf)) return "CPF do Responsável Legal inválido.";
    if (!validarCpf(dados.pontoContato.cpf)) return "CPF do Ponto de Contato inválido.";
    return null;
  }

  if (!dados.nome.trim()) return "Informe o nome.";
  if (!validarCpf(dados.cpf)) return "CPF inválido.";
  if (!dados.rg.trim()) return "Informe o RG.";
  if (!dados.email.trim()) return "Informe o e-mail — é por onde o acesso é criado (RF-031).";
  return null;
}

export function validarAtualizacaoCliente(dados: AtualizarClienteInput): string | null {
  if (!(segmentosPorTipo(dados.tipo) as readonly string[]).includes(dados.segmento)) {
    return "Segmento inválido para o tipo de cliente selecionado.";
  }

  if (dados.tipo === "PESSOA_JURIDICA") {
    if (!dados.razaoSocial.trim()) return "Informe a razão social.";
    if (!validarCpf(dados.responsavelLegal.cpf)) return "CPF do Responsável Legal inválido.";
    if (!validarCpf(dados.pontoContato.cpf)) return "CPF do Ponto de Contato inválido.";
    return null;
  }

  if (!dados.nome.trim()) return "Informe o nome.";
  if (!dados.rg.trim()) return "Informe o RG.";
  if (!dados.email.trim()) return "Informe o e-mail.";
  return null;
}
