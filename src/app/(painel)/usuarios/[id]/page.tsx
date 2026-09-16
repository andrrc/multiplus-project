import Link from "next/link";
import { notFound } from "next/navigation";
import type { Perfil } from "@prisma/client";
import { exigirAcessoARota } from "@/server/auth/contexto";
import {
  buscarUsuario,
  granularidadeDoPerfil,
  listarAtribuicoesDetalhadas,
  listarOpcoesDeAtribuicao,
  ROTULO_STATUS,
  statusAcesso,
  type AtribuicaoDetalhada,
} from "@/lib/usuarios";
import { Etiqueta } from "@/ui/campo";
import { BotaoRemoverAtribuicao } from "../acoes-usuario";
import { AdicionarAtribuicao } from "./adicionar-atribuicao";

const NOME_PERFIL: Record<Perfil, string> = {
  ADMIN: "Administrador",
  ADMIN_INTERNO: "Colaborador Interno",
  ADMIN_EXTERNO: "Colaborador Externo",
  CLIENTE: "Cliente",
};

const GRANULARIDADE: Record<Perfil, string> = {
  ADMIN: "Acesso total — não recebe atribuição",
  ADMIN_INTERNO: "Atribuído por projeto (RN-005)",
  ADMIN_EXTERNO: "Atribuído por tarefa (RN-005)",
  CLIENTE: "Vinculado ao próprio cadastro",
};

/** Mesmo par rótulo/valor da tela de Detalhe do Cliente, para as duas telas se parecerem. */
function DadoCadastral({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div>
      <p className="font-[family-name:var(--font-interface)] text-[11.5px] font-medium tracking-[0.04em] text-cinza uppercase">
        {rotulo}
      </p>
      <p className="mt-1 font-[family-name:var(--font-interface)] text-[14.5px] text-tinta">
        {valor}
      </p>
    </div>
  );
}

function LinhaAtribuicao({
  atribuicao,
  usuarioId,
}: {
  atribuicao: AtribuicaoDetalhada;
  usuarioId: string;
}) {
  const automatica = atribuicao.origem === "AUTOMATICA";

  return (
    <li className="flex flex-col gap-2 border-b border-linha px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:gap-5">
      <div className="min-w-0 flex-1">
        <p className="font-[family-name:var(--font-interface)] text-[14.5px] font-medium text-tinta">
          {atribuicao.entidadeNome ?? "(registro removido)"}
        </p>
        <p className="text-[13.5px] text-cinza">
          {atribuicao.cliente ?? "—"} · {atribuicao.entidadeTipo === "PROJETO" ? "Projeto" : "Tarefa"}
        </p>
      </div>

      <div className="shrink-0 sm:w-[230px]">
        <Etiqueta tom={automatica ? "neutro" : "positivo"}>
          {automatica ? "Automática (responsável)" : "Manual"}
        </Etiqueta>
      </div>

      <div className="shrink-0 sm:w-[210px] sm:text-right">
        {automatica ? (
          <p className="text-[13px] text-cinza">
            Para remover, troque o responsável da tarefa.
          </p>
        ) : (
          <BotaoRemoverAtribuicao usuarioId={usuarioId} atribuicaoId={atribuicao.id} />
        )}
      </div>
    </li>
  );
}

export default async function DetalheUsuarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ atribuicoesRemovidas?: string }>;
}) {
  const { id } = await params;
  const { atribuicoesRemovidas } = await searchParams;
  const ctx = await exigirAcessoARota("/usuarios");

  const usuario = await buscarUsuario(ctx, id);
  if (!usuario) notFound();

  const granularidade = granularidadeDoPerfil(usuario.perfil);
  const [atribuicoes, opcoes] = await Promise.all([
    listarAtribuicoesDetalhadas(ctx, id),
    listarOpcoesDeAtribuicao(ctx, usuario.perfil),
  ]);

  const jaAtribuidos = new Set(atribuicoes.map((a) => a.entidadeId));
  const disponiveis = opcoes.filter((o) => !jaAtribuidos.has(o.entidadeId));
  const status = statusAcesso(usuario);

  return (
    <div className="w-full max-w-[1000px]">
      <Link href="/usuarios" className="text-[14px] text-cinza hover:text-tinta">
        ← Usuários
      </Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] sm:text-[28px]">{usuario.nome}</h1>
          <p className="mt-1.5 text-[15px] text-cinza">{usuario.email}</p>
        </div>
        <Link
          href={`/usuarios/${id}/editar`}
          className="flex min-h-11 shrink-0 items-center rounded-[3px] border border-linha px-5 py-2.5 font-[family-name:var(--font-interface)] text-[14px] font-medium text-tinta hover:border-azul"
        >
          Editar
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <Etiqueta>{NOME_PERFIL[usuario.perfil]}</Etiqueta>
        <Etiqueta tom={status === "ATIVO" ? "positivo" : status === "PENDENTE" ? "atencao" : "apagado"}>
          {ROTULO_STATUS[status]}
        </Etiqueta>
        <span className="text-[14px] text-cinza">{GRANULARIDADE[usuario.perfil]}</span>
      </div>


      {atribuicoesRemovidas && (
        <p className="mt-5 rounded-[3px] border-l-[3px] border-ambar bg-branco px-4 py-3 text-[14.5px] text-ambar">
          A troca de perfil removeu {atribuicoesRemovidas}{" "}
          {Number(atribuicoesRemovidas) === 1 ? "atribuição que não correspondia" : "atribuições que não correspondiam"}{" "}
          à nova granularidade.
        </p>
      )}

      <section className="mt-9">
        <h2 className="text-[19px]">Atribuições</h2>

        {usuario.perfil === "ADMIN" ? (
          <p className="mt-4 rounded-[3px] border border-linha bg-branco px-5 py-4 text-[14.5px] text-cinza">
            Administrador enxerga todos os clientes, projetos e tarefas sem precisar de
            atribuição.
          </p>
        ) : (
          <>
            {atribuicoes.length === 0 ? (
              <p className="mt-4 rounded-[3px] border-l-[3px] border-ambar bg-branco px-5 py-4 text-[14.5px] text-ambar">
                Nenhuma atribuição — este usuário não visualiza nada ao entrar.
              </p>
            ) : (
              <ul className="mt-4 overflow-hidden rounded-[3px] border border-linha bg-branco">
                {atribuicoes.map((atribuicao) => (
                  <LinhaAtribuicao key={atribuicao.id} atribuicao={atribuicao} usuarioId={id} />
                ))}
              </ul>
            )}

            <div className="mt-4">
              <AdicionarAtribuicao
                usuarioId={id}
                opcoes={disponiveis}
                vazioTexto={
                  granularidade === "PROJETO"
                    ? "Não há projetos disponíveis para atribuir. O módulo de Projetos entra na próxima sprint."
                    : "Não há tarefas disponíveis para atribuir. O módulo de Tarefas entra na próxima sprint."
                }
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
