/** Formatação de exibição para dados armazenados com ou sem máscara. */
import type { TipoCliente } from "@prisma/client";

/** RF-034 — CNPJ (PJ) ou CPF (PF), formatado, conforme o tipo do cliente. */
export function documentoCliente(cliente: {
  tipo: TipoCliente;
  cnpj: string | null;
  cpf: string | null;
}): string {
  // Escolhe o documento pelo tipo cadastrado e usa travessão quando o campo está ausente.
  if (cliente.tipo === "PESSOA_JURIDICA") return cliente.cnpj ? formatarCnpj(cliente.cnpj) : "—";
  return cliente.cpf ? formatarCpf(cliente.cpf) : "—";
}

/** Identificador sequencial do cliente, com no mínimo dois dígitos. */
export function numeroCliente(numero: number): string {
  // Mantém a ordenação visual uniforme sem limitar números que já tenham mais dígitos.
  return String(numero).padStart(2, "0");
}

export function formatarCnpj(cnpj: string): string {
  // Não aplica a máscara se o valor não tiver o tamanho esperado.
  if (cnpj.length !== 14) return cnpj;
  // Separa raiz, filial e verificadores conforme a apresentação nacional.
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

export function formatarCpf(cpf: string): string {
  // Preserva entradas incompletas para que a exibição não invente separadores.
  if (cpf.length !== 11) return cpf;
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function formatarTelefone(telefone: string): string {
  // Normaliza prefixo internacional e máscara antes de decidir o formato de saída.
  const digitos = normalizarDigitosTelefone(telefone);
  // Apenas celulares nacionais completos recebem a máscara padronizada.
  return digitos.length === 11 ? mascararTelefone(digitos) : telefone;
}

export function normalizarDigitosTelefone(valor: string): string {
  // Descarta espaços, sinais e parênteses mantendo apenas algarismos.
  const digitos = valor.replace(/\D/g, "");
  // Remove o código do Brasil quando a entrada contém o prefixo internacional completo.
  return digitos.length === 13 && digitos.startsWith("55") ? digitos.slice(2) : digitos;
}

/** Campos de telefone do sistema recebem exclusivamente celular nacional com 11 dígitos. */
export function validarTelefoneCelular(valor: string): boolean {
  // O formato aceito pelo sistema é DDD mais nove dígitos de celular.
  return normalizarDigitosTelefone(valor).length === 11;
}

/** Máscara progressiva para celular brasileiro; aceita colagem com o prefixo +55. */
export function mascararTelefone(valor: string): string {
  // A máscara trabalha sobre o valor normalizado, inclusive quando veio com +55.
  const digitos = normalizarDigitosTelefone(valor);
  if (!digitos) return "";
  // Evita criar uma apresentação enganosa quando a entrada excede o tamanho permitido.
  if (digitos.length > 11) return digitos;
  // Enquanto o DDD está sendo digitado, mostra o parêntese sem completar o restante.
  if (digitos.length <= 2) return `(${digitos}`;
  // Separa DDD e número para inserir a máscara progressivamente.
  const ddd = digitos.slice(0, 2);
  const celular = digitos.slice(2);
  if (digitos.length <= 7) return `(${ddd}) ${celular}`;
  // Depois do quinto dígito do celular, inclui o hífen antes dos quatro finais.
  return `(${ddd}) ${celular.slice(0, 5)}-${celular.slice(5)}`;
}

/** Valor armazenado com duas casas decimais, exibido no padrão monetário brasileiro. */
export function formatarMoeda(valor: { toString(): string } | string | number): string {
  // Converte entradas Prisma, texto ou número e usa o padrão brasileiro em reais.
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(valor.toString()),
  );
}

/** Máscara ao vivo pro campo de CPF (onChange) — formata progressivamente enquanto digita. */
export function mascararCpf(valor: string): string {
  // Limita a dezena de dígitos e aplica separadores apenas quando os grupos existem.
  return valor
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/** Máscara ao vivo pro campo de CNPJ (onChange) — formata progressivamente enquanto digita. */
export function mascararCnpj(valor: string): string {
  // Limita o campo ao tamanho do CNPJ e formata cada grupo à medida que é digitado.
  return valor
    .replace(/\D/g, "")
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}
