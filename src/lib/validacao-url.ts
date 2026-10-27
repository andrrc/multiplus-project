/** Valida links externos antes de persistir, aceitando exclusivamente HTTP e HTTPS. */
export function validarUrlHttp(valor: string, mensagem = "Informe um link válido (http ou https).") {
  // Remove espaços externos, mas preserva a URL que será persistida para a pessoa usuária.
  const link = valor.trim();
  // Campo vazio também é inválido para esta função: ela valida links obrigatórios.
  if (!link) throw new Error(mensagem);

  try {
    // O construtor rejeita URLs malformadas, como texto sem esquema.
    const url = new URL(link);
    // Bloqueia javascript:, data: e outros esquemas que poderiam executar conteúdo no navegador.
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error(mensagem);
    return link;
  } catch {
    // Apresenta uma mensagem única tanto para URL malformada quanto para esquema proibido.
    throw new Error(mensagem);
  }
}
