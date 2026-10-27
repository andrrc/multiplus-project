export function normalizarCpf(cpfEntrada: string): string {
  // Elimina pontos, hífens e qualquer outro caractere para manter só os dígitos.
  return cpfEntrada.replace(/\D/g, "");
}

/** Validação por dígito verificador (mod 11) — não confirma existência real do CPF. */
export function validarCpf(cpfEntrada: string): boolean {
  const cpf = normalizarCpf(cpfEntrada);
  // CPF precisa de 11 dígitos; sequências repetidas não são números válidos.
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  // A lista numérica permite aplicar os pesos sem converter a cada multiplicação.
  const digitos = cpf.split("").map(Number);

  // Reaproveita o cálculo para o primeiro e o segundo dígito verificador.
  const calcularDigito = (fatorInicial: number, tamanho: number): number => {
    // Multiplica cada posição pelo peso decrescente e soma os produtos.
    const soma = digitos
      .slice(0, tamanho)
      .reduce((acc, digito, i) => acc + digito * (fatorInicial - i), 0);
    // No módulo 11, restos 0 e 1 geram zero; os demais geram 11 menos o resto.
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  // O primeiro verificador usa nove dígitos; o segundo inclui também o primeiro verificador.
  return calcularDigito(10, 9) === digitos[9] && calcularDigito(11, 10) === digitos[10];
}
