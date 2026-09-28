export function montarNumeroProposta(numero: string, ano: string): string | null {
  const numeroNormalizado = numero.trim();
  const anoNormalizado = ano.trim();
  if (!numeroNormalizado && !anoNormalizado) return null;
  if (!/^\d+$/.test(numeroNormalizado) || !/^\d{4}$/.test(anoNormalizado)) {
    throw new Error("Informe o número e o ano da proposta comercial (ex.: 109/2026).");
  }
  return `${numeroNormalizado}/${anoNormalizado}`;
}
