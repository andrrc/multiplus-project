"use client";

import { useEffect, type RefObject } from "react";

// Fecha um menu ou painel suspenso ao clicar fora dele ou ao apertar Esc.
// No Esc, o foco volta para o botão que abriu o menu (quando informado).
export function useFecharAoClicarFora(
  ref: RefObject<HTMLElement | null>,
  aberto: boolean,
  fechar: () => void,
  gatilho?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    // Enquanto o menu está fechado não há eventos globais para observar.
    if (!aberto) return;
    const aoTocar = (evento: PointerEvent) => {
      // Ignora cliques internos; cliques em qualquer outro nó fecham o painel.
      if (evento.target instanceof Node && !ref.current?.contains(evento.target)) fechar();
    };
    const aoPressionarTecla = (evento: KeyboardEvent) => {
      // Esc fecha o menu e devolve o foco ao controle que o abriu.
      if (evento.key !== "Escape") return;
      fechar();
      gatilho?.current?.focus();
    };
    document.addEventListener("pointerdown", aoTocar);
    document.addEventListener("keydown", aoPressionarTecla);
    return () => {
      // Remove os listeners ao fechar ou desmontar, evitando callbacks duplicados.
      document.removeEventListener("pointerdown", aoTocar);
      document.removeEventListener("keydown", aoPressionarTecla);
    };
  }, [aberto, fechar, gatilho, ref]);
}
