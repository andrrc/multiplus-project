export function normalizarCnpj(cnpjEntrada: string): string {
  return cnpjEntrada.replace(/\D/g, "");
}

/** Validação por dígito verificador (mod 11) — não confirma existência real do CNPJ. */
export function validarCnpj(cnpjEntrada: string): boolean {
  const cnpj = normalizarCnpj(cnpjEntrada);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const digitos = cnpj.split("").map(Number);
  const pesosDv1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesosDv2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const calcularDigito = (pesos: number[]): number => {
    const soma = pesos.reduce((acc, peso, i) => acc + peso * digitos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

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
  const cnpj = normalizarCnpj(cnpjEntrada);
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
  return [dados.logradouro, dados.numero, dados.bairro, dados.municipio, dados.uf]
    .filter(Boolean)
    .join(", ");
}
