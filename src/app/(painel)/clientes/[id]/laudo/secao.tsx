import Link from "next/link";
import type { ContextoUsuario } from "@/lib/prisma-app";
import { buscarLaudoTecnico, listarAnotacoesLaudo } from "@/lib/laudos-tecnicos";
import { TIPOS_LAUDO } from "@/lib/validacao-laudo";
import { formatarDataHoraBrasilia } from "@/lib/datas";
import { inputClass } from "@/ui/campo";
import { FormularioAnotacaoLaudo, AcoesAnotacaoLaudo } from "./anotacoes";

export async function SecaoLaudo({ ctx, clienteId, clienteAtivo, busca, desativados, pagina, desativadosCliente }: { ctx: ContextoUsuario; clienteId: string; clienteAtivo: boolean; busca?: string; desativados?: string; pagina?: string; desativadosCliente?: string }) {
  if (ctx.perfil !== "ADMIN") return null;
  const laudo = await buscarLaudoTecnico(ctx, clienteId);
  const mostrar = desativados === "1";
  const visivel = laudo && (laudo.ativo || mostrar);
  const historico = visivel ? await listarAnotacoesLaudo(ctx, clienteId, laudo.id, busca, mostrar, Number(pagina ?? 1)) : null;
  const editavel = clienteAtivo && laudo?.ativo;
  const urlPagina = (n: number) => { const p = new URLSearchParams(); if (busca) p.set("laudoBusca", busca); if (mostrar) p.set("laudoDesativados", "1"); if (desativadosCliente) p.set("desativados", desativadosCliente); p.set("laudoPagina", String(n)); return `/clientes/${clienteId}?${p}#laudo-tecnico`; };
  return <section id="laudo-tecnico" className="font-[family-name:var(--font-interface)] min-w-0 rounded-[3px] border border-linha bg-branco p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-[16px]">Laudo técnico</h2>{clienteAtivo && <Link href={`/clientes/${clienteId}/editar`} className="flex min-h-11 items-center text-azul-esc">{laudo ? "Editar dados do laudo" : "Cadastrar laudo"}</Link>}</div>
    <form method="get" action={`/clientes/${clienteId}#laudo-tecnico`} className="my-4 flex flex-wrap items-end gap-3">
      {desativadosCliente && <input type="hidden" name="desativados" value={desativadosCliente} />}
      {laudo && <label className="min-w-0 w-full flex-none text-[14px] sm:w-auto sm:flex-1">Buscar nas anotações e links<input type="search" name="laudoBusca" defaultValue={busca} className={inputClass} /></label>}
      <label className="flex min-h-11 items-center gap-2 text-[14px]"><input type="checkbox" name="laudoDesativados" value="1" defaultChecked={mostrar} className="accent-verde" />Mostrar desativados</label>
      <button className="min-h-11 rounded-[3px] border border-linha px-4 text-[14px]">Aplicar</button>
    </form>
    {!visivel ? <p className="text-cinza">{laudo ? "Laudo desativado. Marque Mostrar desativados para consultar o histórico." : "Nenhum laudo técnico cadastrado."}</p> : <>
      <dl className="mb-5 grid min-w-0 gap-3 font-[family-name:var(--font-interface)] text-[14px] sm:grid-cols-2"><div className="min-w-0 sm:col-span-2"><dt className="text-cinza">Nome do laudo</dt><dd className="break-words">{laudo.nome}</dd></div><div><dt className="text-cinza">Tipo</dt><dd>{TIPOS_LAUDO[laudo.tipo]}</dd></div><div><dt className="text-cinza">Responsável</dt><dd className="break-words">{laudo.responsavel.nome}{!laudo.responsavel.ativo || !["ADMIN", "ADMIN_INTERNO"].includes(laudo.responsavel.perfil) ? " (indisponível para novas escolhas)" : ""}</dd></div></dl>
      {!editavel && <p className="mb-4 text-ambar">{!clienteAtivo ? "Cliente desativado." : "Laudo desativado."} Somente leitura. Reative pelo cadastro para fazer alterações.</p>}
      {editavel && <FormularioAnotacaoLaudo clienteId={clienteId} laudoId={laudo.id} />}
      <div className="mt-6"><h3 className="font-[family-name:var(--font-interface)] text-[15px]">Histórico de anotações</h3></div>
      {historico?.itens.length === 0 && <p className="mt-3 text-cinza">{busca ? "Nenhuma anotação encontrada para esta busca." : "Nenhuma anotação para exibir."}</p>}
      <ul className="mt-3 flex min-w-0 flex-col gap-4">{historico?.itens.map((nota) => <li key={`${nota.id}-${nota.versao}`} className="min-w-0 rounded-[3px] border border-linha bg-papel p-4">
        <p className="break-words font-[family-name:var(--font-interface)] text-[12px] text-cinza">{nota.autor.nome} · <span className="tabular-nums">{formatarDataHoraBrasilia(nota.criadoEm)}</span>{nota.versao > 1 && <> · Última atualização: <span className="tabular-nums">{formatarDataHoraBrasilia(nota.atualizadoEm)}</span></>}{!nota.ativo && " · Desativada"}</p>
        {nota.texto && <p className="mt-2 whitespace-pre-wrap break-words font-[family-name:var(--font-leitura)]">{nota.texto}</p>}
        <ul className="mt-2 flex flex-col gap-1">{nota.links.map((link) => <li key={link.id} className="min-w-0"><a href={link.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 max-w-full items-center break-all text-[14px] text-azul-esc underline">{link.url}</a></li>)}</ul>
        {editavel && <AcoesAnotacaoLaudo clienteId={clienteId} laudoId={laudo.id} anotacao={nota} />}
      </li>)}</ul>
      {historico && <nav aria-label="Páginas de anotações" className="mt-4 flex flex-wrap items-center gap-4 text-[14px]">{historico.pagina > 1 && <Link className="flex min-h-11 items-center text-azul-esc" href={urlPagina(historico.pagina - 1)}>Anterior</Link>}<span className="tabular-nums">Página {historico.pagina} de {historico.paginas} · {historico.total} registros</span>{historico.pagina < historico.paginas && <Link className="flex min-h-11 items-center text-azul-esc" href={urlPagina(historico.pagina + 1)}>Próxima</Link>}</nav>}
    </>}
  </section>;
}
