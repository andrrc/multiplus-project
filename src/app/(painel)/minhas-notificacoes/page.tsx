/**
 * Página da rota `src/app/(painel)/minhas-notificacoes/page.tsx`. Recebe os parâmetros da URL ou da rota, valida o acesso no servidor, obtém os dados necessários e compõe a resposta visual; as regras de negócio permanecem nas funções de domínio chamadas por ela.
 */
import { listarNotificacoes } from "@/lib/notificacoes";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { botaoSecundario } from "@/ui/botoes";
import { marcarTodasNotificacoesLidasAction } from "../notificacoes/actions";
import { FiltrosAvisos } from "../notificacoes/filtros-avisos";
import { filtrarAvisos, ListaAvisos, OPCOES_TIPO_AVISO } from "../notificacoes/lista-avisos";

export default async function MinhasNotificacoesPage({ searchParams }: { searchParams: Promise<{ lidos?: string | string[]; tipo?: string | string[] }> }) {
  const ctx = await exigirAcessoARota("/minhas-notificacoes");
  const parametros = await searchParams;
  const { itens, naoLidas } = await listarNotificacoes(ctx);
  const { visiveis, apenasNaoLidos, tipo, filtrado } = filtrarAvisos(itens, parametros);

  return <div className="w-full max-w-[900px]">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <h1 className="text-2xl">Avisos</h1>
      {naoLidas > 0 && <form action={marcarTodasNotificacoesLidasAction}><button className={botaoSecundario}>Marcar todas como lidas</button></form>}
    </div>
    <FiltrosAvisos
      key={`${apenasNaoLidos}|${tipo}`}
      rota="/minhas-notificacoes"
      apenasNaoLidosInicial={apenasNaoLidos}
      tipoInicial={tipo}
      opcoesTipo={OPCOES_TIPO_AVISO}
      totalTodos={itens.length}
      totalNaoLidos={naoLidas}
    />
    <ListaAvisos itens={visiveis} filtrado={filtrado} />
  </div>;
}
