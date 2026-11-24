"use client";

import Link from "next/link";
import { useActionState } from "react";
import { botaoPrimario, botaoSecundario } from "@/ui/botoes";

export function FormularioDuplicacao({
  action,
  voltarPara,
}: {
  action: (estado: string | null) => Promise<string>;
  voltarPara: string;
}) {
  const [erro, enviar, pendente] = useActionState<string | null>(action, null);

  return (
    <form action={enviar} className="mt-6 space-y-3">
      {erro && <p role="alert" className="text-sm text-critico">{erro}</p>}
      <div className="flex flex-wrap gap-2">
        <Link href={voltarPara} className={botaoSecundario}>Cancelar</Link>
        <button type="submit" disabled={pendente} className={botaoPrimario}>
          {pendente ? "Duplicando…" : "Duplicar projeto"}
        </button>
      </div>
    </form>
  );
}
