import type { Perfil } from "@prisma/client";
import { auth, signOut } from "@/server/auth";
import { obterContexto } from "@/server/auth/contexto";
import { contarNotificacoesNaoLidas } from "@/lib/notificacoes";
import { podeGerarToastsDemonstracao } from "@/lib/notificacoes-toasts";
import Link from "next/link";
import { BotaoNovo } from "./botao-novo";
import { CascaPainel } from "./casca-painel";
import { IconePerfil, IconeSair } from "./icones-shell";
import { NavegacaoPainel } from "./navegacao-painel";
import { ToastNotifications } from "./toast-notifications";

/**
 * Rótulos exibidos ao usuário (reunião de aprovação da Sprint 2) — os valores do enum
 * `Perfil` no banco (ADMIN_INTERNO/ADMIN_EXTERNO) não mudam, só o texto na UI/e-mails.
 * O perfil da Talita continua "Administrador".
 */
const NOME_PERFIL: Record<string, string> = {
  ADMIN: "Administrador",
  ADMIN_INTERNO: "Colaborador interno",
  ADMIN_EXTERNO: "Colaborador externo",
  CLIENTE: "Cliente",
};

/** RF-043 — o menu mostra só o que o perfil acessa; item inacessível não aparece. */
function Navegacao({ perfil, naoLidas }: { perfil: Perfil; naoLidas: number }) {
  return <NavegacaoPainel perfil={perfil} naoLidas={naoLidas} />;
}

function BlocoUsuario({ nome, perfil }: { nome?: string | null; perfil: string }) {
  const inicial = (nome ?? "?").trim().charAt(0).toUpperCase();
  const classeIcone =
    "flex h-11 w-11 items-center justify-center rounded-controle text-menu-inativo hover:bg-branco/10 hover:text-branco lg:h-8 lg:w-8";
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-tinta2 font-[family-name:var(--font-interface)] text-sm font-semibold text-branco"
      >
        {inicial}
      </span>
      <div className="min-w-0 leading-snug">
        <p className="truncate font-[family-name:var(--font-interface)] text-sm font-medium text-branco">{nome}</p>
        <p className="text-xs text-menu-inativo">{NOME_PERFIL[perfil] ?? perfil}</p>
      </div>
      <div className="ml-auto flex shrink-0 gap-0.5">
        <Link href="/meu-perfil" title="Meu perfil" aria-label="Meu perfil" className={classeIcone}>
          <IconePerfil />
        </Link>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" title="Sair" aria-label="Sair" className={classeIcone}>
            <IconeSair />
          </button>
        </form>
      </div>
    </div>
  );
}

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const ctx = await obterContexto();
  const usuario = session!.user;
  const naoLidas = ctx.perfil === "CLIENTE" ? 0 : await contarNotificacoesNaoLidas(ctx);

  return (
    <>
      <CascaPainel
        navegacao={<Navegacao perfil={ctx.perfil} naoLidas={naoLidas} />}
        rodape={<BlocoUsuario nome={usuario.name} perfil={ctx.perfil} />}
        acoes={ctx.perfil === "ADMIN" ? <BotaoNovo /> : undefined}
      >
        {children}
      </CascaPainel>
      {ctx.perfil !== "CLIENTE" && <ToastNotifications
        usuarioId={ctx.usuarioId}
        versaoSessao={session!.user.versaoSessao}
        perfil={ctx.perfil}
        naoLidasIniciais={naoLidas}
        demoDisponivel={podeGerarToastsDemonstracao(ctx.perfil, process.env.NODE_ENV)}
      />}
    </>
  );
}
