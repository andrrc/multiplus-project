export function normalizarCpf(cpfEntrada: string): string {
  return cpfEntrada.replace(/\D/g, "");
}

/** Validação por dígito verificador (mod 11) — não confirma existência real do CPF. */
export function validarCpf(cpfEntrada: string): boolean {
  const cpf = normalizarCpf(cpfEntrada);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const digitos = cpf.split("").map(Number);

  const calcularDigito = (fatorInicial: number, tamanho: number): number => {
    const soma = digitos
      .slice(0, tamanho)
      .reduce((acc, digito, i) => acc + digito * (fatorInicial - i), 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  return calcularDigito(10, 9) === digitos[9] && calcularDigito(11, 10) === digitos[10];
}
