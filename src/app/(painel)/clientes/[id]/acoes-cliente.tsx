"use client";

import { useActionState, useState, useTransition } from "react";
import { inputClass } from "../campo";
import {
  adicionarDocumentoAction,
  adicionarPessoaOperacionalAction,
  criarAcessoAction,
  definirAcessoAtivoAction,
} from "./actions";

/**
 * Fecha o formulário quando a action tem sucesso, ajustando o estado durante o
 * próprio render (em vez de useEffect) — evita o re-render em cascata que o
 * lint (react-hooks/set-state-in-effect) sinaliza para setState síncrono em efeito.
 */
function useFecharAoSucesso(sucessoEm: number | undefined, setAberto: (aberto: boolean) => void) {
  const [ultimoSucessoEm, setUltimoSucessoEm] = useState(sucessoEm);
  if (sucessoEm !== ultimoSucessoEm) {
    setUltimoSucessoEm(sucessoEm);
    if (sucessoEm) setAberto(false);
  }
}

export function FormularioPessoaOperacional({ clienteId }: { clienteId: string }) {
  const [aberto, setAberto] = useState(false);
  const [estado, formAction, pendente] = useActionState(
    adicionarPessoaOperacionalAction.bind(null, clienteId),
    {},
  );

  useFecharAoSucesso(estado.sucessoEm, setAberto);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-[14px] font-medium text-azul-esc hover:underline"
      >
        + Adicionar pessoa
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-[3px] border border-linha bg-branco p-4">
      <input name="nome" required placeholder="Nome" className={inputClass} />
      <input name="cargo" required placeholder="Cargo" className={inputClass} />
      <input name="email" type="email" placeholder="E-mail (opcional)" className={inputClass} />
      {estado.erro && <p className="text-[14px] text-critico">{estado.erro}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pendente}
          className="rounded-[3px] bg-verde px-4 py-2 text-[14px] font-medium text-tinta hover:bg-verde-esc hover:text-branco disabled:opacity-60"
        >
          {pendente ? "Salvando…" : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="px-4 py-2 text-[14px] text-cinza hover:text-tinta"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function FormularioDocumento({ clienteId }: { clienteId: string }) {
  const [aberto, setAberto] = useState(false);
  const [estado, formAction, pendente] = useActionState(
    adicionarDocumentoAction.bind(null, clienteId),
    {},
  );

  useFecharAoSucesso(estado.sucessoEm, setAberto);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-[14px] font-medium text-azul-esc hover:underline"
      >
        + Adicionar link de documento
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-[3px] border border-linha bg-branco p-4">
      <input name="nome" required placeholder="Nome do documento" className={inputClass} />
      <input name="link" required type="url" placeholder="Link do Google Drive" className={inputClass} />
      {estado.erro && <p className="text-[14px] text-critico">{estado.erro}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pendente}
          className="rounded-[3px] bg-verde px-4 py-2 text-[14px] font-medium text-tinta hover:bg-verde-esc hover:text-branco disabled:opacity-60"
        >
          {pendente ? "Salvando…" : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="px-4 py-2 text-[14px] text-cinza hover:text-tinta"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function BotaoCriarAcesso({ clienteId }: { clienteId: string }) {
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pendente}
        onClick={() =>
          startTransition(async () => {
            const resultado = await criarAcessoAction(clienteId);
            setErro(resultado.erro ?? null);
          })
        }
        className="rounded-[3px] border border-linha px-4 py-2 text-[14px] font-medium text-tinta hover:border-azul disabled:opacity-60"
      >
        {pendente ? "Criando…" : "Criar acesso do cliente"}
      </button>
      {erro && <p className="mt-2 text-[14px] text-critico">{erro}</p>}
    </div>
  );
}

export function BotaoAlternarAcesso({
  clienteId,
  usuarioId,
  ativo,
}: {
  clienteId: string;
  usuarioId: string;
  ativo: boolean;
}) {
  const [pendente, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => startTransition(() => definirAcessoAtivoAction(clienteId, usuarioId, !ativo))}
      className="text-[14px] font-medium text-azul-esc hover:underline disabled:opacity-60"
    >
      {ativo ? "Bloquear acesso" : "Desbloquear acesso"}
    </button>
  );
}
