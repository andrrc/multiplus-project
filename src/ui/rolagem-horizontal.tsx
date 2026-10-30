"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type IndicadoresRolagem = {
  temExcesso: boolean;
};

const SEM_ROLAGEM: IndicadoresRolagem = {
  temExcesso: false,
};

function SetaHorizontal({ direcao }: { direcao: "esquerda" | "direita" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4">
      <path
        d={direcao === "direita" ? "m8 4 6 6-6 6" : "m12 4-6 6 6 6"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RolagemHorizontal({
  children,
  className = "",
  rotulo,
}: {
  children: ReactNode;
  className?: string;
  rotulo: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dicaId = useId();
  const [indicadores, setIndicadores] = useState(SEM_ROLAGEM);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let quadroPendente: number | undefined;
    const atualizar = () => {
      if (quadroPendente !== undefined) window.cancelAnimationFrame(quadroPendente);
      quadroPendente = window.requestAnimationFrame(() => {
        const excesso = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
        const proximo: IndicadoresRolagem = {
          temExcesso: excesso > 1,
        };

        setIndicadores((atual) =>
          atual.temExcesso === proximo.temExcesso
            ? atual
            : proximo,
        );
      });
    };

    atualizar();
    const observador = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(atualizar);
    observador?.observe(viewport);
    if (viewport.firstElementChild) observador?.observe(viewport.firstElementChild);
    window.addEventListener("resize", atualizar);

    return () => {
      if (quadroPendente !== undefined) window.cancelAnimationFrame(quadroPendente);
      observador?.disconnect();
      window.removeEventListener("resize", atualizar);
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {indicadores.temExcesso && (
        <p id={dicaId} className="mb-2 flex justify-end">
          <span className="inline-flex min-h-9 items-center gap-2 font-[family-name:var(--font-interface)] text-[12px] font-medium text-cinza">
            Deslize para ver as demais colunas
            <SetaHorizontal direcao="direita" />
          </span>
        </p>
      )}
      <div className="relative">
        <div
          ref={viewportRef}
          className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-azul focus-visible:outline-offset-2"
          role="region"
          aria-label={rotulo}
          aria-describedby={indicadores.temExcesso ? dicaId : undefined}
          tabIndex={indicadores.temExcesso ? 0 : undefined}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
