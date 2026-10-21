import Link from "next/link";
import type { ContextoUsuario } from "@/lib/prisma-app";
import { buscarLaudoTecnico, listarAnotacoesLaudo } from "@/lib/laudos-tecnicos";
import { TIPOS_LAUDO } from "@/lib/validacao-laudo";
import { formatarDataHoraBrasilia } from "@/lib/datas";
import { IconLeaf, IconUser, IconPencil, IconBrandGoogleDrive, IconExternalLink, IconSearch, IconFilter } from "@tabler/icons-react";
import { inputClass } from "@/ui/campo";
import { NovaAnotacaoLaudo, AcoesAnotacaoLaudo } from "./anotacoes";

export async function SecaoLaudo({ ctx, clienteId, clienteAtivo, busca, desativados, pagina, desativadosCliente }: { ctx: ContextoUsuario; clienteId: string; clienteAtivo: boolean; busca?: string; desativados?: string; pagina?: string; desativadosCliente?: string }) {
  if (ctx.perfil !== "ADMIN") return null;
  const laudo = await buscarLaudoTecnico(ctx, clienteId);
  const mostrar = desativados === "1";
  const visivel = laudo && (laudo.ativo || mostrar);
  const historico = visivel ? await listarAnotacoesLaudo(ctx, clienteId, laudo.id, busca, mostrar, Number(pagina ?? 1)) : null;
  const editavel = clienteAtivo && laudo?.ativo;
  const urlPagina = (n: number) => { const p = new URLSearchParams(); if (busca) p.set("laudoBusca", busca); if (mostrar) p.set("laudoDesativados", "1"); if (desativadosCliente) p.set("desativados", desativadosCliente); p.set("laudoPagina", String(n)); return `/clientes/${clienteId}?${p}#laudo-tecnico`; };
  return <section id="laudo-tecnico" aria-label="Laudo técnico" className="min-w-0 scroll-mt-6 rounded-[3px] border border-linha bg-branco font-[family-name:var(--font-interface)]">
    <header className="border-b border-linha p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-cinza">Laudo técnico</h2>
        {clienteAtivo && <Link href={`/clientes/${clienteId}/editar`} className="inline-flex min-h-11 items-center gap-2 text-[13px] font-medium text-azul-esc hover:underline"><IconPencil size={17} aria-hidden="true" />{laudo ? "Editar dados do laudo" : "Cadastrar laudo"}</Link>}
      </div>
      {visivel ? <>
        <h3 className="mt-3 break-words text-[26px] leading-tight font-semibold tracking-tight text-tinta sm:text-[34px]">{laudo.nome}</h3>
        <dl className="mt-5 flex min-w-0 flex-wrap items-center gap-x-6 gap-y-4 text-[14px]">
          <div className="inline-flex min-h-8 items-center gap-2 rounded-[2px] border border-verde-borda bg-verde-cl px-3 py-1 text-verde-esc"><dt className="sr-only">Tipo</dt><IconLeaf size={17} aria-hidden="true" /><dd>{TIPOS_LAUDO[laudo.tipo]}</dd></div>
          <div className="flex min-w-0 items-start gap-2"><IconUser size={19} className="mt-1 shrink-0 text-cinza" aria-hidden="true" /><div className="min-w-0"><dt className="text-[12px] text-cinza">Responsável</dt><dd className="break-words font-medium">{laudo.responsavel.nome}{!laudo.responsavel.ativo || !["ADMIN", "ADMIN_INTERNO"].includes(laudo.responsavel.perfil) ? <span className="block text-[12px] font-normal text-ambar">Indisponível para novas escolhas</span> : null}</dd></div></div>
        </dl>
      </> : <p className="mt-4 text-[15px] text-cinza">{laudo ? "Laudo desativado. Use Mostrar desativados para consultar o histórico." : "Nenhum laudo técnico cadastrado. Cadastre os dados do laudo para começar o histórico deste cliente."}</p>}
    </header>
    <div className="min-w-0 p-5 sm:p-8">
      {visivel && !editavel && <p className="mb-6 border-l-2 border-ambar bg-papel p-3 text-[14px] text-ambar">{!clienteAtivo ? "Cliente desativado." : "Laudo desativado."} Somente leitura. Reative pelo cadastro para fazer alterações.</p>}
      {visivel && <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h4 className="text-[19px] font-semibold tracking-tight">Histórico de anotações</h4><p className="mt-1 text-[13px] text-cinza">Acompanhe os registros e documentos do laudo.</p></div>{editavel && <NovaAnotacaoLaudo clienteId={clienteId} laudoId={laudo.id} />}</div>}
      {laudo && <form method="get" action={`/clientes/${clienteId}#laudo-tecnico`} className="mb-7 flex min-w-0 flex-wrap items-start gap-2">
        {desativadosCliente && <input type="hidden" name="desativados" value={desativadosCliente} />}
        <div className="flex min-w-0 flex-1 items-center rounded-[3px] border border-linha focus-within:outline-2 focus-within:outline-azul-esc">
          <label className="min-w-0 flex-1"><span className="sr-only">Buscar nas anotações e links</span><input type="search" name="laudoBusca" defaultValue={busca} placeholder="Buscar texto ou link…" className={`${inputClass} mt-0 border-0 bg-branco focus:outline-none`} /></label>
          <button aria-label="Buscar anotações" className="flex min-h-11 min-w-11 items-center justify-center text-azul-esc hover:bg-azul-cl"><IconSearch size={19} aria-hidden="true" /></button>
        </div>
        <details className="group relative">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-[3px] border border-linha px-3 text-[14px] hover:bg-papel [&::-webkit-details-marker]:hidden"><IconFilter size={18} aria-hidden="true" />Filtros{mostrar && <span className="h-2 w-2 rounded-full bg-azul-esc" aria-label="Filtro ativo" />}</summary>
          <div className="absolute right-0 z-10 mt-2 w-60 rounded-[3px] border border-linha bg-branco p-3 shadow-lg"><label className="flex min-h-11 items-center gap-2 text-[14px]"><input type="checkbox" name="laudoDesativados" value="1" defaultChecked={mostrar} className="h-4 w-4 accent-verde" />Mostrar desativados</label><button className="mt-2 min-h-11 w-full rounded-[3px] bg-verde px-3 text-[14px] font-semibold text-tinta">Aplicar filtros</button></div>
        </details>
      </form>}
      {visivel && <>
        {historico?.itens.length === 0 && <div className="border-y border-linha py-8 text-[14px] text-cinza">{busca ? "Nenhuma anotação encontrada. Experimente outro termo ou ajuste os filtros." : "O histórico começa aqui. Use Nova anotação para registrar informações e links do laudo."}</div>}
        <ol className="min-w-0">{historico?.itens.map((nota) => {
          const [data, hora] = formatarDataHoraBrasilia(nota.criadoEm).split(", ");
          return <li key={`${nota.id}-${nota.versao}`} className="relative min-w-0 border-l border-linha pb-7 pl-5 last:pb-0 sm:pl-7">
            <span aria-hidden="true" className={`absolute top-2 -left-[5px] h-[9px] w-[9px] rounded-full ${nota.ativo ? "bg-azul" : "bg-cinza"}`} />
            <article className="relative grid min-w-0 gap-3 border-b border-linha pb-7 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-5">
              <div className="pr-11 text-[12px] text-cinza sm:pr-0"><time dateTime={nota.criadoEm.toISOString()} className="block font-medium tabular-nums text-tinta">{data}<span className="ml-2 font-normal text-cinza sm:ml-0 sm:block">{hora}</span></time><p className="mt-1 break-words">{nota.autor.nome}</p>{!nota.ativo && <span className="mt-2 inline-block rounded-[2px] bg-papel px-2 py-1 text-ambar">Desativada</span>}</div>
              <div className="min-w-0 sm:pr-10">
                {nota.texto && <p className="whitespace-pre-wrap break-words font-[family-name:var(--font-leitura)] text-[17px] leading-relaxed text-tinta">{nota.texto}</p>}
                {nota.links.length > 0 && <ul className="mt-4 flex min-w-0 flex-col gap-2">{nota.links.map((link, indice) => <li key={link.id} className="min-w-0"><a href={link.url} target="_blank" rel="noreferrer" title={link.url} className="flex min-h-11 min-w-0 items-center gap-3 rounded-[3px] border border-linha px-3 py-2 text-[13px] text-azul-esc hover:border-azul hover:bg-azul-cl"><IconBrandGoogleDrive size={21} className="shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block font-medium">Documento do Drive{nota.links.length > 1 ? ` ${indice + 1}` : ""}</span><span className="block truncate text-[11px] text-cinza">{link.url}</span></span><span className="hidden shrink-0 sm:inline">Abrir link</span><IconExternalLink size={16} className="shrink-0" aria-hidden="true" /></a></li>)}</ul>}
                {nota.versao > 1 && <p className="mt-3 text-[11px] text-cinza">Última atualização: <span className="tabular-nums">{formatarDataHoraBrasilia(nota.atualizadoEm)}</span></p>}
              </div>
              {editavel && <div className="absolute top-0 right-0"><AcoesAnotacaoLaudo clienteId={clienteId} laudoId={laudo.id} anotacao={nota} /></div>}
            </article>
          </li>;
        })}</ol>
        {historico && historico.total > 0 && <nav aria-label="Páginas de anotações" className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[12px] text-cinza"><span className="tabular-nums">Página {historico.pagina} de {historico.paginas} · {historico.total} {historico.total === 1 ? "registro" : "registros"}</span><div className="flex gap-4">{historico.pagina > 1 && <Link className="flex min-h-11 items-center text-azul-esc" href={urlPagina(historico.pagina - 1)}>Anterior</Link>}{historico.pagina < historico.paginas && <Link className="flex min-h-11 items-center text-azul-esc" href={urlPagina(historico.pagina + 1)}>Próxima</Link>}</div></nav>}
      </>}
    </div>
  </section>;
}
