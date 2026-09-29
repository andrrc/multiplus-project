"use client";

import { useState } from "react";
import { CORES_ETIQUETA } from "@/lib/etiqueta-colors";

export function CampoCorEtiqueta({ name = "cor", inicial }: { name?: string; inicial?: string }) {
  const [corSelecionada, setCorSelecionada] = useState(inicial ?? CORES_ETIQUETA[0].fundo);
  return <div className="grid gap-2">
    <span className="text-[12px] font-medium text-cinza">Cor da etiqueta</span>
    <input type="hidden" name={name} value={corSelecionada} />
    <div className="flex flex-wrap gap-2" role="group" aria-label="Escolha a cor da etiqueta">
      {CORES_ETIQUETA.map((cor) => <button key={cor.fundo} type="button" aria-label={cor.nome} aria-pressed={corSelecionada === cor.fundo} onClick={() => setCorSelecionada(cor.fundo)} className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-[12px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2 ${corSelecionada === cor.fundo ? "border-tinta bg-papel text-tinta" : "border-linha bg-branco text-cinza hover:border-azul"}`}><span aria-hidden="true" className="h-3.5 w-3.5 rounded-full border border-tinta/10" style={{ backgroundColor: cor.amostra }} />{cor.nome}</button>)}
    </div>
  </div>;
}
