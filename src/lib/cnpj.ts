export function normalizarCnpj(cnpjEntrada: string): string {
  // Remove a máscara de apresentação para validar e consultar somente os números.
  return cnpjEntrada.replace(/\D/g, "");
}

/** Validação por dígito verificador (mod 11) — não confirma existência real do CNPJ. */
export function validarCnpj(cnpjEntrada: string): boolean {
  const cnpj = normalizarCnpj(cnpjEntrada);
  // CNPJ precisa de 14 dígitos, e uma sequência repetida não pode ser um identificador válido.
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  // Converte cada caractere numérico uma única vez para o cálculo dos verificadores.
  const digitos = cnpj.split("").map(Number);
  // Cada lista contém os pesos aplicados na regra oficial a uma posição do CNPJ.
  const pesosDv1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesosDv2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  // Calcula o dígito de controle para a sequência de pesos recebida.
  const calcularDigito = (pesos: number[]): number => {
    // Multiplica cada dígito pelo peso correspondente e acumula a soma.
    const soma = pesos.reduce((acc, peso, i) => acc + peso * digitos[i], 0);
    // A regra de módulo 11 transforma restos 0/1 em zero e os demais em 11 - resto.
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  // O segundo dígito é calculado com o primeiro já incluído na sequência.
  return calcularDigito(pesosDv1) === digitos[12] && calcularDigito(pesosDv2) === digitos[13];
}

type BrasilApiCnpjResposta = {
  razao_social: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
};

export type ConsultaCnpjResultado =
  | { encontrado: true; razaoSocial: string; endereco: string }
  | { encontrado: false };

/**
 * SRS Seção 6.1 documenta essa consulta como sujeita a instabilidade. Diferencia dois
 * casos que o PDD trata de forma diferente na UI (Fluxo A): CNPJ não encontrado
 * (`encontrado: false` — erro inline, é problema do dado) de serviço indisponível/timeout
 * (`null` — aviso de preenchimento manual, não é problema do CNPJ digitado).
 */
export async function consultarCnpj(cnpjEntrada: string): Promise<ConsultaCnpjResultado | null> {
  // A API externa espera o CNPJ sem pontuação.
  const cnpj = normalizarCnpj(cnpjEntrada);
  // Permite trocar o serviço em ambientes de teste sem alterar a lógica da consulta.
  const baseUrl = process.env.CNPJ_API_BASE_URL ?? "https://brasilapi.com.br/api/cnpj/v1";

  try {
    // Sem User-Agent, o WAF da BrasilAPI devolve 403 pro fetch() nativo do Node
    // (curl/navegador mandam um por padrão, então passavam batido nos testes manuais).
    const resposta = await fetch(`${baseUrl}/${cnpj}`, {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "multiplus-software", Accept: "application/json" },
    });

    if (resposta.status === 404) return { encontrado: false };
    if (!resposta.ok) return null;

    // A API retorna campos em snake_case; o restante do sistema recebe um formato estável.
    const dados = (await resposta.json()) as BrasilApiCnpjResposta;
    return {
      encontrado: true,
      razaoSocial: dados.razao_social,
      endereco: formatarEndereco(dados),
    };
  } catch {
    return null;
  }
}

function formatarEndereco(dados: BrasilApiCnpjResposta): string {
  // Campos ausentes não deixam vírgulas sobrando no endereço mostrado ao usuário.
  return [dados.logradouro, dados.numero, dados.bairro, dados.municipio, dados.uf]
    .filter(Boolean)
    .join(", ");
}
