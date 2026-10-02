import Link from "next/link";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { listarProjetosPortal } from "@/lib/portal-cliente";
import { Etiqueta } from "@/ui/campo";

const data = (valor: Date | null) => valor
  ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(valor)
  : "Não informada";
const atualizacao = (valor: Date | null) => valor
  ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "UTC" }).format(valor)
  : "Sem movimentação";
const status: Record<string, string> = { A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", CANCELADO: "Cancelado" };

export default async function PortalPage() {
  const ctx = await exigirAcessoARota("/portal");
  const projetos = await listarProjetosPortal(ctx);
  return <div className="w-full max-w-[1120px]">
    <p className="font-[family-name:var(--font-interface)] text-[11px] font-semibold uppercase tracking-[0.12em] text-azul-esc">Área exclusiva</p>
    <h1 className="mt-1 text-[28px]">Acompanhamento dos projetos</h1>
    <p className="mt-1.5 text-[15px] text-cinza">Veja o andamento atualizado dos seus projetos.</p>
    {projetos.length === 0 ? <div className="mt-8 border border-dashed border-linha bg-branco px-6 py-12 text-center text-[15px] text-cinza">Nenhum projeto cadastrado ainda.</div> : <div className="mt-7 grid gap-4 md:grid-cols-2">
      {projetos.map((projeto) => <article key={projeto.id} className="min-w-0 border border-linha border-l-[3px] border-l-azul bg-branco p-5">
        <div className="flex items-start justify-between gap-3"><h2 className="break-words font-[family-name:var(--font-interface)] text-[18px] font-semibold">{projeto.nome}</h2><Etiqueta>{status[projeto.status]}</Etiqueta></div>
        <dl className="mt-5 grid gap-3 text-[14px] sm:grid-cols-2">
          <div><dt className="text-[12px] text-cinza">Conclusão</dt><dd className="mt-1 font-[family-name:var(--font-interface)] font-semibold">{projeto.conclusao.percentual === null ? "Sem tarefas ativas" : `${projeto.conclusao.percentual}% (${projeto.conclusao.concluidas} de ${projeto.conclusao.total})`}</dd></div>
          <div><dt className="text-[12px] text-cinza">Conclusão prevista</dt><dd className="mt-1 font-[family-name:var(--font-interface)] tabular-nums">{data(projeto.dataPrevistaConclusao)}</dd></div>
          <div className="sm:col-span-2"><dt className="text-[12px] text-cinza">Última atualização</dt><dd className="mt-1 font-[family-name:var(--font-interface)] tabular-nums">{atualizacao(projeto.ultimaAtualizacao)}</dd></div>
        </dl>
        <Link href={`/portal/${projeto.id}`} className="mt-5 inline-flex min-h-11 items-center font-[family-name:var(--font-interface)] text-[14px] font-medium text-azul-esc hover:underline">Ver andamento do projeto →</Link>
      </article>)}
    </div>}
  </div>;
}
