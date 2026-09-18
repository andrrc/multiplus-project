"use client";

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
      className={`block border-l-[3px] pr-4 font-[family-name:var(--font-interface)] font-medium transition-colors ${
        nivel === "filho"
          ? "py-2 pl-7 text-[13px]"
          : "py-2.5 pl-[13px] text-[14px]"
      } ${
        ativo
          ? "border-verde bg-menu-ativo text-branco"
          : "border-transparent text-menu-inativo hover:bg-menu-hover hover:text-branco"
      }`}
    >
      {children}
    </Link>
  );
}
