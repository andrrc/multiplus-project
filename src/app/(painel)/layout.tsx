import type { Perfil } from "@prisma/client";
import { auth, signOut } from "@/server/auth";
import { obterContexto } from "@/server/auth/contexto";
import { contarNotificacoesNaoLidas } from "@/lib/notificacoes";
import { podeGerarToastsDemonstracao } from "@/lib/notificacoes-toasts";
import { MenuMobile } from "./menu-mobile";
import { NavegacaoPainel } from "./navegacao-painel";
import { ToastNotifications } from "./toast-notifications";

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
function Navegacao({ perfil, naoLidas }: { perfil: Perfil; naoLidas: number }) {
  return <NavegacaoPainel perfil={perfil} naoLidas={naoLidas} />;
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
          className="min-h-11 font-[family-name:var(--font-interface)] text-[12px] font-medium text-menu-inativo hover:text-branco"
        >
          Sair
        </button>
      </form>
    </>
  );
}

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const ctx = await obterContexto();
  const usuario = session!.user;
  const naoLidas = ctx.perfil === "CLIENTE" ? 0 : await contarNotificacoesNaoLidas(ctx);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <MenuMobile
        navegacao={<Navegacao perfil={ctx.perfil} naoLidas={naoLidas} />}
        usuario={<BlocoUsuario nome={usuario.name} perfil={ctx.perfil} />}
      />

      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col bg-tinta lg:flex">
        <div className="px-6 pt-[26px] pb-[22px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-multiplus.png" alt="Múltiplus" width={172} height={47} />
        </div>

        <nav className="flex flex-1 flex-col overflow-y-auto px-3 pb-4">
          <Navegacao perfil={ctx.perfil} naoLidas={naoLidas} />
        </nav>

        <div className="border-t border-tinta2 px-4 py-3">
          <BlocoUsuario nome={usuario.name} perfil={ctx.perfil} />
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden bg-papel px-4 pt-5 pb-12 sm:px-8 lg:pt-8 lg:pb-16">
        <div className="max-w-[1280px]">{children}</div>
      </main>
      {ctx.perfil !== "CLIENTE" && <ToastNotifications
        usuarioId={ctx.usuarioId}
        versaoSessao={session!.user.versaoSessao}
        perfil={ctx.perfil}
        naoLidasIniciais={naoLidas}
        demoDisponivel={podeGerarToastsDemonstracao(ctx.perfil, process.env.NODE_ENV)}
      />}
    </div>
  );
}
