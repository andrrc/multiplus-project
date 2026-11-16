"use client";
/**
 * Barra de filtros da lista de Usuários (protótipo 07-usuarios): busca que vale enquanto se digita (nome, e-mail, cargo
 * ou empresa), empresa, situação do acesso, botões de perfil com contagem, "Mostrar desativados" e a linha de
 * resultado com "Limpar filtros". Cada escolha atualiza a URL e a página (servidor) refaz a lista.
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CampoBuscaLista } from "@/ui/campo-busca-lista";

export type OpcaoFiltroPerfil = { valor: string; rotulo: string; total: number };

const campoClasse = "h-11 w-full min-w-0 rounded-controle border border-linha-forte bg-branco px-3 font-[family-name:var(--font-interface)] text-sm text-ink focus:border-azul focus:outline-none focus:ring-[3px] focus:ring-azul/15 disabled:opacity-60 md:h-[38px]";

type Estado = { busca: string; perfil: string; situacao: string; empresa: string; desativados: boolean };

function urlUsuarios(estado: Estado) {
  const parametros = new URLSearchParams();
  if (estado.busca.trim()) parametros.set("busca", estado.busca.trim());
  if (estado.perfil) parametros.set("perfil", estado.perfil);
  if (estado.situacao) parametros.set("situacao", estado.situacao);
  if (estado.empresa) parametros.set("empresa", estado.empresa);
  if (estado.desativados) parametros.set("desativados", "1");
  const query = parametros.toString();
  return query ? `/usuarios?${query}` : "/usuarios";
}

export function FiltrosUsuarios({
  buscaInicial,
  perfilInicial,
  situacaoInicial,
  empresaInicial,
  desativadosInicial,
  opcoesPerfil,
  empresas,
  total,
}: {
  buscaInicial: string;
  perfilInicial: string;
  situacaoInicial: string;
  empresaInicial: string;
  desativadosInicial: boolean;
  /** Botões de perfil, na ordem de exibição; o primeiro (valor vazio) é "Todos". */
  opcoesPerfil: OpcaoFiltroPerfil[];
  /** Empresas que aparecem na lista (a equipe, os clientes e as empresas das pessoas envolvidas). */
  empresas: string[];
  total: number;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [estado, setEstado] = useState<Estado>({ busca: buscaInicial, perfil: perfilInicial, situacao: situacaoInicial, empresa: empresaInicial, desativados: desativadosInicial });

  // "Limpar filtros" tira a busca da URL: o estado local acompanha, para os demais filtros não a reaplicarem.
  const [buscaDaUrl, setBuscaDaUrl] = useState(buscaInicial);
  if (buscaInicial !== buscaDaUrl) {
    setBuscaDaUrl(buscaInicial);
    if (buscaInicial === "") setEstado((atual) => ({ ...atual, busca: "" }));
  }

  function aplicar(proximo: Estado) {
    setEstado(proximo);
    startTransition(() => router.push(urlUsuarios(proximo), { scroll: false }));
  }

  const temFiltro = estado.busca.trim() !== "" || estado.perfil !== "" || estado.situacao !== "" || estado.empresa !== "";

  return (
    <div className="mt-6" aria-label="Filtros da listagem">
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <CampoBuscaLista
          valorInicial={buscaInicial}
          placeholder="Buscar por nome, e-mail, cargo ou empresa"
          rotulo="Buscar usuários"
          aoAlterar={(busca) => setEstado((atual) => ({ ...atual, busca }))}
          aoBuscar={(busca) => aplicar({ ...estado, busca })}
        />
        <select
          aria-label="Filtrar por empresa"
          value={estado.empresa}
          disabled={pendente}
          onChange={(evento) => aplicar({ ...estado, empresa: evento.target.value })}
          className={`${campoClasse} md:w-auto md:max-w-[240px]`}
        >
          <option value="">Todas as empresas</option>
          {empresas.map((empresa) => <option key={empresa} value={empresa}>{empresa}</option>)}
        </select>
        <select
          aria-label="Filtrar por situação"
          value={estado.situacao}
          disabled={pendente}
          onChange={(evento) => aplicar({ ...estado, situacao: evento.target.value })}
          className={`${campoClasse} md:w-auto`}
        >
          <option value="">Todas as situações</option>
          <option value="ativo">Ativo</option>
          <option value="pendente">Pendente de ativação</option>
          <option value="desativado">Desativado</option>
        </select>
      </div>

      <div className="mb-3">
        <div role="group" aria-label="Perfil" className="inline-flex overflow-hidden rounded-controle border border-linha-forte bg-branco max-md:flex max-md:w-full max-md:overflow-x-auto">
          {opcoesPerfil.map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              aria-pressed={estado.perfil === opcao.valor}
              disabled={pendente}
              onClick={() => aplicar({ ...estado, perfil: opcao.valor })}
              className="h-11 whitespace-nowrap border-l border-linha px-3 font-[family-name:var(--font-interface)] text-[13px] font-medium text-cinza first:border-l-0 hover:bg-papel hover:text-ink aria-pressed:bg-selecionado aria-pressed:font-semibold aria-pressed:text-ink max-md:flex-1 md:h-9"
            >
              {opcao.rotulo}
              <span className="ml-1 font-medium tabular-nums text-faint">{opcao.total}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-2.5 mt-1 flex flex-wrap items-center justify-between gap-3 text-[13px] text-cinza">
        <span aria-live="polite">
          <span className="tabular-nums">{total} {total === 1 ? "usuário" : "usuários"}</span>
          {temFiltro && <Link href={estado.desativados ? "/usuarios?desativados=1" : "/usuarios"} className="ml-3 text-azul-esc hover:underline">Limpar filtros</Link>}
        </span>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-ink md:min-h-0">
          <input
            type="checkbox"
            name="desativados"
            checked={estado.desativados}
            disabled={pendente}
            onChange={(evento) => aplicar({ ...estado, desativados: evento.target.checked })}
            className="h-4 w-4 accent-tinta"
          />
          Mostrar desativados
        </label>
      </div>
    </div>
  );
}
