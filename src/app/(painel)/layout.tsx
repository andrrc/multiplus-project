import { auth, signOut } from "@/server/auth";
import { NavLink } from "./nav-link";

const NOME_PERFIL: Record<string, string> = {
  ADMIN: "Administrador",
  ADMIN_INTERNO: "Administrador Interno",
  ADMIN_EXTERNO: "Administrador Externo",
  CLIENTE: "Cliente",
};

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const usuario = session!.user;

  return (
    <div className="flex min-h-screen">
      <aside className="relative flex w-[250px] shrink-0 flex-col bg-tinta">
        <div
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: "linear-gradient(112deg, #0499f3 0%, #1ebd1f 130%)" }}
        />

        <div className="px-6 pt-9 pb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-multiplus.png" alt="Múltiplus" width={186} height={51} />
        </div>

        <nav className="flex flex-col gap-0.5 px-3">
          <NavLink href="/">Painel</NavLink>
          <NavLink href="/clientes">Clientes</NavLink>
        </nav>

        <div className="mt-auto border-t border-[color:var(--tinta2)] px-6 py-5">
          <p className="truncate font-[family-name:var(--font-interface)] text-[13px] font-medium text-branco">
            {usuario.name}
          </p>
          <p className="mt-0.5 text-[12px] tracking-[0.02em] text-menu-inativo">
            {NOME_PERFIL[usuario.perfil] ?? usuario.perfil}
          </p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
            className="mt-3"
          >
            <button
              type="submit"
              className="font-[family-name:var(--font-interface)] text-[12px] font-medium text-menu-inativo hover:text-branco"
            >
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden bg-papel px-8 pt-[52px] pb-16 lg:px-16">
        <div className="mx-auto max-w-[1420px]">{children}</div>
      </main>
    </div>
  );
}
