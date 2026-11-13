"use client";

import { useRef, type ReactNode } from "react";
import { botaoDiscreto, botaoPerigo, botaoPrimario, botaoSecundario } from "@/ui/botoes";

/**
 * Botão que pede confirmação antes de executar uma ação do servidor (desativar, reativar,
 * concluir). A janela é um `<dialog>` nativo, que já trata foco, Esc e o fundo escurecido;
 * a ação só roda quando se clica no botão de confirmação, que envia o formulário.
 */
export function BotaoConfirmacao({
  rotulo,
  titulo,
  descricao,
  rotuloConfirmar,
  action,
  tom = "perigo",
  tomGatilho = "discreto",
}: {
  /** Texto do botão que abre a janela. */
  rotulo: string;
  titulo: string;
  descricao: ReactNode;
  rotuloConfirmar: string;
  /** Server action sem argumentos (use `.bind` no servidor para passar o id). */
  action: () => Promise<void>;
  /** Cor do botão de confirmação. */
  tom?: "perigo" | "primario";
  /** Aparência do botão que abre a janela. */
  tomGatilho?: "discreto" | "secundario" | "perigo";
}) {
  const janela = useRef<HTMLDialogElement>(null);
  const classeGatilho = tomGatilho === "perigo" ? botaoPerigo : tomGatilho === "secundario" ? botaoSecundario : botaoDiscreto;

  return (
    <>
      <button type="button" onClick={() => janela.current?.showModal()} className={classeGatilho}>
        {rotulo}
      </button>
      <dialog
        ref={janela}
        aria-labelledby="titulo-confirmacao"
        className="m-auto w-[min(440px,calc(100vw-32px))] rounded-modal border border-linha bg-branco p-0 text-ink shadow-2xl backdrop:bg-tinta/45"
      >
        <form action={action}>
          <div className="px-6 pt-5 pb-4">
            <h2 id="titulo-confirmacao" className="text-lg font-semibold">{titulo}</h2>
            <div className="mt-2 text-sm text-cinza">{descricao}</div>
          </div>
          <div className="flex justify-end gap-2 rounded-b-modal border-t border-linha bg-cabecalho px-6 py-3.5">
            <button type="button" onClick={() => janela.current?.close()} className={botaoSecundario}>Cancelar</button>
            <button type="submit" className={tom === "perigo" ? botaoPerigo : botaoPrimario}>{rotuloConfirmar}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
