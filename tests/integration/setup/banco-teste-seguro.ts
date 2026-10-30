/** Valida URLs antes de criar clientes ou executar operações destrutivas. */
export function validarDestinosDeTeste(ownerUrl?: string, appUrl?: string): void {
  const erro = () => new Error("Configuração insegura do banco de teste: use multiplus_test local com as duas roles corretas.");
  if (!ownerUrl || !appUrl) throw erro();
  let owner: URL;
  let app: URL;
  try {
    owner = new URL(ownerUrl);
    app = new URL(appUrl);
  } catch {
    throw erro();
  }
  const local = (url: URL) =>
    ["postgres:", "postgresql:"].includes(url.protocol) &&
    ["localhost", "127.0.0.1"].includes(url.hostname) &&
    ["/multiplus_test", "/multiplus_test_e2e"].includes(url.pathname) &&
    [...url.searchParams].every(([key, value]) => key === "schema" && value === "public") &&
    !url.hash;
  if (!local(owner) || !local(app) || owner.pathname !== app.pathname || owner.hostname !== app.hostname || (owner.port || "5432") !== (app.port || "5432") ||
      !owner.username || owner.username === "multiplus_app" || app.username !== "multiplus_app") {
    throw erro();
  }
}

export function validarIdentidadesDeTeste(
  owner: { banco: string; servidor: string | null; porta: number | null; usuario: string },
  app: { banco: string; servidor: string | null; porta: number | null; usuario: string },
  bancoEsperado: string,
): void {
  if (owner.banco !== bancoEsperado || app.banco !== bancoEsperado ||
      owner.servidor !== app.servidor || owner.porta !== app.porta ||
      owner.usuario === "multiplus_app" || app.usuario !== "multiplus_app") {
    throw new Error("Identidade insegura do banco de teste: as conexões não correspondem ao destino esperado.");
  }
}

/** Recusa quando um banco de teste coincide com uma URL de uso normal. */
export function validarSeparacaoDeBancos(testUrl: string, urlsAplicacao: Array<string | undefined>): void {
  const destino = (valor: string) => {
    const url = new URL(valor);
    const host = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ? "loopback" : url.hostname;
    return `${host}:${url.port || "5432"}${url.pathname}`;
  };
  try {
    const teste = destino(testUrl);
    if (urlsAplicacao.some((url) => url && destino(url) === teste)) throw new Error();
  } catch {
    throw new Error("Configuração insegura do banco de teste: o destino coincide com a aplicação ou é inválido.");
  }
}
