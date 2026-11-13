/**
 * Página da rota `src/app/(painel)/notificacoes/page.tsx`. Caixa de avisos da administradora. O status do envio de
 * prazos, o semáforo e as preferências por perfil ficam em Configurações (`/configuracoes`).
 */
import Link from "next/link";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { listarNotificacoes } from "@/lib/notificacoes";
import { podeGerarToastsDemonstracao } from "@/lib/notificacoes-toasts";
import { botaoDiscreto, botaoSecundario } from "@/ui/botoes";
import { BotaoGerarToastsDemonstracao } from "../toast-notifications";
import { marcarTodasNotificacoesLidasAction } from "./actions";
import { FiltrosAvisos } from "./filtros-avisos";
import { filtrarAvisos, ListaAvisos, OPCOES_TIPO_AVISO } from "./lista-avisos";

export default async function NotificacoesPage({ searchParams }: { searchParams: Promise<{ lidos?: string | string[]; tipo?: string | string[] }> }) {
  const ctx = await exigirAcessoARota("/notificacoes");
  const parametros = await searchParams;
  const { itens, naoLidas } = await listarNotificacoes(ctx);
  const demoDisponivel = podeGerarToastsDemonstracao(ctx.perfil, process.env.NODE_ENV);
  const { visiveis, apenasNaoLidos, tipo, filtrado } = filtrarAvisos(itens, parametros);

  return <div className="w-full max-w-[900px]">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <h1 className="text-2xl">Avisos</h1>
      <div className="flex flex-wrap items-center gap-2">
        <BotaoGerarToastsDemonstracao habilitado={demoDisponivel} />
        {naoLidas > 0 && <form action={marcarTodasNotificacoesLidasAction}><button className={botaoSecundario}>Marcar todas como lidas</button></form>}
        <Link href="/configuracoes?aba=notificacoes" className={botaoDiscreto}>Preferências</Link>
      </div>
    </div>
    <FiltrosAvisos
      key={`${apenasNaoLidos}|${tipo}`}
      rota="/notificacoes"
      apenasNaoLidosInicial={apenasNaoLidos}
      tipoInicial={tipo}
      opcoesTipo={OPCOES_TIPO_AVISO}
      totalTodos={itens.length}
      totalNaoLidos={naoLidas}
    />
    <ListaAvisos itens={visiveis} filtrado={filtrado} />
  </div>;
}
