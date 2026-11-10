import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; motivo?: string }>;
}) {
  // No Next atual, searchParams é assíncrono e precisa ser aguardado no Server Component.
  const { callbackUrl, motivo } = await searchParams;
  // O parâmetro permite mostrar motivo de invalidação sem expor detalhes internos.
  const sessaoInvalidada = motivo === "sessao-invalidada";

  return (
    <main className="min-h-screen bg-papel lg:grid lg:grid-cols-[44%_1fr]">
      <aside className="relative hidden min-h-screen flex-col justify-end overflow-hidden bg-tinta px-12 pb-11 text-branco lg:flex">
        <div className="absolute inset-0 bg-[url('/login-painel.jpg')] bg-cover bg-center opacity-20" />
        <div className="relative max-w-md">
          <div className="mb-5 h-[3px] w-10 bg-verde" />
          <h2 className="text-[26px] leading-[1.3]">Prazos, responsáveis e documentos ambientais organizados em um só lugar.</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-branco/80">Acesso da equipe Múltiplus, dos clientes e dos responsáveis designados em cada empresa.</p>
        </div>
      </aside>
      <div className="flex min-h-screen flex-col">
        <div className="flex flex-1 items-start justify-center px-5 py-9 lg:items-center lg:px-6 lg:py-12">
          <div className="w-full max-w-[440px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-multiplus.png" alt="Múltiplus Ambiental" className="mx-auto mb-7 h-auto w-[220px] lg:mb-10 lg:w-[280px]" />
            <h1 className="text-center text-[21px] font-semibold uppercase tracking-[0.045em] lg:text-[25px]">Sistema de Gestão Múltiplus</h1>
            <p className="mt-2 text-center text-[15px] text-cinza">{sessaoInvalidada ? "Sua sessão não é mais válida. Entre novamente com uma conta ativa." : "Entre com o e-mail e a senha cadastrados."}</p>
            <div className="mt-8"><LoginForm callbackUrl={callbackUrl ?? "/"} /></div>
          </div>
        </div>
        <footer className="border-t border-linha px-5 py-4 text-[13px] text-cinza lg:px-8">© 2026 Múltiplus Ambiental</footer>
      </div>
    </main>
  );
}
