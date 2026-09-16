import type { Perfil } from "@prisma/client";
import { auth, signOut } from "@/server/auth";
import { menuDoPerfil } from "@/lib/navegacao";
import { NavLink } from "./nav-link";
import { MenuMobile } from "./menu-mobile";

/**
 * Rótulos exibidos ao usuário (reunião de aprovação da Sprint 2) — os valores do enum
 * `Perfil` no banco (ADMIN_INTERNO/ADMIN_EXTERNO) não mudam, só o texto na UI/e-mails.
 * O perfil da Talita continua "Administrador".
 */
const NOME_PERFIL: Record<string, string> = {
  ADMIN: "Administrador",
  ADMIN_INTERNO: "Colaborador Interno",
  ADMIN_EXTERNO: "Colaborador Externo",
  CLIENTE: "Cliente",
};

/** RF-043 — o menu mostra só o que o perfil acessa; item inacessível não aparece. */
function Navegacao({ perfil }: { perfil: Perfil }) {
  return (
    <>
      {menuDoPerfil(perfil).map((item) => (
        <NavLink key={item.href} href={item.href}>
          {item.rotulo}
        </NavLink>
      ))}
    </>
  );
}

function BlocoUsuario({ nome, perfil }: { nome?: string | null; perfil: string }) {
  return (
    <>
      <p className="truncate font-[family-name:var(--font-interface)] text-[13px] font-medium text-branco">
        {nome}
      </p>
      <p className="mt-0.5 text-[12px] tracking-[0.02em] text-menu-inativo">
        {NOME_PERFIL[perfil] ?? perfil}
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
    </>
  );
}

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const usuario = session!.user;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <MenuMobile
        navegacao={<Navegacao perfil={usuario.perfil} />}
        usuario={<BlocoUsuario nome={usuario.name} perfil={usuario.perfil} />}
      />

      <aside className="relative hidden w-[250px] shrink-0 flex-col bg-tinta lg:flex">
        <div
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: "linear-gradient(112deg, #0499f3 0%, #1ebd1f 130%)" }}
        />

        <div className="px-6 pt-9 pb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-multiplus.png" alt="Múltiplus" width={186} height={51} />
        </div>

        <nav className="flex flex-col gap-0.5 px-3">
          <Navegacao perfil={usuario.perfil} />
        </nav>

        <div className="mt-auto border-t border-[color:var(--tinta2)] px-6 py-5">
          <BlocoUsuario nome={usuario.name} perfil={usuario.perfil} />
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden bg-papel px-5 pt-8 pb-12 sm:px-8 lg:px-16 lg:pt-[52px] lg:pb-16">
        <div className="mx-auto max-w-[1420px]">{children}</div>
      </main>
    </div>
  );
}
