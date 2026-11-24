"use client";

import { useActionState, useId, useRef, useState } from "react";
import { botaoPrimarioPequeno, botaoSecundarioPequeno } from "@/ui/botoes";
import { inputClass } from "@/ui/campo";
import { LIMITE_TEXTO_PEDIDO } from "@/lib/pedidos-prazo-regras";
import type { AlvoPedidoPrazo } from "@/lib/pedidos-prazo";
import { pedidoPrazoFormAction } from "./actions";

type Identificacao = { tarefaId: string; alvo: AlvoPedidoPrazo };

function ErroFormulario({ erro }: { erro?: string }) {
  return erro ? <p role="alert" className="text-sm text-critico">{erro}</p> : null;
}

export function SolicitarPrazo({ tarefaId, alvo, temPrazo, dataMinima }: Identificacao & {
  temPrazo: boolean; dataMinima: string;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const titulo = useId();
  const [tipo, setTipo] = useState(temPrazo ? "PRAZO" : "IMPEDIMENTO");
  const [data, setData] = useState("");
  const [motivo, setMotivo] = useState("");
  const [estado, formAction, enviando] = useActionState(
    pedidoPrazoFormAction.bind(null, "solicitar", tarefaId, alvo, ""), {},
  );

  return (
    <>
      <button type="button" onClick={() => dialogo.current?.showModal()}
        className="text-sm font-medium text-azul-esc underline underline-offset-2">
        Não consigo cumprir este prazo
      </button>
      <dialog ref={dialogo} aria-labelledby={titulo}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-cartao border border-linha bg-branco p-5 text-ink shadow-lg backdrop:bg-ink/50">
        <h2 id={titulo} className="text-xl font-semibold">Não consigo cumprir este prazo</h2>
        <form action={formAction} className="mt-4 space-y-4">
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">O que você precisa informar?</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="tipo" value="PRAZO" checked={tipo === "PRAZO"}
                disabled={!temPrazo} onChange={() => setTipo("PRAZO")} />
              Pedir mais prazo
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="tipo" value="IMPEDIMENTO" checked={tipo === "IMPEDIMENTO"}
                onChange={() => setTipo("IMPEDIMENTO")} />
              Informar impedimento
            </label>
            {!temPrazo && <p className="text-xs text-cinza">Este item está sem prazo. Você pode informar um impedimento.</p>}
          </fieldset>
          {tipo === "PRAZO" && <label className="block text-sm font-medium">
            Nova data
            <input type="date" name="prazoNovo" min={dataMinima} required value={data}
              onChange={(event) => setData(event.target.value)} className={`mt-1 block w-full min-w-0 ${inputClass}`} />
          </label>}
          <label className="block text-sm font-medium">
            Motivo
            <textarea name="motivo" required rows={4} maxLength={LIMITE_TEXTO_PEDIDO} value={motivo}
              onChange={(event) => setMotivo(event.target.value)} className={`mt-1 block w-full ${inputClass}`} />
          </label>
          <ErroFormulario erro={estado.erro} />
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" disabled={enviando} className={botaoSecundarioPequeno}
              onClick={() => dialogo.current?.close()}>Cancelar</button>
            <button disabled={enviando} className={botaoPrimarioPequeno}>
              {enviando ? "Enviando…" : "Enviar pedido"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function DecidirPrazo({ tarefaId, alvo, pedidoId, prazoConfirmado }: Identificacao & {
  pedidoId: string; prazoConfirmado: string | null;
}) {
  const [resposta, setResposta] = useState("");
  const [estado, formAction, enviando] = useActionState(
    pedidoPrazoFormAction.bind(null, "decidir", tarefaId, alvo, pedidoId), {},
  );
  return (
    <form action={formAction} className="space-y-3">
      <label className="block text-sm font-medium">
        Resposta
        <textarea name="resposta" rows={3} maxLength={LIMITE_TEXTO_PEDIDO} value={resposta}
          onChange={(event) => setResposta(event.target.value)} className={`mt-1 block w-full ${inputClass}`} />
        <span className="mt-1 block text-xs font-normal text-cinza">Obrigatória ao recusar.</span>
      </label>
      {prazoConfirmado !== null && (
        <label className="flex items-start gap-2 text-sm">
          <input type="hidden" name="prazoConfirmado" value={prazoConfirmado} />
          <input type="checkbox" name="confirmarPrazo" value="sim" className="mt-0.5" />
          Confirmo a aprovação com o prazo vigente mostrado acima.
        </label>
      )}
      <ErroFormulario erro={estado.erro} />
      <div className="flex flex-wrap gap-2">
        <button name="decisao" value="APROVAR" disabled={enviando} className={botaoPrimarioPequeno}>Aprovar</button>
        <button name="decisao" value="RECUSAR" disabled={enviando} className={botaoSecundarioPequeno}>Recusar</button>
      </div>
    </form>
  );
}

export function RetirarPrazo({ tarefaId, alvo, pedidoId }: Identificacao & { pedidoId: string }) {
  const [estado, formAction, enviando] = useActionState(
    pedidoPrazoFormAction.bind(null, "retirar", tarefaId, alvo, pedidoId), {},
  );
  return (
    <form action={formAction} className="space-y-2">
      <ErroFormulario erro={estado.erro} />
      <button disabled={enviando} className={botaoSecundarioPequeno}>Retirar pedido</button>
    </form>
  );
}
