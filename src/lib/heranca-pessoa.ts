/**
 * Módulo isolado (sem dependência de Prisma/servidor) para poder ser importado tanto
 * pelo backend (src/lib/clientes.ts) quanto pelo formulário client-side (herança de
 * dados ao vivo, enquanto o usuário digita) — ver RF-027.
 */
export type DadosPessoa = {
  nome: string;
  endereco: string;
  rg: string;
  cpf: string;
  telefone: string;
  email: string;
};

/** RF-027 — dados do Ponto de Contato quando ele é a mesma pessoa do Responsável Legal. */
export function heredarDadosPontoContato(
  responsavelLegal: DadosPessoa,
  cargo: string,
): DadosPessoa & { cargo: string } {
  return { ...responsavelLegal, cargo };
}
