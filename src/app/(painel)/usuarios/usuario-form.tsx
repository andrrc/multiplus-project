"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { Perfil } from "@prisma/client";
import { Campo, SecaoNumerada, inputClass } from "@/ui/campo";
import type { OpcaoAtribuicao } from "@/lib/usuarios";

export type EstadoFormularioUsuario = {
  erro?: string;
  /** Campo a destacar no formulário, para o erro aparecer junto do que precisa mudar. */
  campo?: "email" | "nome";
};

export type AcaoFormularioUsuario = (
  estadoAnterior: EstadoFormularioUsuario,
  formData: FormData,
) => Promise<EstadoFormularioUsuario>;

const PERFIS: { valor: Perfil; rotulo: string; explicacao: string }[] = [
  {
    valor: "ADMIN",
    rotulo: "Administrador",
    explicacao: "Acesso total ao sistema — sem atribuição específica.",
  },
  {
    valor: "ADMIN_INTERNO",
    rotulo: "Colaborador Interno",
    explicacao: "Vê todas as tarefas e subtarefas dos projetos selecionados.",
  },
  {
    valor: "ADMIN_EXTERNO",
    rotulo: "Colaborador Externo",
    explicacao: "Vê apenas as tarefas selecionadas, sem visão do projeto.",
  },
];

/** Agrupa as opções por cliente (e, nas tarefas, por projeto), como no wireframe da A2. */
function agrupar(opcoes: OpcaoAtribuicao[]): Map<string, OpcaoAtribuicao[]> {
  const grupos = new Map<string, OpcaoAtribuicao[]>();
  for (const opcao of opcoes) {
    const chave = opcao.projeto ? `${opcao.cliente} › ${opcao.projeto}` : opcao.cliente;
    grupos.set(chave, [...(grupos.get(chave) ?? []), opcao]);
  }
  return grupos;
}

