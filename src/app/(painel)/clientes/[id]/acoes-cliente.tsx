"use client";

import { useActionState, useState, useTransition } from "react";
import { inputClass } from "@/ui/campo";
import type { EntidadeDesativavel } from "@/lib/desativacao";
import {
  adicionarDocumentoAction,
  adicionarPessoaEnvolvidaAction,
  criarAcessoAction,
  criarAcessoPessoaEnvolvidaAction,
  definirAcessoAtivoAction,
  definirAtivoAction,
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

/** RF-028/ADR-007 — tipo Pessoa ou Empresa/PJ envolvida determina os campos exibidos. */
export function FormularioPessoaEnvolvida({ clienteId }: { clienteId: string }) {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<"PESSOA" | "EMPRESA">("PESSOA");
  const [estado, formAction, pendente] = useActionState(
    adicionarPessoaEnvolvidaAction.bind(null, clienteId),
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
        + Adicionar pessoa envolvida
      </button>
    );
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-3 rounded-[3px] border border-linha bg-branco p-4">
      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-1.5 text-[14px] text-tinta">
          <input
            type="radio"
            name="tipo"
            value="PESSOA"
            checked={tipo === "PESSOA"}
            onChange={() => setTipo("PESSOA")}
            className="accent-verde"
          />
          Pessoa
        </label>
        <label className="flex items-center gap-1.5 text-[14px] text-tinta">
          <input
            type="radio"
            name="tipo"
            value="EMPRESA"
            checked={tipo === "EMPRESA"}
            onChange={() => setTipo("EMPRESA")}
            className="accent-verde"
          />
          Empresa/PJ envolvida
        </label>
      </div>
      <input name="nome" required placeholder={tipo === "EMPRESA" ? "Razão social" : "Nome"} className={inputClass} />
      {tipo === "PESSOA" ? (
        <input name="cpf" placeholder="CPF (opcional)" className={inputClass} />
      ) : (
        <input name="cnpj" placeholder="CNPJ (opcional)" className={inputClass} />
      )}
      <input name="telefone" required placeholder="Telefone" className={inputClass} />
      <input name="email" required type="email" placeholder="E-mail" className={inputClass} />
      <label className="flex items-center gap-2 text-[14px] text-tinta">
        <input type="checkbox" name="temAcesso" className="h-4 w-4 accent-verde" />
        É um colaborador? Um e-mail será enviado para definir a senha de acesso.
      </label>
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
    <form action={formAction} className="flex w-full flex-col gap-3 rounded-[3px] border border-linha bg-branco p-4">
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

/**
 * RF-039 — desativar/reativar. A confirmação explica o efeito antes de acontecer, porque
 * "desativar" some com o registro das listagens sem apagá-lo, e essa diferença é
 * justamente o que a Talita precisa entender para usar o botão sem medo.
 */
export function BotaoDesativar({
  clienteId,
  entidade,
  id,
  ativo,
  efeito,
  tamanho = "normal",
}: {
  clienteId: string;
  entidade: EntidadeDesativavel;
  id: string;
  ativo: boolean;
  /** O que sai do ar ao desativar — dito em português, não em nome de tabela. */
  efeito: string;
  tamanho?: "normal" | "pequeno";
}) {
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const classe =
    tamanho === "pequeno"
      ? "text-[13px] font-medium text-azul-esc hover:underline disabled:opacity-60"
      : "text-[14px] font-medium text-azul-esc hover:underline disabled:opacity-60";

  function executar() {
    startTransition(async () => {
      const resultado = await definirAtivoAction(clienteId, entidade, id, !ativo);
      setErro(resultado.erro ?? null);
      setConfirmando(false);
    });
  }

  if (confirmando) {
    return (
      <span className="flex flex-col gap-1.5">
        <span className="text-[13px] text-cinza">{efeito} Você pode reativar depois.</span>
        <span className="flex gap-3">
          <button type="button" onClick={executar} disabled={pendente} className={classe}>
            {pendente ? "Desativando…" : "Confirmar"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmando(false)}
            className="text-[13px] text-cinza hover:text-tinta"
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
        className={classe}
      >
        {ativo ? "Desativar" : pendente ? "Reativando…" : "Reativar"}
      </button>
      {erro && <p className="mt-1 text-[13px] text-critico">{erro}</p>}
    </span>
  );
}

/** RF-033 — "criar acesso depois" pra Pessoa Envolvida cadastrada sem acesso (tem_acesso = não). */
export function BotaoCriarAcessoPessoaEnvolvida({
  clienteId,
  pessoaEnvolvidaId,
}: {
  clienteId: string;
  pessoaEnvolvidaId: string;
}) {
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <span>
      <button
        type="button"
        disabled={pendente}
        onClick={() =>
          startTransition(async () => {
            const resultado = await criarAcessoPessoaEnvolvidaAction(clienteId, pessoaEnvolvidaId);
            setErro(resultado.erro ?? null);
          })
        }
        className="text-[13px] font-medium text-azul-esc hover:underline disabled:opacity-60"
      >
        {pendente ? "Criando…" : "Criar acesso"}
      </button>
      {erro && <p className="mt-1 text-[13px] text-critico">{erro}</p>}
    </span>
  );
}
