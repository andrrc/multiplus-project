/** Formatação de exibição — os dados ficam normalizados (só dígitos) no banco. */

export function formatarCnpj(cnpj: string): string {
  if (cnpj.length !== 14) return cnpj;
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

export function formatarCpf(cpf: string): string {
  if (cpf.length !== 11) return cpf;
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function formatarTelefone(telefone: string): string {
  if (telefone.length === 11) return telefone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (telefone.length === 10) return telefone.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return telefone;
}
