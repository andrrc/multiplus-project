"use client";

import type { ReactNode } from "react";

export function RolagemHorizontal({
  children,
  className = "",
  rotulo,
}: {
  children: ReactNode;
  className?: string;
  rotulo: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <div
        className="max-h-[min(70dvh,calc(100dvh-18rem))] overflow-auto focus-visible:outline-2 focus-visible:outline-azul focus-visible:outline-offset-2 [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-20"
        role="region"
        aria-label={rotulo}
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  );
}
