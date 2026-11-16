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

type Estado = { busca: string; segmento: string; cidade: string };

function url(estado: Estado) {
  const parametros = new URLSearchParams();
  if (estado.busca.trim()) parametros.set("busca", estado.busca.trim());
  if (estado.segmento) parametros.set("segmento", estado.segmento);
  if (estado.cidade) parametros.set("cidade", estado.cidade);
  const query = parametros.toString();
  return query ? `/meus-clientes?${query}` : "/meus-clientes";
}

export function FiltrosMeusClientes({
  buscaInicial,
  segmentoInicial,
  cidadeInicial,
  segmentos,
  cidades,
  total,
}: {
  buscaInicial: string;
  segmentoInicial: string;
  cidadeInicial: string;
  segmentos: string[];
  cidades: string[];
  total: number;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [estado, setEstado] = useState<Estado>({ busca: buscaInicial, segmento: segmentoInicial, cidade: cidadeInicial });

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

  const temFiltro = estado.busca.trim() !== "" || estado.segmento !== "" || estado.cidade !== "";

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
      <p className="mb-2.5 text-[13px] text-cinza" aria-live="polite">
        <span className="tabular-nums">{total} {total === 1 ? "cliente" : "clientes"}</span>
        {temFiltro && <Link href="/meus-clientes" className="ml-3 text-azul-esc hover:underline">Limpar filtros</Link>}
      </p>
    </div>
  );
}
