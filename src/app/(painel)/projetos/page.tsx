import Link from "next/link";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { listarProjetos } from "@/lib/projetos-tarefas";
import { Etiqueta, inputClass } from "@/ui/campo";

const status: Record<string, string> = { A_INICIAR: "A iniciar", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", CANCELADO: "Cancelado" };
const data = (v: Date | null) => v ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(v) : "—";

export default async function ProjetosPage({ searchParams }: { searchParams: Promise<{ desativados?: string }> }) {
  const ctx = await exigirAcessoARota("/projetos");
  const { desativados } = await searchParams;
  const incluir = desativados === "1";
  const projetos = await listarProjetos(ctx, incluir);
  return (
    <div className="w-full max-w-[1120px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="font-[family-name:var(--font-interface)] text-[11px] font-semibold uppercase tracking-[0.12em] text-azul-esc">Controle de projetos</p><h1 className="mt-1 text-[28px]">Projetos</h1><p className="mt-1.5 text-[15px] text-cinza">Acompanhe clientes, prazos e entregas em um só lugar.</p></div>
        <Link href="/projetos/novo" className="flex min-h-11 items-center rounded-[3px] bg-verde px-5 py-2.5 font-[family-name:var(--font-interface)] text-[14px] font-semibold text-tinta hover:bg-verde-esc hover:text-branco">+ Novo projeto</Link>
      </div>
      <form className="mt-7 flex flex-wrap items-center gap-3"><input name="busca" placeholder="Buscar projeto ou cliente" className={`${inputClass} sm:max-w-sm`} /><label className="flex min-h-11 items-center gap-2 text-[14px] text-tinta"><input type="checkbox" name="desativados" value="1" defaultChecked={incluir} className="h-4 w-4 accent-verde" />Mostrar desativados</label><button className="min-h-11 rounded-[3px] border border-linha px-4 text-[14px] font-medium hover:border-azul">Filtrar</button></form>
      {projetos.length === 0 ? <div className="mt-8 rounded-[3px] border border-linha bg-branco px-8 py-14 text-center text-[16px] text-cinza">Nenhum projeto encontrado. Cadastre o primeiro para começar a acompanhar prazos ambientais.</div> : <>
        <ul className="mt-7 flex flex-col gap-3 md:hidden">{projetos.map((p) => <li key={p.id}><Link href={`/projetos/${p.id}`} className="block rounded-[3px] border border-linha bg-branco px-4 py-4 hover:border-azul"><div className="flex items-start justify-between gap-3"><div><p className="font-[family-name:var(--font-interface)] font-semibold text-tinta">{p.nome}</p><p className="mt-1 text-[14px] text-cinza">{p.cliente.razaoSocial}</p></div><Etiqueta tom={p.ativo ? "padrao" : "apagado"}>{p.ativo ? status[p.status] : "Desativado"}</Etiqueta></div><p className="mt-4 text-[13px] text-cinza">Conclusão prevista: <strong className="font-medium text-tinta">{data(p.dataPrevistaConclusao)}</strong> · {p._count.tarefas} {p._count.tarefas === 1 ? "tarefa" : "tarefas"}</p></Link></li>)}</ul>
        <table className="mt-7 hidden w-full border-collapse font-[family-name:var(--font-interface)] text-[14px] md:table"><thead><tr className="bg-tinta text-left text-branco"><th className="rounded-l-[3px] px-5 py-3 text-[11px] uppercase tracking-[0.06em]">Projeto</th><th className="px-5 py-3 text-[11px] uppercase tracking-[0.06em]">Cliente</th><th className="px-5 py-3 text-[11px] uppercase tracking-[0.06em]">Status</th><th className="px-5 py-3 text-[11px] uppercase tracking-[0.06em]">Prazo final</th><th className="rounded-r-[3px] px-5 py-3" /></tr></thead><tbody>{projetos.map((p) => <tr key={p.id} className={`border-t border-linha hover:bg-verde-cl ${p.ativo ? "bg-branco" : "bg-papel"}`}><td className="px-5 py-4 font-medium"><Link href={`/projetos/${p.id}`} className="hover:text-azul-esc">{p.nome}</Link></td><td className="px-5 py-4 text-cinza">{p.cliente.razaoSocial}</td><td className="px-5 py-4"><Etiqueta tom={p.ativo ? "padrao" : "apagado"}>{p.ativo ? status[p.status] : "Desativado"}</Etiqueta></td><td className="px-5 py-4 tabular-nums text-cinza">{data(p.dataPrevistaConclusao)}</td><td className="px-5 py-4 text-right"><Link href={`/projetos/${p.id}`} className="text-azul-esc hover:underline">Ver detalhe</Link></td></tr>)}</tbody></table>
      </>}
    </div>
  );
}
