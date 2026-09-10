/**
 * Validação de aplicação por tipo de cliente (RF-034/RF-035, ADR-006 — o banco não impõe
 * qual campo é obrigatório pra qual tipo, essa responsabilidade é toda daqui). Extraído das
 * Server Actions pra ser testável sem depender de sessão/auth (tests/unit).
 */
import { validarCnpj } from "@/lib/cnpj";
import { validarCpf } from "@/lib/cpf";
import { ehOpcaoOutro, segmentosPorTipo } from "@/lib/opcoes-cliente";
import { validarEmail } from "@/lib/validacao";
import { validarPessoaEnvolvida } from "@/lib/pessoas-envolvidas";
import type { NovoClienteInput, AtualizarClienteInput } from "@/lib/clientes";
import type { DadosPessoa } from "@/lib/heranca-pessoa";
import type { TipoCliente } from "@prisma/client";

/** RF-002d — RG/endereço/telefone são opcionais; CPF e e-mail só validam formato se preenchidos. */
function validarDadosPessoa(pessoa: DadosPessoa, rotulo: string): string | null {
  if (pessoa.cpf && !validarCpf(pessoa.cpf)) return `CPF do ${rotulo} inválido.`;
  if (pessoa.email && !validarEmail(pessoa.email)) return `E-mail do ${rotulo} inválido.`;
  return null;
}

/** RF-002/RF-002d — segmento é opcional; "Outro/Outros" exige o campo customizado. */
function validarSegmento(
  tipo: TipoCliente,
  segmento: string,
  segmentoCustomizado: string | undefined,
): string | null {
  if (!segmento) return null;
  if (ehOpcaoOutro(tipo, segmento)) {
    return segmentoCustomizado?.trim() ? null : `Informe o segmento no campo "${segmento}".`;
  }
  if (!(segmentosPorTipo(tipo) as readonly string[]).includes(segmento)) {
    return "Segmento inválido para o tipo de cliente selecionado.";
  }
  return null;
}

export function validarNovoCliente(dados: NovoClienteInput): string | null {
  const erroSegmento = validarSegmento(dados.tipo, dados.segmento, dados.segmentoCustomizado);
  if (erroSegmento) return erroSegmento;

  for (const pessoa of dados.pessoasEnvolvidas) {
    const erroPessoa = validarPessoaEnvolvida(pessoa);
    if (erroPessoa) return erroPessoa;
  }

  if (dados.tipo === "PESSOA_JURIDICA") {
    if (!dados.razaoSocial.trim()) return "Informe a razão social.";
    if (!validarCnpj(dados.cnpj)) return "CNPJ inválido.";
    return (
      validarDadosPessoa(dados.responsavelLegal, "Responsável Legal") ??
      validarDadosPessoa(dados.pontoContato, "Ponto de Contato")
    );
  }

  if (!dados.nome.trim()) return "Informe o nome.";
  if (!validarCpf(dados.cpf)) return "CPF inválido.";
  if (dados.email && !validarEmail(dados.email)) return "E-mail inválido.";
  return null;
}

export function validarAtualizacaoCliente(dados: AtualizarClienteInput): string | null {
  const erroSegmento = validarSegmento(dados.tipo, dados.segmento, dados.segmentoCustomizado);
  if (erroSegmento) return erroSegmento;

  if (dados.tipo === "PESSOA_JURIDICA") {
    if (!dados.razaoSocial.trim()) return "Informe a razão social.";
    return (
      validarDadosPessoa(dados.responsavelLegal, "Responsável Legal") ??
      validarDadosPessoa(dados.pontoContato, "Ponto de Contato")
    );
  }

  if (!dados.nome.trim()) return "Informe o nome.";
  return null;
}
