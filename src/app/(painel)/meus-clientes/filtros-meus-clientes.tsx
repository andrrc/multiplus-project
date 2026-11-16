"use client";
/**
 * Filtros de "Clientes" do colaborador interno (protótipo interno/06): busca (ID, nome, CNPJ, CPF ou cidade), segmento
 * e cidade, com a linha de resultado e "Limpar filtros". Cada escolha atualiza a URL e a página (servidor) refaz a lista.
 */
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CampoBuscaLista } from "@/ui/campo-busca-lista";

const campoClasse = "h-11 w-full min-w-0 rounded-controle border border-linha-forte bg-branco px-3 font-[family-name:var(--font-interface)] text-sm text-ink focus:border-azul focus:outline-none focus:ring-[3px] focus:ring-azul/15 disabled:opacity-60 md:h-[38px] md:w-auto md:max-w-[220px]";

type Estado = { busca: string; segmento: string; cidade: string; atraso: boolean };

function url(estado: Estado) {
  const parametros = new URLSearchParams();
  if (estado.busca.trim()) parametros.set("busca", estado.busca.trim());
  if (estado.segmento) parametros.set("segmento", estado.segmento);
  if (estado.cidade) parametros.set("cidade", estado.cidade);
  if (estado.atraso) parametros.set("situacao", "atraso");
  const query = parametros.toString();
  return query ? `/meus-clientes?${query}` : "/meus-clientes";
}

export function FiltrosMeusClientes({
  buscaInicial,
  segmentoInicial,
  cidadeInicial,
  atrasoInicial,
  segmentos,
  cidades,
  contagens,
  total,
}: {
  buscaInicial: string;
  segmentoInicial: string;
  cidadeInicial: string;
  atrasoInicial: boolean;
  segmentos: string[];
  cidades: string[];
  /** Clientes do colaborador, já com a busca, o segmento e a cidade aplicados. */
  contagens: { todos: number; atraso: number };
  total: number;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [estado, setEstado] = useState<Estado>({ busca: buscaInicial, segmento: segmentoInicial, cidade: cidadeInicial, atraso: atrasoInicial });

  // "Limpar filtros" tira a busca da URL: o estado local acompanha, para os demais filtros não a reaplicarem.
  const [buscaDaUrl, setBuscaDaUrl] = useState(buscaInicial);
  if (buscaInicial !== buscaDaUrl) {
    setBuscaDaUrl(buscaInicial);
    if (buscaInicial === "") setEstado((atual) => ({ ...atual, busca: "" }));
  }

  function aplicar(proximo: Estado) {
    setEstado(proximo);
    startTransition(() => router.push(url(proximo), { scroll: false }));
  }

  const temFiltro = estado.busca.trim() !== "" || estado.segmento !== "" || estado.cidade !== "" || estado.atraso;

  return (
    <div className="mt-5" aria-label="Filtros dos clientes">
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <CampoBuscaLista
          valorInicial={buscaInicial}
          placeholder="Buscar por ID, nome, CNPJ, CPF ou cidade"
          rotulo="Buscar clientes"
          aoAlterar={(busca) => setEstado((atual) => ({ ...atual, busca }))}
          aoBuscar={(busca) => aplicar({ ...estado, busca })}
        />
        <select aria-label="Filtrar por segmento" value={estado.segmento} disabled={pendente} onChange={(evento) => aplicar({ ...estado, segmento: evento.target.value })} className={campoClasse}>
          <option value="">Todos os segmentos</option>
          {segmentos.map((segmento) => <option key={segmento} value={segmento}>{segmento}</option>)}
        </select>
        <select aria-label="Filtrar por cidade" value={estado.cidade} disabled={pendente} onChange={(evento) => aplicar({ ...estado, cidade: evento.target.value })} className={campoClasse}>
          <option value="">Todas as cidades</option>
          {cidades.map((cidade) => <option key={cidade} value={cidade}>{cidade}</option>)}
        </select>
      </div>
      <div className="mb-3">
        <div role="group" aria-label="Situação dos clientes" className="inline-flex overflow-hidden rounded-controle border border-linha-forte bg-branco max-md:flex max-md:w-full max-md:overflow-x-auto">
          {([[false, "Todos", contagens.todos], [true, "Com atraso", contagens.atraso]] as const).map(([valor, rotulo, quantidade]) => (
            <button
              key={rotulo}
              type="button"
              aria-pressed={estado.atraso === valor}
              disabled={pendente}
              onClick={() => aplicar({ ...estado, atraso: valor })}
              className="h-11 whitespace-nowrap border-l border-linha px-3 font-[family-name:var(--font-interface)] text-[13px] font-medium text-cinza first:border-l-0 hover:bg-papel hover:text-ink aria-pressed:bg-selecionado aria-pressed:font-semibold aria-pressed:text-ink max-md:flex-1 md:h-9"
            >
              {rotulo}
              <span className="ml-1 font-medium tabular-nums text-faint">{quantidade}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="mb-2.5 text-[13px] text-cinza" aria-live="polite">
        <span className="tabular-nums">{total} {total === 1 ? "cliente" : "clientes"}</span>
        {temFiltro && <Link href="/meus-clientes" className="ml-3 text-azul-esc hover:underline">Limpar filtros</Link>}
      </p>
    </div>
  );
}
