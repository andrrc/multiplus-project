"use client";
/**
 * Componente de interface `nav link`. Recebe dados e callbacks de seu chamador, mantém apenas o estado necessário à interação e delega validações e persistência ao servidor.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLink({
  href,
  children,
  nivel = "principal",
}: {
  href: string;
  children: ReactNode;
  nivel?: "principal" | "filho";
}) {
  const pathname = usePathname();
  const ativo = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={`relative block min-h-11 rounded-controle pr-3 font-[family-name:var(--font-interface)] font-medium transition-colors ${
        nivel === "filho"
          ? "py-2 pl-7 text-[13px]"
          : "py-3 pl-3 text-[14px]"
      } ${
        ativo
          ? "bg-menu-ativo text-branco before:absolute before:inset-y-1.5 before:-left-3 before:w-[3px] before:rounded-r-[3px] before:bg-verde"
          : "text-menu-inativo hover:bg-menu-hover hover:text-branco"
      }`}
    >
      {children}
    </Link>
  );
}
