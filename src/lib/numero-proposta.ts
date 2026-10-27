export function montarNumeroProposta(numero: string, ano: string): string | null {
  // Remove espaços externos para aceitar a digitação sem normalizar o conteúdo interno.
  const numeroNormalizado = numero.trim();
  const anoNormalizado = ano.trim();
  // Os dois campos vazios significam ausência de proposta, e não erro de preenchimento.
  if (!numeroNormalizado && !anoNormalizado) return null;
  // Quando um deles é preenchido, exige número inteiro e ano com exatamente quatro dígitos.
  if (!/^\d+$/.test(numeroNormalizado) || !/^\d{4}$/.test(anoNormalizado)) {
    throw new Error("Informe o número e o ano da proposta comercial (ex.: 109/2026).");
  }
  // A representação persistida é sempre "número/ano".
  return `${numeroNormalizado}/${anoNormalizado}`;
}
