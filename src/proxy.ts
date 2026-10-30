import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { montarCsp } from "@/lib/csp";

const ROTAS_PUBLICAS = ["/login", "/esqueci-senha", "/definir-senha"];

export default auth((req) => {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const politica = montarCsp(nonce, process.env.NODE_ENV !== "production");
  const cabecalhos = new Headers(req.headers);
  cabecalhos.set("Content-Security-Policy", politica);
  cabecalhos.set("x-nonce", nonce);
  const proteger = (resposta: NextResponse) => {
    resposta.headers.set("Content-Security-Policy", politica);
    return resposta;
  };
  // O proxy usa a presença do JWT como verificação rápida para redirecionamentos iniciais.
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  // Rotas de entrada e recuperação devem poder ser abertas sem uma sessão.
  const isRotaPublica = ROTAS_PUBLICAS.some((rota) => pathname.startsWith(rota));
  // Permite exibir a mensagem de sessão invalidada sem redirecionar de volta ao painel.
  const sessaoInvalidada =
    pathname === "/login" && req.nextUrl.searchParams.get("motivo") === "sessao-invalidada";

  if (!isLoggedIn && !isRotaPublica) {
    // Guarda o caminho solicitado para que o login possa continuar o fluxo depois da autenticação.
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return proteger(NextResponse.redirect(url));
  }

  if (isLoggedIn && pathname === "/login" && !sessaoInvalidada) {
    // Usuários autenticados não precisam permanecer na tela de login.
    return proteger(NextResponse.redirect(new URL("/", req.nextUrl.origin)));
  }

  // O proxy só usa o JWT para encaminhar pessoas sem sessão ao login. O perfil no token
  // pode ter ficado antigo; páginas e actions revalidam o contexto no banco, e o RLS
  // continua sendo a última palavra sobre acesso aos dados.
  return proteger(NextResponse.next({ request: { headers: cabecalhos } }));
});

export const config = {
  // Precisa ser um literal: o Next extrai este objeto em tempo de build, sem executar os
  // imports do módulo — uma constante importada aqui vira `ReferenceError` em toda
  // requisição. O mesmo padrão está em `PADRAO_ROTAS_DO_PROXY` (src/lib/navegacao.ts), que
  // é o que os testes exercitam; há um teste que falha se os dois divergirem.
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
