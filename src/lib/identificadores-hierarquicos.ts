/** Formata os identificadores de exibição sem substituir os CUIDs usados internamente. */
const comZeros = (valor: number, largura: number) => String(valor).padStart(largura, "0");

export function codigoProjeto(numeroCliente: number, numeroProjeto: number): string {
  return `PROJ-${comZeros(numeroCliente, 4)}-${comZeros(numeroProjeto, 2)}`;
}

export function codigoTarefa(numeroCliente: number, numeroProjeto: number, numeroTarefa: number): string {
  return `TAR-${comZeros(numeroCliente, 4)}-${comZeros(numeroProjeto, 2)}-${comZeros(numeroTarefa, 3)}`;
}

export function codigoSubtarefa(
  numeroCliente: number,
  numeroProjeto: number,
  numeroTarefa: number,
  numeroSubtarefa: number,
): string {
  return `SUB-${comZeros(numeroCliente, 4)}-${comZeros(numeroProjeto, 2)}-${comZeros(numeroTarefa, 3)}-${comZeros(numeroSubtarefa, 2)}`;
}
