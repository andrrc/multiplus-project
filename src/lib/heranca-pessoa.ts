/**
 * Módulo isolado (sem dependência de Prisma/servidor) para poder ser importado tanto
 * pelo backend (src/lib/clientes.ts) quanto pelo formulário client-side (herança de
 * dados ao vivo, enquanto o usuário digita) — ver RF-027.
 */
/** RF-002d — todos os campos são opcionais (só validação de formato quando preenchidos). */
export type DadosPessoa = {
  nome: string;
  endereco: string;
  rg: string;
  cpf: string;
  telefone: string;
  email: string;
};

export const PESSOA_VAZIA: DadosPessoa = {
  nome: "",
  endereco: "",
  rg: "",
  cpf: "",
  telefone: "",
  email: "",
};

/** RF-027 — dados do Ponto de Contato quando ele é a mesma pessoa do Responsável Legal. */
export function heredarDadosPontoContato(
  responsavelLegal: DadosPessoa,
  cargo: string,
): DadosPessoa & { cargo?: string } {
  return { ...responsavelLegal, cargo };
}

type DadosPessoaLimpos = { [K in keyof DadosPessoa]?: string };

/**
 * RF-002d — campos em branco viram `undefined` (NULL no banco), não string vazia
 * persistida. `cpf` sai já sem máscara, pronto pra gravar.
 */
export function limparDadosPessoa<T extends DadosPessoa>(
  pessoa: T,
  normalizarCpf: (cpf: string) => string,
): DadosPessoaLimpos & Omit<T, keyof DadosPessoa> {
  const { nome, endereco, rg, cpf, telefone, email, ...resto } = pessoa;
  return {
    ...resto,
    nome: nome.trim() || undefined,
    endereco: endereco.trim() || undefined,
    rg: rg.trim() || undefined,
    cpf: cpf.trim() ? normalizarCpf(cpf) : undefined,
    telefone: telefone.trim() || undefined,
    email: email.trim() || undefined,
  } as DadosPessoaLimpos & Omit<T, keyof DadosPessoa>;
}
