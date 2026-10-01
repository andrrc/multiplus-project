import { NextResponse } from "next/server";
import { auth } from "@/server/auth";

const ROTAS_PUBLICAS = ["/login", "/esqueci-senha", "/definir-senha"];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const isRotaPublica = ROTAS_PUBLICAS.some((rota) => pathname.startsWith(rota));
  const sessaoInvalidada =
    pathname === "/login" && req.nextUrl.searchParams.get("motivo") === "sessao-invalidada";

  if (!isLoggedIn && !isRotaPublica) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && pathname === "/login" && !sessaoInvalidada) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  // O proxy só usa o JWT para encaminhar pessoas sem sessão ao login. O perfil no token
  // pode ter ficado antigo; páginas e actions revalidam o contexto no banco, e o RLS
  // continua sendo a última palavra sobre acesso aos dados.
});

export const config = {
  // Precisa ser um literal: o Next extrai este objeto em tempo de build, sem executar os
  // imports do módulo — uma constante importada aqui vira `ReferenceError` em toda
  // requisição. O mesmo padrão está em `PADRAO_ROTAS_DO_PROXY` (src/lib/navegacao.ts), que
  // é o que os testes exercitam; há um teste que falha se os dois divergirem.
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
