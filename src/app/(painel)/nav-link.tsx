"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const ativo = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`block border-l-[3px] py-2.5 pr-4 pl-[13px] font-[family-name:var(--font-interface)] text-[14px] font-medium transition-colors ${
        ativo
          ? "border-verde bg-menu-ativo text-branco"
          : "border-transparent text-menu-inativo hover:bg-menu-hover hover:text-branco"
      }`}
    >
      {children}
    </Link>
  );
}
