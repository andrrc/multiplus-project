/**
 * Campo "Buscar cliente, projeto ou tarefa": um formulário GET para `/busca?q=`, que funciona sem JavaScript.
 * Aparece na barra superior (desktop) e no topo da própria página de busca (celular).
 */
const ICONE = <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" className="pointer-events-none absolute left-[11px] top-1/2 -translate-y-1/2 text-faint" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;

export function CampoBusca({ valorInicial = "" }: { valorInicial?: string }) {
  return (
    <form action="/busca" method="get" role="search" className="relative w-full">
      {ICONE}
      <input
        type="search"
        name="q"
        defaultValue={valorInicial}
        maxLength={100}
        placeholder="Buscar cliente, projeto ou tarefa"
        aria-label="Buscar no sistema"
        className="h-11 w-full rounded-controle border border-linha-forte bg-papel pl-9 pr-3 font-[family-name:var(--font-interface)] text-sm text-ink placeholder:text-cinza focus:border-azul focus:bg-branco focus:outline-none focus:ring-[3px] focus:ring-azul/15 md:h-10"
      />
    </form>
  );
}
