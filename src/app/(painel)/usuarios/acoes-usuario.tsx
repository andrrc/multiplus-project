"use client";

import { useState, useTransition } from "react";
import {
  definirUsuarioAtivoAction,
  reenviarConviteAction,
  removerAtribuicaoAction,
  type EstadoAcaoUsuario,
} from "./actions";

const linkAcao =
  "font-[family-name:var(--font-interface)] text-[13.5px] font-medium text-azul-esc hover:underline disabled:opacity-60";

function Retorno({ estado }: { estado: EstadoAcaoUsuario | null }) {
  if (!estado?.erro && !estado?.mensagem) return null;
  return (
    <p className={`mt-1 text-[13px] ${estado.erro ? "text-critico" : "text-verde-esc"}`}>
      {estado.erro ?? estado.mensagem}
    </p>
  );
}

/**
 * RF-039 — a confirmação explica o efeito antes de acontecer, porque "desativar" não é
 * óbvio: a pessoa perde o acesso, mas o histórico dela continua no sistema.
 */
export function BotaoDesativarUsuario({
  usuarioId,
  nome,
  ativo,
}: {
  usuarioId: string;
  nome: string;
  ativo: boolean;
}) {
  const [pendente, startTransition] = useTransition();
  const [estado, setEstado] = useState<EstadoAcaoUsuario | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  function executar() {
    startTransition(async () => {
      setEstado(await definirUsuarioAtivoAction(usuarioId, !ativo));
      setConfirmando(false);
    });
  }

  if (confirmando) {
    return (
      <span className="flex flex-col gap-1.5">
        <span className="text-[13px] text-cinza">
          {nome} perde o acesso ao sistema. Os comentários e conclusões dele continuam
          registrados, e você pode reativar depois.
        </span>
        <span className="flex gap-3">
          <button type="button" onClick={executar} disabled={pendente} className={linkAcao}>
            {pendente ? "Desativando…" : "Confirmar desativação"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmando(false)}
            className="text-[13.5px] text-cinza hover:text-tinta"
          >
            Cancelar
          </button>
        </span>
      </span>
    );
  }

  return (
    <span>
      <button
        type="button"
        disabled={pendente}
        onClick={() => (ativo ? setConfirmando(true) : executar())}
        className={linkAcao}
      >
        {ativo ? "Desativar" : pendente ? "Reativando…" : "Reativar"}
      </button>
      <Retorno estado={estado} />
    </span>
  );
}

export function BotaoReenviarConvite({ usuarioId }: { usuarioId: string }) {
  const [pendente, startTransition] = useTransition();
  const [estado, setEstado] = useState<EstadoAcaoUsuario | null>(null);

  return (
    <span>
      <button
        type="button"
        disabled={pendente}
        onClick={() => startTransition(async () => setEstado(await reenviarConviteAction(usuarioId)))}
        className={linkAcao}
      >
        {pendente ? "Reenviando…" : "Reenviar convite"}
      </button>
      <Retorno estado={estado} />
    </span>
  );
}

export function BotaoRemoverAtribuicao({
  usuarioId,
  atribuicaoId,
}: {
  usuarioId: string;
  atribuicaoId: string;
}) {
  const [pendente, startTransition] = useTransition();
  const [estado, setEstado] = useState<EstadoAcaoUsuario | null>(null);

  return (
    <span>
      <button
        type="button"
        disabled={pendente}
        onClick={() =>
          startTransition(async () => setEstado(await removerAtribuicaoAction(usuarioId, atribuicaoId)))
        }
        className={linkAcao}
      >
        {pendente ? "Removendo…" : "Remover"}
      </button>
      <Retorno estado={estado} />
    </span>
  );
}
