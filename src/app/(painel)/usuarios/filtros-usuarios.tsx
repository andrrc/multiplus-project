"use client";
/**
 * Barra de filtros da lista de Usuários (protótipo 07-usuarios): busca que vale enquanto se
 * digita, botões de perfil com contagem, situação do acesso, "Mostrar desativados" e a linha
 * de resultado com "Limpar filtros". Cada escolha atualiza a URL e a página (servidor) refaz a lista.
 */

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const ESPERA_DA_BUSCA_MS = 350;

export type OpcaoFiltroPerfil = { valor: string; rotulo: string; total: number };

const campoClasse = "h-11 w-full min-w-0 rounded-controle border border-linha-forte bg-branco px-3 font-[family-name:var(--font-interface)] text-sm text-ink focus:border-azul focus:outline-none focus:ring-[3px] focus:ring-azul/15 disabled:opacity-60 md:h-[38px]";

type Estado = { busca: string; perfil: string; situacao: string; desativados: boolean };

function urlUsuarios(estado: Estado) {
  const parametros = new URLSearchParams();
  if (estado.busca.trim()) parametros.set("busca", estado.busca.trim());
  if (estado.perfil) parametros.set("perfil", estado.perfil);
  if (estado.situacao) parametros.set("situacao", estado.situacao);
  if (estado.desativados) parametros.set("desativados", "1");
  const query = parametros.toString();
  return query ? `/usuarios?${query}` : "/usuarios";
}

export function FiltrosUsuarios({
  buscaInicial,
  perfilInicial,
  situacaoInicial,
  desativadosInicial,
  opcoesPerfil,
  total,
}: {
  buscaInicial: string;
  perfilInicial: string;
  situacaoInicial: string;
  desativadosInicial: boolean;
  /** Botões de perfil, na ordem de exibição; o primeiro (valor vazio) é "Todos". */
  opcoesPerfil: OpcaoFiltroPerfil[];
  total: number;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [estado, setEstado] = useState<Estado>({ busca: buscaInicial, perfil: perfilInicial, situacao: situacaoInicial, desativados: desativadosInicial });
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancela uma busca agendada se a barra sair da tela.
  useEffect(() => () => { if (temporizador.current) clearTimeout(temporizador.current); }, []);

  function aplicar(proximo: Estado) {
    setEstado(proximo);
    startTransition(() => router.push(urlUsuarios(proximo), { scroll: false }));
  }

  function alterarBusca(valor: string) {
    const proximo = { ...estado, busca: valor };
    setEstado(proximo);
    // Espera uma pausa na digitação para não consultar o servidor a cada letra.
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => aplicar(proximo), ESPERA_DA_BUSCA_MS);
  }

  const temFiltro = estado.busca.trim() !== "" || estado.perfil !== "" || estado.situacao !== "";

  return (
    <div className="mt-6" aria-label="Filtros da listagem">
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <label className="relative w-full min-w-0 flex-1 basis-[260px] md:max-w-[340px]">
          <span className="sr-only">Buscar usuários</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" className="pointer-events-none absolute left-[11px] top-1/2 -translate-y-1/2 text-faint" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input
            type="search"
            name="busca"
            value={estado.busca}
            onChange={(evento) => alterarBusca(evento.target.value)}
            placeholder="Buscar por nome, e-mail ou cargo"
            className={`${campoClasse} pl-9`}
          />
        </label>
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
