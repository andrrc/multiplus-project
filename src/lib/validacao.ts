/** Validação de formato genérica, reaproveitada por cliente e Pessoas Envolvidas (RF-002d/RF-028). */

/** Checagem de formato simples (não confirma existência real do endereço). */
export function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
