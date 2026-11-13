"use client";
/**
 * Filtros da caixa de avisos (protótipo 10-avisos): botões "Todos" e "Não lidos" com contagem
 * e seletor de tipo. Cada escolha atualiza a URL e a página (servidor) refaz a lista.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const campoClasse = "h-11 w-full min-w-0 rounded-controle border border-linha-forte bg-branco px-3 font-[family-name:var(--font-interface)] text-sm text-ink focus:border-azul focus:outline-none focus:ring-[3px] focus:ring-azul/15 disabled:opacity-60 md:h-[38px] md:w-auto";

export function FiltrosAvisos({
  rota,
  apenasNaoLidosInicial,
  tipoInicial,
  opcoesTipo,
  totalTodos,
  totalNaoLidos,
}: {
  rota: "/notificacoes" | "/minhas-notificacoes";
  apenasNaoLidosInicial: boolean;
  tipoInicial: string;
  opcoesTipo: Array<{ valor: string; rotulo: string }>;
  totalTodos: number;
  totalNaoLidos: number;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [apenasNaoLidos, setApenasNaoLidos] = useState(apenasNaoLidosInicial);
  const [tipo, setTipo] = useState(tipoInicial);

  function aplicar(naoLidos: boolean, tipoEscolhido: string) {
    setApenasNaoLidos(naoLidos);
    setTipo(tipoEscolhido);
    const parametros = new URLSearchParams();
    if (naoLidos) parametros.set("lidos", "nao");
    if (tipoEscolhido) parametros.set("tipo", tipoEscolhido);
    const query = parametros.toString();
    startTransition(() => router.push(query ? `${rota}?${query}` : rota, { scroll: false }));
  }

  const botoes = [
    { naoLidos: false, rotulo: "Todos", total: totalTodos },
    { naoLidos: true, rotulo: "Não lidos", total: totalNaoLidos },
  ];

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2.5" aria-label="Filtros dos avisos">
      <div role="group" aria-label="Lidos" className="inline-flex overflow-hidden rounded-controle border border-linha-forte bg-branco max-md:w-full">
        {botoes.map((botao) => (
          <button
            key={botao.rotulo}
            type="button"
            aria-pressed={apenasNaoLidos === botao.naoLidos}
            disabled={pendente}
            onClick={() => aplicar(botao.naoLidos, tipo)}
            className="h-11 whitespace-nowrap border-l border-linha px-3 font-[family-name:var(--font-interface)] text-[13px] font-medium text-cinza first:border-l-0 hover:bg-papel hover:text-ink aria-pressed:bg-selecionado aria-pressed:font-semibold aria-pressed:text-ink max-md:flex-1 md:h-9"
          >
            {botao.rotulo}
            <span className="ml-1 font-medium tabular-nums text-faint">{botao.total}</span>
          </button>
        ))}
      </div>
      <select
        aria-label="Tipo de aviso"
        value={tipo}
        disabled={pendente}
        onChange={(evento) => aplicar(apenasNaoLidos, evento.target.value)}
        className={campoClasse}
      >
        <option value="">Todos os tipos</option>
        {opcoesTipo.map((opcao) => <option key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</option>)}
      </select>
    </div>
  );
}
