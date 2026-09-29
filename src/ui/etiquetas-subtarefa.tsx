import { CORES_ETIQUETA } from "@/lib/etiqueta-colors";

type EtiquetaVisual = { nome: string; cor: string };

export function EtiquetasSubtarefa({ nomes, catalogo, compacta = false }: { nomes: string[]; catalogo: EtiquetaVisual[]; compacta?: boolean }) {
  if (!nomes.length) return null;
  const porNome = new Map(catalogo.map((etiqueta) => [etiqueta.nome.toLocaleLowerCase("pt-BR"), etiqueta.cor]));
  const corPadrao = CORES_ETIQUETA.find((cor) => cor.nome === "Cinza")!;

  return <span className={`flex flex-wrap gap-1.5 ${compacta ? "items-center" : "mt-3"}`} aria-label="Etiquetas da subtarefa">
    {nomes.map((nome) => {
      const fundo = porNome.get(nome.toLocaleLowerCase("pt-BR")) ?? corPadrao.fundo;
      const texto = CORES_ETIQUETA.find((cor) => cor.fundo === fundo)?.texto ?? corPadrao.texto;
      return <span key={nome} className="inline-flex min-h-7 items-center rounded-full border border-tinta/5 px-2.5 py-1 font-[family-name:var(--font-interface)] text-[12px] font-semibold" style={{ backgroundColor: fundo, color: texto }}>{nome}</span>;
    })}
  </span>;
}
