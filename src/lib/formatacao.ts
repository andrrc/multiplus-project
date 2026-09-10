/** Formatação de exibição — os dados ficam normalizados (só dígitos) no banco. */
import type { TipoCliente } from "@prisma/client";

/** RF-034 — CNPJ (PJ) ou CPF (PF), formatado, conforme o tipo do cliente. */
export function documentoCliente(cliente: {
  tipo: TipoCliente;
  cnpj: string | null;
  cpf: string | null;
}): string {
  if (cliente.tipo === "PESSOA_JURIDICA") return cliente.cnpj ? formatarCnpj(cliente.cnpj) : "—";
  return cliente.cpf ? formatarCpf(cliente.cpf) : "—";
}

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

/** Máscara ao vivo pro campo de CPF (onChange) — formata progressivamente enquanto digita. */
export function mascararCpf(valor: string): string {
  return valor
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/** Máscara ao vivo pro campo de CNPJ (onChange) — formata progressivamente enquanto digita. */
export function mascararCnpj(valor: string): string {
  return valor
    .replace(/\D/g, "")
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}
