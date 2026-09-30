/** Formatação de exibição para dados armazenados com ou sem máscara. */
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

/** Identificador sequencial do cliente, com no mínimo dois dígitos. */
export function numeroCliente(numero: number): string {
  return String(numero).padStart(2, "0");
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
  const digitos = normalizarDigitosTelefone(telefone);
  return digitos.length === 11 ? mascararTelefone(digitos) : telefone;
}

export function normalizarDigitosTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, "");
  return digitos.length === 13 && digitos.startsWith("55") ? digitos.slice(2) : digitos;
}

/** Campos de telefone do sistema recebem exclusivamente celular nacional com 11 dígitos. */
export function validarTelefoneCelular(valor: string): boolean {
  return normalizarDigitosTelefone(valor).length === 11;
}

/** Máscara progressiva para celular brasileiro; aceita colagem com o prefixo +55. */
export function mascararTelefone(valor: string): string {
  const digitos = normalizarDigitosTelefone(valor);
  if (!digitos) return "";
  if (digitos.length > 11) return digitos;
  if (digitos.length <= 2) return `(${digitos}`;
  const ddd = digitos.slice(0, 2);
  const celular = digitos.slice(2);
  if (digitos.length <= 7) return `(${ddd}) ${celular}`;
  return `(${ddd}) ${celular.slice(0, 5)}-${celular.slice(5)}`;
}

/** Valor armazenado com duas casas decimais, exibido no padrão monetário brasileiro. */
export function formatarMoeda(valor: { toString(): string } | string | number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(valor.toString()),
  );
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
