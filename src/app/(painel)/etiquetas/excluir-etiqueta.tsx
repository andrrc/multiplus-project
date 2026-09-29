"use client";

import { useState } from "react";
import { excluirEtiquetaAction } from "./actions";

export function ExcluirEtiqueta({ id, nome, quantidadeSubtarefas }: { id: string; nome: string; quantidadeSubtarefas: number }) {
  const [confirmar, setConfirmar] = useState(false);
  if (!confirmar) return <button type="button" onClick={() => setConfirmar(true)} className="min-h-10 rounded-[3px] border border-critico/40 px-3 text-[13px] font-medium text-critico hover:bg-critico-cl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-critico">Excluir</button>;

  return <div className="grid gap-2 rounded-[3px] border border-critico/30 bg-critico-cl p-3 sm:min-w-[265px]">
    <p className="text-[12px] leading-5 text-tinta">A etiqueta <strong>{nome}</strong> será removida de {quantidadeSubtarefas === 1 ? "1 subtarefa" : `${quantidadeSubtarefas} subtarefas`} e excluída do catálogo.</p>
    <div className="flex flex-wrap gap-2">
      <form action={excluirEtiquetaAction.bind(null, id)}><button className="min-h-9 rounded-[3px] bg-critico px-3 text-[12px] font-semibold text-branco hover:bg-critico/90">Confirmar exclusão</button></form>
      <button type="button" onClick={() => setConfirmar(false)} className="min-h-9 rounded-[3px] border border-linha bg-branco px-3 text-[12px]">Cancelar</button>
    </div>
  </div>;
}
