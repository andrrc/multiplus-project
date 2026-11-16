"use client";
/**
 * Campo de busca das listas: aplica o termo depois de uma pausa na digitação (o servidor refaz a consulta pela URL) e
 * acompanha a URL quando o termo muda por fora, como no "Limpar filtros", sem tirar o que a pessoa está digitando.
 */
import { useEffect, useRef, useState } from "react";

const ESPERA_DA_BUSCA_MS = 350;

export function CampoBuscaLista({
  valorInicial,
  placeholder,
  rotulo,
  aoAlterar,
  aoBuscar,
}: {
  valorInicial: string;
  placeholder: string;
  /** Nome acessível do campo, lido por leitores de tela. */
  rotulo: string;
  /** Chamado a cada letra, para quem precisa do texto atual (os demais filtros da página). */
  aoAlterar?: (valor: string) => void;
  /** Chamado depois da pausa na digitação, para atualizar a URL. */
  aoBuscar: (valor: string) => void;
}) {
  const [valor, setValor] = useState(valorInicial);
  const [valorDaUrl, setValorDaUrl] = useState(valorInicial);
  const [focado, setFocado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancela uma busca agendada se o campo sair da tela.
  useEffect(() => () => { if (temporizador.current) clearTimeout(temporizador.current); }, []);

  // A URL mudou por fora (ex.: "Limpar filtros"): o campo a acompanha, a menos que a pessoa esteja digitando.
  if (valorInicial !== valorDaUrl) {
    setValorDaUrl(valorInicial);
    if (!focado) setValor(valorInicial);
  }

  function alterar(novo: string) {
    setValor(novo);
    aoAlterar?.(novo);
    // Espera uma pausa na digitação para não consultar o servidor a cada letra.
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => aoBuscar(novo), ESPERA_DA_BUSCA_MS);
  }

  return (
    <label className="relative w-full min-w-0 flex-1 basis-[260px] md:max-w-[340px]">
      <span className="sr-only">{rotulo}</span>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" className="pointer-events-none absolute left-[11px] top-1/2 -translate-y-1/2 text-faint" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input
        type="search"
        name="busca"
        value={valor}
        onChange={(evento) => alterar(evento.target.value)}
        onFocus={() => setFocado(true)}
        onBlur={() => setFocado(false)}
        placeholder={placeholder}
        className="h-11 w-full rounded-controle border border-linha-forte bg-branco pl-9 pr-3 font-[family-name:var(--font-interface)] text-sm text-ink focus:border-azul focus:outline-none focus:ring-[3px] focus:ring-azul/15 md:h-[38px]"
      />
    </label>
  );
}
