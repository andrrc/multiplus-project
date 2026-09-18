"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
  const [aberto, setAberto] = useState(false);
  const fecharRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const aoPressionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAberto(false);
    };
    window.addEventListener("keydown", aoPressionarTecla);
    fecharRef.current?.focus();
    return () => window.removeEventListener("keydown", aoPressionarTecla);
  }, [aberto]);

  function gerarLink() {
    setCopiado(false);
    setEstado(null);
    startTransition(async () => setEstado(await gerarLinkConviteAction(usuarioId)));
  }

  function abrir() {
    setAberto(true);
    if (!estado?.link) gerarLink();
  }

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
    <div>
      <button
        type="button"
        disabled={pendente}
        onClick={abrir}
        className={linkAcao}
      >
        {estado?.link ? "Abrir link de acesso" : "Gerar link de acesso"}
      </button>
      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`link-convite-${usuarioId}`}
        >
          <button
            type="button"
            aria-label="Fechar geração de link"
            onClick={() => setAberto(false)}
            className="fixed inset-0 cursor-default bg-tinta/60"
          />
          <div className="relative z-10 w-full max-w-[620px] border border-linha bg-branco shadow-2xl">
            <div className="flex items-start justify-between gap-5 border-b border-linha bg-papel px-5 py-4">
              <div>
                <h2
                  id={`link-convite-${usuarioId}`}
                  className="font-[family-name:var(--font-interface)] text-[18px] font-semibold text-tinta"
                >
                  Link de acesso
                </h2>
                <p className="mt-1 text-[13.5px] text-cinza">
                  Compartilhe somente com a pessoa convidada.
                </p>
              </div>
              <button
                ref={fecharRef}
                type="button"
                onClick={() => setAberto(false)}
                className="min-h-9 shrink-0 border border-linha px-3 text-[13px] font-semibold text-tinta hover:border-azul"
              >
                Fechar
              </button>
            </div>

            <div className="px-5 py-5">
              {pendente && <p className="text-[14px] text-cinza">Gerando link seguro…</p>}
              {estado?.erro && <p className="text-[14px] text-critico">{estado.erro}</p>}
              {estado?.link && (
                <>
                  <p className="max-w-[62ch] text-[14px] leading-6 text-tinta">
                    O link vale por 7 dias e pode ser usado uma única vez para definir a senha.
                  </p>
                  <input
                    readOnly
                    value={estado.link}
                    aria-label="Link de acesso para compartilhar"
                    className="mt-4 block w-full rounded-[2px] border border-linha bg-papel px-3 py-2.5 text-[13px] text-tinta"
                    onFocus={(evento) => evento.currentTarget.select()}
                  />
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={copiar}
                      className="min-h-10 bg-verde px-4 font-[family-name:var(--font-interface)] text-[13.5px] font-semibold text-tinta hover:bg-verde-esc hover:text-branco"
                    >
                      {copiado ? "Link copiado" : "Copiar link"}
                    </button>
                    <button type="button" onClick={gerarLink} disabled={pendente} className={linkAcao}>
                      Gerar outro link
                    </button>
                  </div>
                  <p className="mt-4 border-l-2 border-ambar pl-3 text-[12.5px] leading-5 text-cinza">
                    Ao gerar outro link, este é cancelado imediatamente.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
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
