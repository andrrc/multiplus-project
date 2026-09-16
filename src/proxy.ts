import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { perfilPodeAcessar, telaInicial } from "@/lib/navegacao";

const ROTAS_PUBLICAS = ["/login", "/esqueci-senha", "/definir-senha"];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const isRotaPublica = ROTAS_PUBLICAS.some((rota) => pathname.startsWith(rota));

  if (!isLoggedIn && !isRotaPublica) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  // RF-043 — acesso direto por URL a rota fora do perfil. Isto é a checagem otimista: o
  // proxy é o lugar errado para ser a única autorização (a própria documentação do Next
  // diz isso), então cada página protegida repete a verificação no servidor via
  // `exigirAcessoARota`, e a RLS continua sendo a última palavra sobre os dados.
  const perfil = req.auth?.user?.perfil;
  if (isLoggedIn && perfil && !isRotaPublica && !perfilPodeAcessar(perfil, pathname)) {
    return NextResponse.redirect(new URL(telaInicial(perfil), req.nextUrl.origin));
  }
});

export const config = {
  // Precisa ser um literal: o Next extrai este objeto em tempo de build, sem executar os
  // imports do módulo — uma constante importada aqui vira `ReferenceError` em toda
  // requisição. O mesmo padrão está em `PADRAO_ROTAS_DO_PROXY` (src/lib/navegacao.ts), que
  // é o que os testes exercitam; há um teste que falha se os dois divergirem.
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
