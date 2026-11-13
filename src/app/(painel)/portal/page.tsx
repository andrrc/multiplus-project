/**
 * Painel do cliente (protótipo cliente/01-painel), em `/portal`. Mostra só o que o portal já entrega ao cliente:
 * os projetos próprios com status, progresso, prazo e última atualização. Os dados vêm de `listarProjetosPortal`,
 * que aplica o limite de dados do portal no servidor e no banco; esta página não amplia nada.
 */
import { formatarDataHoraBrasilia } from "@/lib/datas";
import Link from "next/link";
import { auth } from "@/server/auth";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { listarProjetosPortal } from "@/lib/portal-cliente";
import { IndicadorSemaforoProjeto } from "@/ui/indicador-dias-restantes";
import { codigoProjeto } from "@/lib/identificadores-hierarquicos";
import { Cartao } from "@/ui/cartao";
import { AnelProgresso, StatusPonto, Vazio } from "@/ui/lista";

const data = (valor: Date | null) => valor ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(valor) : null;
const atualizacao = (valor: Date | null) => valor ? formatarDataHoraBrasilia(valor) : "Sem movimentação";
const status: Record<string, string> = { A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", CANCELADO: "Cancelado" };

export default async function PortalPage() {
  // A rota valida o perfil antes de buscar dados pelo vínculo clienteId da sessão.
  const ctx = await exigirAcessoARota("/portal");
  const [projetos, sessao] = await Promise.all([listarProjetosPortal(ctx), auth()]);
  const primeiroNome = (sessao?.user?.name ?? "").trim().split(/\s+/)[0] || "cliente";

  const emAndamento = projetos.filter((p) => p.status === "EM_ANDAMENTO");
  const concluidos = projetos.filter((p) => p.status === "CONCLUIDO");
  const tarefasTotal = projetos.reduce((soma, p) => soma + p.conclusao.total, 0);
  const tarefasConcluidas = projetos.reduce((soma, p) => soma + p.conclusao.concluidas, 0);
  const percentual = tarefasTotal === 0 ? null : Math.round((tarefasConcluidas / tarefasTotal) * 100);
  const ultima = projetos.map((p) => p.ultimaAtualizacao).filter((d): d is Date => d !== null).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  return (
    <div className="w-full max-w-[1280px]">
      <div className="mb-6">
        <h1 className="text-2xl">Olá, {primeiroNome}</h1>
        <p className="mt-1 text-sm text-cinza">Acompanhamento dos seus projetos{ultima ? ` · atualizado em ${atualizacao(ultima)}` : ""}.</p>
      </div>

      {projetos.length === 0 ? (
        <Vazio titulo="Nenhum projeto cadastrado ainda." descricao="Quando houver projetos, o andamento aparece aqui." />
      ) : (
        <>
          <section aria-label="Resumo" className="mb-6 flex flex-wrap items-center gap-x-8 gap-y-4 rounded-cartao border border-linha bg-branco px-6 py-5">
            <AnelProgresso percentual={percentual} />
            <div className="min-w-0 flex-1 basis-[240px]">
              <p className="text-lg font-semibold">{tarefasConcluidas} de {tarefasTotal} tarefas concluídas</p>
              <p className="mt-0.5 text-[13px] text-cinza">Somando todos os seus projetos ativos.</p>
            </div>
            <dl className="flex gap-8">
              <div><dt className="text-[12.5px] text-cinza">Em andamento</dt><dd className="mt-0.5 text-[26px] font-semibold leading-tight tabular-nums">{emAndamento.length}</dd></div>
              <div><dt className="text-[12.5px] text-cinza">Concluídos</dt><dd className="mt-0.5 text-[26px] font-semibold leading-tight tabular-nums">{concluidos.length}</dd></div>
            </dl>
          </section>

          <Cartao titulo="Projetos" semMargem>
            <ul>
              {projetos.map((projeto) => (
                <li key={projeto.id} className="relative grid gap-3 border-t border-linha px-5 py-4 first:border-t-0 hover:bg-cabecalho md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center md:gap-6">
                  <div className="min-w-0">
                    <h2 className="text-[15px] font-semibold">
                      <Link href={`/portal/${projeto.id}`} className="break-words before:absolute before:inset-0 before:content-[''] hover:text-azul-esc">{projeto.nome}</Link>
                    </h2>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-cinza">
                      <span className="tabular-nums text-faint">{codigoProjeto(projeto.cliente.numeroIdentificacao, projeto.numeroLocal)}</span>
                      <StatusPonto status={projeto.status}>{status[projeto.status] ?? projeto.status}</StatusPonto>
                    </p>
                    <p className="mt-1 text-xs text-cinza">Última atualização: <span className="tabular-nums">{atualizacao(projeto.ultimaAtualizacao)}</span></p>
                  </div>
                  <div className="min-w-0">
                    <div className="h-1.5 overflow-hidden rounded-full bg-linha" role="img" aria-label={projeto.conclusao.total ? `${projeto.conclusao.concluidas} de ${projeto.conclusao.total} tarefas concluídas` : "Sem tarefas ativas"}>
                      <span className="block h-full bg-verde" style={{ width: `${projeto.conclusao.percentual ?? 0}%` }} />
                    </div>
                    <p className="mt-1.5 text-xs tabular-nums text-cinza">{projeto.conclusao.percentual === null ? "Sem tarefas ativas" : `${projeto.conclusao.percentual}% · ${projeto.conclusao.concluidas} de ${projeto.conclusao.total} tarefas`}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-end md:gap-1">
                    <span className="text-[13px] tabular-nums text-ink">{data(projeto.dataPrevistaConclusao) ?? "Sem previsão"}</span>
                    <IndicadorSemaforoProjeto prazo={projeto.dataPrevistaConclusao} status={projeto.status} />
                  </div>
                </li>
              ))}
            </ul>
          </Cartao>
        </>
      )}
    </div>
  );
}
