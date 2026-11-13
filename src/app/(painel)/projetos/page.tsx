/**
 * Página da rota `src/app/(painel)/projetos/page.tsx`. Recebe os parâmetros da URL ou da rota, valida o acesso no servidor, obtém os dados necessários e compõe a resposta visual; as regras de negócio permanecem nas funções de domínio chamadas por ela.
 */
import Link from "next/link";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { listarProjetos } from "@/lib/projetos-tarefas";
import { formatarMoeda } from "@/lib/formatacao";
import { Etiqueta, inputClass } from "@/ui/campo";
import { IndicadorSemaforoProjeto } from "@/ui/indicador-dias-restantes";
import { buscarLimitesSemaforo } from "@/lib/semaforo";
import { calcularPercentualConclusao } from "@/lib/regras-projetos-tarefas";
import { IndicadorConclusao } from "@/ui/indicador-conclusao";
import { RolagemHorizontal } from "@/ui/rolagem-horizontal";
import { codigoProjeto } from "@/lib/identificadores-hierarquicos";

const status: Record<string, string> = { A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", CANCELADO: "Cancelado" };
const data = (v: Date | null) => v ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(v) : "—";

export default async function ProjetosPage({ searchParams }: { searchParams: Promise<{ desativados?: string; busca?: string }> }) {
  const ctx = await exigirAcessoARota("/projetos");
  const { desativados, busca } = await searchParams;
  const incluir = desativados === "1";
  const [projetos, limites] = await Promise.all([listarProjetos(ctx, incluir, busca), buscarLimitesSemaforo(ctx)]);

  return (
    <div className="w-full max-w-[1280px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[24px]">Projetos</h1>
        <Link href="/projetos/novo" className="flex min-h-11 items-center rounded-controle bg-tinta px-5 py-2.5 font-[family-name:var(--font-interface)] text-[14px] font-semibold text-branco hover:bg-tinta2">+ Novo projeto</Link>
      </div>

      <form className="mt-6 flex flex-wrap items-center gap-3 rounded-cartao border border-linha bg-branco p-4">
        <input type="search" name="busca" defaultValue={busca ?? ""} placeholder="Buscar projeto, cliente ou proposta" className={`${inputClass} sm:max-w-sm`} />
        <label className="flex min-h-11 items-center gap-2 text-[14px] text-tinta"><input type="checkbox" name="desativados" value="1" defaultChecked={incluir} className="h-4 w-4 accent-verde" />Mostrar desativados</label>
        <button className="min-h-11 rounded-controle border border-linha px-4 text-[14px] font-medium hover:border-azul">Filtrar</button>
      </form>

      <p className="mt-4 text-[13px] text-cinza" aria-live="polite">{projetos.length} {projetos.length === 1 ? "projeto encontrado" : "projetos encontrados"}</p>

      {projetos.length === 0 ? (
        <div className="mt-8 rounded-controle border border-linha bg-branco px-8 py-14 text-center text-[16px] text-cinza">Nenhum projeto encontrado. Cadastre o primeiro para começar a acompanhar prazos ambientais.</div>
      ) : <>
        <ul className="mt-7 flex flex-col gap-3 md:hidden">
          {projetos.map((p) => (
            <li key={p.id}>
              <article className="relative block rounded-cartao border border-linha bg-branco px-4 py-4 hover:border-azul">
                <Link href={`/projetos/${p.id}`} aria-label={`Abrir projeto ${p.nome}`} className="absolute inset-0 z-0 rounded-controle">
                  <span className="sr-only">Abrir projeto {p.nome}</span>
                </Link>
                <div className="pointer-events-none relative z-10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-[family-name:var(--font-interface)] font-semibold text-tinta">{p.nome}</p>
                      <p className="mt-1 whitespace-nowrap font-[family-name:var(--font-interface)] text-[12px] tabular-nums text-cinza">ID {codigoProjeto(p.cliente.numeroIdentificacao, p.numeroLocal)}</p>
                      <Link href={`/clientes/${p.cliente.id}`} className="pointer-events-auto relative z-20 mt-1 inline-block text-[14px] text-azul-esc hover:underline">{p.cliente.razaoSocial}</Link>
                    </div>
                    <Etiqueta tom={p.ativo ? "padrao" : "apagado"}>{p.ativo ? status[p.status] : "Desativado"}</Etiqueta>
                  </div>
                  <p className="mt-4 text-[13px] text-cinza">Valor contratado: <strong className="font-medium text-tinta">{p.valorContratado ? formatarMoeda(p.valorContratado.valorContratado) : "Não informado"}</strong></p>
                  <p className="mt-1 text-[13px] text-cinza">Proposta comercial: <strong className="font-medium text-tinta">{p.numeroProposta ?? "—"}</strong></p>
                  <p className="mt-1 text-[13px] text-cinza">Conclusão prevista: <strong className="font-medium text-tinta">{data(p.dataPrevistaConclusao)}</strong> · {p._count.tarefas} {p._count.tarefas === 1 ? "tarefa" : "tarefas"}</p>
                  <p className="mt-1 text-[13px] text-cinza">Conclusão: <IndicadorConclusao indicador={calcularPercentualConclusao(p.tarefas)} /></p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-cinza"><span>Dias restantes:</span><IndicadorSemaforoProjeto prazo={p.dataPrevistaConclusao} status={p.status} ativo={p.ativo} limites={limites} /></div>
                </div>
              </article>
            </li>
          ))}
        </ul>

        <RolagemHorizontal className="mt-7 hidden md:block rounded-controle border border-linha bg-branco" rotulo="Tabela de projetos">
          <table className="w-full table-fixed border-collapse text-left font-[family-name:var(--font-interface)] text-[13px]">
            <thead><tr className="bg-papel text-cinza"><th className="w-[27%] px-4 py-3 text-[11px] uppercase">Projeto</th><th className="w-[20%] px-4 py-3 text-[11px] uppercase">Cliente</th><th className="w-[20%] px-4 py-3 text-[11px] uppercase">Proposta e valor</th><th className="w-[15%] px-4 py-3 text-[11px] uppercase">Situação</th><th className="w-[18%] px-4 py-3 text-[11px] uppercase">Prazo</th></tr></thead>
            <tbody>{projetos.map((p) => <tr key={p.id} className="border-t border-linha bg-branco align-top hover:bg-papel">
              <td className="break-words px-4 py-4"><Link href={`/projetos/${p.id}`} className="inline-flex min-h-11 items-center font-semibold text-tinta hover:text-azul-esc hover:underline">{p.nome}</Link><p className="mt-1 break-all text-[12px] tabular-nums text-cinza">{codigoProjeto(p.cliente.numeroIdentificacao, p.numeroLocal)}</p></td>
              <td className="break-words px-4 py-4"><Link href={`/clientes/${p.cliente.id}`} className="inline-flex min-h-11 items-center text-azul-esc hover:underline">{p.cliente.razaoSocial}</Link></td>
              <td className="break-words px-4 py-4 tabular-nums"><p>{p.numeroProposta ?? "Não informada"}</p><p className="mt-1 text-cinza">{p.valorContratado ? formatarMoeda(p.valorContratado.valorContratado) : "Valor não informado"}</p></td>
              <td className="break-words px-4 py-4"><Etiqueta tom={p.ativo ? "padrao" : "apagado"}>{p.ativo ? status[p.status] : "Desativado"}</Etiqueta><p className="mt-2 text-cinza">Conclusão: <IndicadorConclusao indicador={calcularPercentualConclusao(p.tarefas)} /></p></td>
              <td className="break-words px-4 py-4 tabular-nums"><p>{p.dataPrevistaConclusao ? data(p.dataPrevistaConclusao) : "Sem prazo"}</p><div className="mt-2"><IndicadorSemaforoProjeto prazo={p.dataPrevistaConclusao} status={p.status} ativo={p.ativo} limites={limites} /></div></td>
            </tr>)}</tbody>
          </table>
        </RolagemHorizontal>
      </>}
    </div>
  );
}
