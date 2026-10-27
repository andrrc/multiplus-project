/**
 * RF-002c — Estado/Município via API pública de localidades (IBGE), no lugar de texto
 * livre. Mesma categoria de risco documentada no SRS (Seção 6.1) para a consulta de CNPJ:
 * API pública sujeita a instabilidade. Como os campos são opcionais, indisponibilidade não
 * pode bloquear o cadastro — ver fallback de texto livre manual no formulário.
 */

export type Estado = { sigla: string; nome: string };
export type Municipio = { nome: string };

type IbgeEstado = { sigla: string; nome: string };
type IbgeMunicipio = { nome: string };

const BASE_URL = process.env.LOCALIDADES_API_BASE_URL ?? "https://servicodados.ibge.gov.br/api/v1/localidades";

/** `null` sinaliza "serviço indisponível" — mesmo padrão de `consultarCnpj`. */
export async function listarEstados(): Promise<Estado[] | null> {
  try {
    // Ordena no serviço e mantém a resposta em cache por um dia, pois estados mudam raramente.
    const resposta = await fetch(`${BASE_URL}/estados?orderBy=nome`, {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "multiplus-software", Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    // Respostas HTTP de erro seguem o mesmo fallback da indisponibilidade de rede.
    if (!resposta.ok) return null;

    // Reduz a estrutura do IBGE ao formato público usado pelos formulários.
    const dados = (await resposta.json()) as IbgeEstado[];
    return dados.map((e) => ({ sigla: e.sigla, nome: e.nome }));
  } catch {
    return null;
  }
}

export async function listarMunicipiosPorEstado(uf: string): Promise<Municipio[] | null> {
  try {
    // A UF selecionada limita a consulta aos municípios daquele estado.
    const resposta = await fetch(`${BASE_URL}/estados/${uf}/municipios?orderBy=nome`, {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "multiplus-software", Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    // A API pode falhar sem bloquear o cadastro, que também permite preenchimento manual.
    if (!resposta.ok) return null;

    // Mantém somente os nomes, que são os dados necessários ao select do formulário.
    const dados = (await resposta.json()) as IbgeMunicipio[];
    return dados.map((m) => ({ nome: m.nome }));
  } catch {
    return null;
  }
}
