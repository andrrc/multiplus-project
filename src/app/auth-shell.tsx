import type { ReactNode } from "react";

export function AuthShell({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen">
      <div
        className="hidden w-[420px] shrink-0 flex-col justify-between px-12 py-14 lg:flex"
        style={{ background: "linear-gradient(112deg, #0B2530 0%, #14485C 58%, #12703F 130%)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-multiplus.png" alt="Múltiplus" width={186} height={51} />
        <p className="max-w-[30ch] text-[17px] leading-[1.62] text-[#C4DCE4]">
          Controle de clientes, projetos e prazos ambientais da Múltiplus Ambiental.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-papel px-6">
        <div className="w-full max-w-sm">
          <h1 className="text-[22px]">{titulo}</h1>
          <p className="mt-1.5 text-[15px] text-cinza">{subtitulo}</p>
          <div className="mt-7">{children}</div>
        </div>
      </div>
    </main>
  );
}
