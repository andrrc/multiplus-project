/**
 * Situação do cadastro do cliente (protótipo 06-clientes, botão "Cadastro incompleto").
 *
 * O cadastro é incompleto quando falta o segmento ou a cidade. O segmento é opcional no formulário
 * (RF-002d) e fica guardado como texto vazio; a cidade pode ser nula ou vazia. Texto só com espaços
 * conta como ausente. A regra fica aqui, e não na tela, para a lista e os testes usarem a mesma.
 */
export function clienteIncompleto(cliente: { segmento: string | null; municipio: string | null }): boolean {
  return !cliente.segmento?.trim() || !cliente.municipio?.trim();
}
