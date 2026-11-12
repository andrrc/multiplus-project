/**
 * Página da rota `src/app/(painel)/meus-projetos/page.tsx`. Recebe os parâmetros da URL ou da rota, valida o acesso no servidor, obtém os dados necessários e compõe a resposta visual; as regras de negócio permanecem nas funções de domínio chamadas por ela.
 */
import Link from "next/link";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { listarProjetosAtribuidos } from "@/lib/projetos-tarefas";
import { Etiqueta } from "@/ui/campo";
import { IndicadorSemaforoProjeto } from "@/ui/indicador-dias-restantes";
import { buscarLimitesSemaforo } from "@/lib/semaforo";
import { calcularPercentualConclusao } from "@/lib/regras-projetos-tarefas";
import { IndicadorConclusao } from "@/ui/indicador-conclusao";
import { codigoProjeto } from "@/lib/identificadores-hierarquicos";
const status: Record<string, string> = { A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", CANCELADO: "Cancelado" };
const data = (v: Date | null) => v ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(v) : "Não informada";

export default async function MeusProjetosPage() {
  const ctx = await exigirAcessoARota("/meus-projetos");
  const [projetos, limites] = await Promise.all([listarProjetosAtribuidos(ctx), buscarLimitesSemaforo(ctx)]);

  return (
    <div className="w-full max-w-[1280px]">
      <h1 className="text-[24px] sm:text-[28px]">Meus projetos</h1>
      <p className="mt-1.5 text-[15px] text-cinza">Projetos em que você possui uma tarefa ou subtarefa atribuída.</p>
      {projetos.length === 0 ? (
        <div className="mt-7 rounded-[3px] border border-linha bg-branco px-6 py-14 text-center text-[15px] text-cinza">Nenhum projeto com tarefa ou subtarefa atribuída a você ainda.</div>
      ) : (
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {projetos.map((p) => {
            const conclusao = calcularPercentualConclusao(p.tarefas);
            return (
            <Link key={p.id} href={`/meus-projetos/${p.id}`} className="block min-w-0 rounded-[3px] border border-linha bg-branco p-5 hover:border-azul-esc">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="break-words text-[17px] font-semibold text-tinta">{p.nome}</h2>
                  <p className="mt-1 break-all text-[12px] tabular-nums text-cinza">ID {codigoProjeto(p.cliente.numeroIdentificacao, p.numeroLocal)}</p>
                  <p className="mt-1 break-words text-[14px] text-cinza">{p.cliente.razaoSocial}</p>
                </div>
                <Etiqueta>{status[p.status]}</Etiqueta>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-linha pt-4 text-[13px] sm:grid-cols-3">
                <div><dt className="text-cinza">Tarefas</dt><dd className="mt-1 tabular-nums">{p.tarefas.length}</dd></div>
                <div><dt className="text-cinza">Conclusão</dt><dd className="mt-1">{conclusao.percentual === null ? "Sem tarefas ativas" : <IndicadorConclusao indicador={conclusao} />}</dd></div>
                <div><dt className="text-cinza">Conclusão prevista</dt><dd className="mt-1 tabular-nums">{data(p.dataPrevistaConclusao)}</dd></div>
              </dl>
              <div className="mt-4"><IndicadorSemaforoProjeto prazo={p.dataPrevistaConclusao} status={p.status} limites={limites} /></div>
            </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
