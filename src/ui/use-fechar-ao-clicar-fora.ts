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
    if (!aberto) return;
    const aoTocar = (evento: PointerEvent) => {
      if (evento.target instanceof Node && !ref.current?.contains(evento.target)) fechar();
    };
    const aoPressionarTecla = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape") return;
      fechar();
      gatilho?.current?.focus();
    };
    document.addEventListener("pointerdown", aoTocar);
    document.addEventListener("keydown", aoPressionarTecla);
    return () => {
      document.removeEventListener("pointerdown", aoTocar);
      document.removeEventListener("keydown", aoPressionarTecla);
    };
  }, [aberto, fechar, gatilho, ref]);
}
