import { exigirAcessoARota } from "@/server/auth/contexto";
import { listarEtiquetasGerenciadas } from "@/lib/etiquetas";
import { CORES_ETIQUETA } from "@/lib/etiqueta-colors";
import { inputClass } from "@/ui/campo";
import { CampoCorEtiqueta } from "@/ui/campo-cor-etiqueta";
import { criarEtiquetaAction, atualizarEtiquetaAction } from "./actions";
import { ExcluirEtiqueta } from "./excluir-etiqueta";

const dataCurta = (data: Date) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(data);

const mensagensErro: Record<string, string> = {
  duplicada: "Já existe uma etiqueta com esse nome. Escolha outro nome.",
  nome: "Informe um nome de 1 a 40 caracteres.",
  cor: "Escolha uma das cores disponíveis.",
  indisponivel: "A etiqueta foi alterada por outra pessoa. Atualize a página e tente novamente.",
  falha: "Não foi possível concluir a alteração. Tente novamente.",
};

const mensagensSucesso: Record<string, string> = {
  criada: "Etiqueta criada e disponível para reutilização.",
  atualizada: "Etiqueta atualizada em todas as subtarefas em que era usada.",
  excluida: "Etiqueta removida do catálogo e das subtarefas relacionadas.",
};

export default async function EtiquetasPage({ searchParams }: { searchParams: Promise<{ erro?: string; resultado?: string; usos?: string }> }) {
  const ctx = await exigirAcessoARota("/etiquetas");
  const params = await searchParams;
  const etiquetas = await listarEtiquetasGerenciadas(ctx);
  const corPadrao = CORES_ETIQUETA[0].fundo;
  const quantidadeUsosExcluidos = Number(params.usos ?? 0);

  return <div className="w-full max-w-[1040px]">
    <header>
      <h1 className="text-[28px]">Etiquetas</h1>
      <p className="mt-1.5 max-w-[66ch] text-[15px] leading-6 text-cinza">Gerencie os nomes e as cores usados nas subtarefas. Cada alteração vale em todos os projetos.</p>
    </header>

    {params.erro && <p role="alert" className="mt-5 border-l-[3px] border-vermelho bg-vermelho-cl px-4 py-3 text-[14px] text-tinta">{mensagensErro[params.erro] ?? mensagensErro.falha}</p>}
    {params.resultado && <p role="status" className="mt-5 border-l-[3px] border-verde-esc bg-verde-cl px-4 py-3 text-[14px] text-tinta">{params.resultado === "excluida" ? `Etiqueta excluída. Removida de ${quantidadeUsosExcluidos} ${quantidadeUsosExcluidos === 1 ? "subtarefa" : "subtarefas"}.` : mensagensSucesso[params.resultado] ?? "Alterações salvas."}</p>}

    <section id="nova-etiqueta" aria-labelledby="titulo-nova-etiqueta" className="mt-8 border border-linha border-t-2 border-t-verde-esc bg-branco p-5 sm:p-6">
      <div className="max-w-[620px]">
        <h2 id="titulo-nova-etiqueta" className="text-[19px]">Criar etiqueta</h2>
        <p className="mt-1 text-[13px] text-cinza">Ela ficará disponível para as subtarefas de qualquer projeto.</p>
        <form action={criarEtiquetaAction} className="mt-5 grid gap-4">
          <label className="grid gap-1.5 text-[13px] font-medium">Nome da etiqueta<input name="nome" required maxLength={40} placeholder="Ex.: Aguardando documento" className={inputClass} /></label>
          <CampoCorEtiqueta inicial={corPadrao} />
          <button className="min-h-11 w-fit rounded-[3px] bg-tinta px-5 font-[family-name:var(--font-interface)] text-[13px] font-semibold text-branco hover:bg-azul-esc">Criar etiqueta</button>
        </form>
      </div>
    </section>

    <section id="catalogo-etiquetas" aria-labelledby="titulo-catalogo-etiquetas" className="mt-9">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-linha pb-3">
        <div><h2 id="titulo-catalogo-etiquetas" className="text-[21px]">Catálogo</h2><p className="mt-1 text-[13px] text-cinza">{etiquetas.length} {etiquetas.length === 1 ? "etiqueta cadastrada" : "etiquetas cadastradas"}</p></div>
      </div>

      {etiquetas.length === 0 ? <div className="mt-4 border border-dashed border-linha bg-branco px-6 py-12 text-center"><p className="text-[15px] font-medium text-tinta">Nenhuma etiqueta cadastrada</p><p className="mt-1 text-[13px] text-cinza">Crie a primeira acima para começar a organizar subtarefas.</p></div> : <ul className="mt-4 divide-y divide-linha border-y border-linha bg-branco">
        {etiquetas.map((etiqueta) => <li id={`etiqueta-${etiqueta.id}`} key={etiqueta.id} className="grid gap-4 px-4 py-5 sm:px-5 lg:grid-cols-[minmax(190px,0.8fr)_minmax(0,1.8fr)] lg:items-start">
          <div className="min-w-0">
            <span className="inline-flex max-w-full items-center rounded-full border border-black/5 px-3 py-1.5 font-[family-name:var(--font-interface)] text-[13px] font-semibold" style={{ backgroundColor: etiqueta.cor, color: CORES_ETIQUETA.find((cor) => cor.fundo === etiqueta.cor)?.texto ?? "#334155" }}>{etiqueta.nome}</span>
            <p className="mt-2 text-[12px] text-cinza">Usada em {etiqueta.quantidadeSubtarefas} {etiqueta.quantidadeSubtarefas === 1 ? "subtarefa" : "subtarefas"} · Criada em {dataCurta(etiqueta.criadoEm)}</p>
          </div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <form action={atualizarEtiquetaAction.bind(null, etiqueta.id)} className="grid min-w-0 gap-3 sm:grid-cols-[minmax(150px,0.8fr)_minmax(260px,1.4fr)_auto] sm:items-end">
              <label className="grid gap-1.5 text-[12px] font-medium">Nome<input name="nome" required maxLength={40} defaultValue={etiqueta.nome} className={inputClass} /></label>
              <CampoCorEtiqueta inicial={etiqueta.cor} />
              <button className="min-h-10 rounded-[3px] border border-linha bg-branco px-3 text-[13px] font-medium text-tinta hover:border-azul">Salvar</button>
            </form>
            <div className="flex items-end"><ExcluirEtiqueta id={etiqueta.id} nome={etiqueta.nome} quantidadeSubtarefas={etiqueta.quantidadeSubtarefas} /></div>
          </div>
        </li>)}
      </ul>}
    </section>
  </div>;
}
