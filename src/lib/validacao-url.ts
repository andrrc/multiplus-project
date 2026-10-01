/** Valida links externos antes de persistir, aceitando exclusivamente HTTP e HTTPS. */
export function validarUrlHttp(valor: string, mensagem = "Informe um link válido (http ou https).") {
  const link = valor.trim();
  if (!link) throw new Error(mensagem);

  try {
    const url = new URL(link);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error(mensagem);
    return link;
  } catch {
    throw new Error(mensagem);
  }
}
