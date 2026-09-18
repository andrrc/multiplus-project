"use client";

import { useState, useTransition } from "react";
import {
  definirUsuarioAtivoAction,
  gerarLinkConviteAction,
  reenviarConviteAction,
  removerAtribuicaoAction,
  type EstadoAcaoUsuario,
  type EstadoLinkConvite,
} from "./actions";

const linkAcao =
  "inline-flex min-h-6 items-center font-[family-name:var(--font-interface)] text-[13.5px] font-medium text-azul-esc hover:underline disabled:opacity-60";

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
    <span className="inline-flex flex-col">
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
    <span className="inline-flex flex-col">
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

/**
 * Alternativa segura enquanto o Resend não está configurado. O valor não volta do banco e
 * só aparece depois de uma ação explícita da Administradora, para ela copiar e compartilhar.
 */
export function BotaoGerarLinkConvite({ usuarioId }: { usuarioId: string }) {
  const [pendente, startTransition] = useTransition();
  const [estado, setEstado] = useState<EstadoLinkConvite | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    if (!estado?.link) return;
    try {
      await navigator.clipboard.writeText(estado.link);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <span className="flex w-full flex-col gap-1.5 sm:items-end">
      <button
        type="button"
        disabled={pendente}
        onClick={() =>
          startTransition(async () => {
            setCopiado(false);
            setEstado(await gerarLinkConviteAction(usuarioId));
          })
        }
        className={linkAcao}
      >
        {pendente ? "Gerando link…" : "Gerar link de acesso"}
      </button>
      {estado?.erro && <p className="text-[13px] text-critico">{estado.erro}</p>}
      {estado?.link && (
        <span className="w-full rounded-[3px] border border-ambar bg-papel p-2.5 text-left sm:w-[320px]">
          <span className="block text-[12.5px] leading-5 text-tinta">
            Envie este link por um canal seguro. Ele vale por 7 dias, é usado uma única vez e
            gerar outro cancela este.
          </span>
          <input
            readOnly
            value={estado.link}
            aria-label="Link de acesso para compartilhar"
            className="mt-2 block w-full rounded-[2px] border border-linha bg-branco px-2 py-1.5 text-[12px] text-tinta"
            onFocus={(evento) => evento.currentTarget.select()}
          />
          <button type="button" onClick={copiar} className={`${linkAcao} mt-2`}>
            {copiado ? "Link copiado" : "Copiar link"}
          </button>
        </span>
      )}
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
    <span className="inline-flex flex-col">
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
