"use client";
/**
 * Link do menu lateral. Marca a rota atual com a barra verde dos protótipos e mantém a área
 * de toque de 44 px no celular, onde o menu abre como gaveta.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const ativo = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={`relative flex items-center gap-3 rounded-controle px-3 py-2 font-[family-name:var(--font-interface)] text-sm max-lg:min-h-11 ${
        ativo
          ? "bg-branco/10 font-medium text-branco before:absolute before:inset-y-1.5 before:-left-3 before:w-[3px] before:rounded-r-[3px] before:bg-verde"
          : "text-menu-texto hover:bg-branco/5 hover:text-branco"
      }`}
    >
      {children}
    </Link>
  );
}
