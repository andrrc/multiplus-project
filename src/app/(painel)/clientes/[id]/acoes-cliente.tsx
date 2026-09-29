"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { inputClass } from "@/ui/campo";
import type { EntidadeDesativavel } from "@/lib/desativacao";
import { mascararCnpj, mascararCpf } from "@/lib/formatacao";
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
  const [cpf, setCpf] = useState("");
  const [cnpj, setCnpj] = useState("");
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
        <input
          name="cpf"
          value={cpf}
          onChange={(evento) => setCpf(mascararCpf(evento.target.value))}
          inputMode="numeric"
          placeholder="CPF (opcional): 000.000.000-00"
          className={inputClass}
        />
      ) : (
        <input
          name="cnpj"
          value={cnpj}
          onChange={(evento) => setCnpj(mascararCnpj(evento.target.value))}
          inputMode="numeric"
          placeholder="CNPJ (opcional): 00.000.000/0000-00"
          className={inputClass}
        />
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
        + Adicionar link do Drive
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
      {ativo ? "Bloquear acesso ao portal" : "Desbloquear acesso ao portal"}
    </button>
  );
}

/** Desativação do cadastro do cliente, claramente separada do acesso ao portal. */
export function BotaoDesativarCliente({
  clienteId,
  nome,
  ativo,
  instancia,
}: {
  clienteId: string;
  nome: string;
  ativo: boolean;
  instancia: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const dialogId = `desativar-cliente-${instancia}-${clienteId}`;
  const compacto = instancia.startsWith("lista-");

  function alterarAtivo(novoEstado: boolean) {
    setErro(null);
    startTransition(async () => {
      const resultado = await definirAtivoAction(clienteId, "cliente", clienteId, novoEstado);
      if (resultado.erro) {
        setErro(resultado.erro);
        return;
      }
      dialogRef.current?.close();
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={pendente}
        aria-label={`${ativo ? "Desativar" : "Reativar"} cliente ${nome}`}
        onClick={() => {
          setErro(null);
          if (ativo) dialogRef.current?.showModal();
          else alterarAtivo(true);
        }}
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-[3px] border font-[family-name:var(--font-interface)] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azul-esc disabled:opacity-60 ${compacto ? "min-h-8 w-fit px-2.5 py-1 text-[12px]" : "min-h-9 px-3 py-1.5 text-[13px]"} ${
          ativo
            ? "border-[#E4A9A9] bg-[#FFF7F7] text-critico hover:bg-[#FDE9E9]"
            : "border-linha bg-branco text-azul-esc hover:border-azul"
        }`}
      >
        {pendente
          ? compacto
            ? ativo ? "Desativando…" : "Reativando…"
            : ativo ? "Desativando cliente…" : "Reativando cliente…"
          : compacto
            ? ativo ? "Desativar" : "Reativar"
            : ativo ? "Desativar cliente" : "Reativar cliente"}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={`${dialogId}-titulo`}
        aria-describedby={`${dialogId}-efeito ${dialogId}-acesso`}
        onClick={(event) => {
          if (event.target === dialogRef.current && !pendente) dialogRef.current?.close();
        }}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[480px] overflow-y-auto border-0 bg-transparent p-0 text-tinta backdrop:bg-tinta/60"
      >
        <div className="overflow-hidden rounded-[4px] border border-linha bg-branco shadow-2xl">
          <div className="border-b border-linha bg-papel px-5 py-5 sm:px-6">
            <p className="text-[12px] font-semibold text-critico">Cadastro do cliente</p>
            <h2 id={`${dialogId}-titulo`} className="mt-1 text-[20px] font-semibold text-tinta">
              Desativar {nome}?
            </h2>
          </div>
          <div className="px-5 py-5 sm:px-6">
            <p id={`${dialogId}-efeito`} className="text-[14px] leading-6 text-tinta">
              O cadastro sairá das listas de clientes ativos e ficará somente para consulta. Os projetos e registros vinculados deixarão de ficar disponíveis enquanto ele estiver desativado. O histórico será preservado e você poderá reativá-lo depois.
            </p>
            <p id={`${dialogId}-acesso`} className="mt-3 border-l-2 border-azul-esc pl-3 text-[13px] leading-5 text-cinza">
              Esta ação não bloqueia o login do portal. Para bloquear o acesso, use “Acesso ao portal do cliente” separadamente.
            </p>
            {erro && <p role="alert" className="mt-4 text-[13px] text-critico">{erro}</p>}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                autoFocus
                disabled={pendente}
                onClick={() => dialogRef.current?.close()}
                className="min-h-10 rounded-[3px] border border-linha px-4 py-2 font-[family-name:var(--font-interface)] text-[14px] font-medium text-tinta hover:bg-papel disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pendente}
                onClick={() => alterarAtivo(false)}
                className="min-h-10 rounded-[3px] bg-critico px-4 py-2 font-[family-name:var(--font-interface)] text-[14px] font-semibold text-branco hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-critico disabled:opacity-60"
              >
                {pendente ? "Desativando…" : "Desativar cadastro"}
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </>
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