function SelecaoAtribuicoes({
  opcoes,
  selecionadas,
  vazioTexto,
}: {
  opcoes: OpcaoAtribuicao[];
  selecionadas: string[];
  vazioTexto: string;
}) {
  if (opcoes.length === 0) {
    return (
      <p className="rounded-[3px] border border-linha bg-branco px-4 py-3.5 text-[14.5px] text-cinza">
        {vazioTexto}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-[3px] border border-linha bg-branco px-4 py-3.5">
      {[...agrupar(opcoes)].map(([grupo, itens]) => (
        <fieldset key={grupo} className="flex flex-col gap-2">
          <legend className="font-[family-name:var(--font-interface)] text-[13px] font-semibold text-tinta">
            {grupo}
          </legend>
          {itens.map((opcao) => (
            <label key={opcao.entidadeId} className="flex items-center gap-2 text-[14.5px] text-tinta">
              <input
                type="checkbox"
                name="atribuicoes"
                value={`${opcao.entidadeTipo}:${opcao.entidadeId}`}
                defaultChecked={selecionadas.includes(opcao.entidadeId)}
                className="h-4 w-4 accent-verde"
              />
              {opcao.nome}
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}

export function UsuarioForm({
  acao,
  titulo,
  rotuloEnvio,
  inicial,
  opcoesProjeto,
  opcoesTarefa,
  atribuicoesSelecionadas = [],
  mostrarAtribuicoes = true,
}: {
  acao: AcaoFormularioUsuario;
  titulo: string;
  rotuloEnvio: string;
  inicial?: {
    nome: string;
    email: string;
    perfil: Perfil;
  };
  opcoesProjeto: OpcaoAtribuicao[];
  opcoesTarefa: OpcaoAtribuicao[];
  atribuicoesSelecionadas?: string[];
  /** A edição usa a Tela A3 para atribuições; só a criação as traz no próprio formulário. */
  mostrarAtribuicoes?: boolean;
}) {
  const [estado, formAction, pendente] = useActionState(acao, {});
  const [perfil, setPerfil] = useState<Perfil>(inicial?.perfil ?? "ADMIN_INTERNO");

  const descricaoPerfil = PERFIS.find((p) => p.valor === perfil)?.explicacao;

  return (
    <div className="w-full max-w-[720px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[24px] sm:text-[28px]">{titulo}</h1>
        <Link href="/usuarios" className="text-[14px] text-cinza hover:text-tinta">
          Cancelar
        </Link>
      </div>

      <form action={formAction} className="mt-8 flex flex-col gap-8">
        <SecaoNumerada
          numero={1}
          titulo="Identificação"
          descricao="Nome e e-mail são obrigatórios."
        >
          <div className="flex flex-col gap-4">
            <Campo label="Nome" obrigatorio>
              <input
                name="nome"
                required
                defaultValue={inicial?.nome}
                autoComplete="off"
                className={inputClass}
              />
            </Campo>
            <Campo label="E-mail" obrigatorio>
              <input
                name="email"
                type="email"
                required
                defaultValue={inicial?.email}
                autoComplete="off"
                className={inputClass}
                aria-invalid={estado.campo === "email" || undefined}
              />
            </Campo>
            {estado.campo === "email" && estado.erro && (
              <p className="text-[14px] text-critico">{estado.erro}</p>
            )}

          </div>
        </SecaoNumerada>

        <SecaoNumerada
          numero={2}
          titulo="Perfil de acesso"
          descricao="Define a granularidade do que a pessoa enxerga."
        >
          <div className="flex flex-col gap-2.5">
            {PERFIS.map((opcao) => (
              <label key={opcao.valor} className="flex items-center gap-2 text-[14.5px] text-tinta">
                <input
                  type="radio"
                  name="perfil"
                  value={opcao.valor}
                  checked={perfil === opcao.valor}
                  onChange={() => setPerfil(opcao.valor)}
                  className="accent-verde"
                />
                {opcao.rotulo}
              </label>
            ))}
            {descricaoPerfil && <p className="mt-1 text-[14px] text-cinza">{descricaoPerfil}</p>}
          </div>
        </SecaoNumerada>

        {mostrarAtribuicoes && (
          <SecaoNumerada
            numero={3}
            titulo="Atribuições"
            descricao="O que esta pessoa passa a enxergar. Pode ficar em branco e ser definido depois."
          >
            {perfil === "ADMIN" ? (
              <p className="rounded-[3px] border border-linha bg-branco px-4 py-3.5 text-[14.5px] text-cinza">
                Administrador enxerga tudo e não recebe atribuição.
              </p>
            ) : perfil === "ADMIN_INTERNO" ? (
              <SelecaoAtribuicoes
                opcoes={opcoesProjeto}
                selecionadas={atribuicoesSelecionadas}
                vazioTexto="Nenhum projeto cadastrado ainda. Assim que houver projetos, eles aparecem aqui para seleção."
              />
            ) : (
              <SelecaoAtribuicoes
                opcoes={opcoesTarefa}
                selecionadas={atribuicoesSelecionadas}
                vazioTexto="Nenhuma tarefa cadastrada ainda. Assim que houver tarefas, elas aparecem aqui para seleção."
              />
            )}
          </SecaoNumerada>
        )}

        {estado.erro && !estado.campo && (
          <p className="rounded-[3px] border-l-[3px] border-critico bg-branco px-4 py-3 text-[14.5px] text-critico">
            {estado.erro}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={pendente}
            className="min-h-11 rounded-[3px] bg-verde px-5 py-2.5 font-[family-name:var(--font-interface)] text-[14px] font-semibold text-tinta hover:bg-verde-esc hover:text-branco disabled:opacity-60"
          >
            {pendente ? "Salvando…" : rotuloEnvio}
          </button>
          <Link
            href="/usuarios"
            className="flex min-h-11 items-center px-4 text-[14px] text-cinza hover:text-tinta"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
