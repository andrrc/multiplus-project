import { NextResponse } from "next/server";
import { auth } from "@/server/auth";

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
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
