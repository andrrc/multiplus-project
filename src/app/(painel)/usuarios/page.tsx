import Link from "next/link";
import type { Perfil } from "@prisma/client";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { listarUsuarios, ROTULO_STATUS, type UsuarioDaListagem } from "@/lib/usuarios";
import { Etiqueta, inputClass } from "@/ui/campo";
import {
  BotaoDesativarUsuario,
  BotaoGerarLinkConvite,
  BotaoReenviarConvite,
} from "./acoes-usuario";

/** Mesmos rótulos da barra lateral (reunião de aprovação da Sprint 2). */
const NOME_PERFIL: Record<Perfil, string> = {
  ADMIN: "Administrador",
  ADMIN_INTERNO: "Colaborador Interno",
  ADMIN_EXTERNO: "Colaborador Externo",
  CLIENTE: "Cliente",
};

const PERFIS_FILTRAVEIS: Perfil[] = ["ADMIN", "ADMIN_INTERNO", "ADMIN_EXTERNO"];

function EtiquetaStatus({ usuario }: { usuario: UsuarioDaListagem }) {
  const tom =
    usuario.status === "ATIVO" ? "positivo" : usuario.status === "PENDENTE" ? "atencao" : "apagado";
  return <Etiqueta tom={tom}>{ROTULO_STATUS[usuario.status]}</Etiqueta>;
}

/**
 * RF-040 — a contagem de atribuições é a informação que justifica esta coluna existir:
 * zero atribuições significa que a pessoa consegue entrar e não encontra nada, e isso
 * precisa ser dito com todas as letras, não insinuado por um número.
 */
function Atribuicoes({ usuario }: { usuario: UsuarioDaListagem }) {
  if (usuario.perfil === "ADMIN") {
    return <span className="text-[14px] text-cinza">Acesso total</span>;
  }

  if (usuario.totalAtribuicoes === 0) {
    return <Etiqueta tom="atencao">Sem atribuição — não vê nada ao entrar</Etiqueta>;
  }

  return (
    <span className="text-[14px] text-tinta">
      {usuario.totalAtribuicoes}{" "}
      {usuario.perfil === "ADMIN_INTERNO"
        ? usuario.totalAtribuicoes === 1
          ? "projeto"
          : "projetos"
        : usuario.totalAtribuicoes === 1
          ? "tarefa"
          : "tarefas"}
    </span>
  );
}

function LinhaUsuario({ usuario }: { usuario: UsuarioDaListagem }) {
  return (
    <li
      className={`flex flex-col gap-4 border-b border-linha px-5 py-4 last:border-b-0 md:flex-row md:items-start md:justify-between ${
        usuario.ativo ? "bg-branco" : "bg-papel"
      }`}
    >
      <div className="min-w-0 flex-1">
        <Link
          href={`/usuarios/${usuario.id}`}
          className="font-[family-name:var(--font-interface)] text-[15px] font-semibold text-tinta hover:text-azul-esc"
        >
          {usuario.nome}
        </Link>
        {usuario.cargo && (
          <p className="text-[13.5px] text-tinta">{usuario.cargo}</p>
        )}
        <p className="break-all text-[14px] text-cinza">{usuario.email}</p>
        {usuario.origemPessoaEnvolvida && (
          <p className="mt-1 text-[13px] text-cinza">
            Pessoa envolvida de {usuario.origemPessoaEnvolvida.cliente}
          </p>
        )}

        <dl className="mt-3 grid max-w-[690px] gap-x-6 gap-y-3 sm:grid-cols-3">
          <div>
            <dt className="text-[12px] text-cinza">Perfil</dt>
            <dd className="mt-0.5 text-[14px] text-tinta">{NOME_PERFIL[usuario.perfil]}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-cinza">Situação</dt>
            <dd className="mt-1"><EtiquetaStatus usuario={usuario} /></dd>
          </div>
          <div>
            <dt className="text-[12px] text-cinza">Acesso</dt>
            <dd className="mt-1"><Atribuicoes usuario={usuario} /></dd>
          </div>
        </dl>
      </div>

      <aside className="w-full shrink-0 border-t border-linha pt-3 md:w-[200px] md:border-t-0 md:pl-5 md:pt-0">
        <p className="font-[family-name:var(--font-interface)] text-[12px] font-medium text-cinza">
          Ações
        </p>
        <div className="mt-2.5 flex flex-wrap items-start gap-x-4 gap-y-2 md:flex-col md:gap-2">
          <Link
            href={`/usuarios/${usuario.id}/editar`}
            className="inline-flex min-h-11 items-center font-[family-name:var(--font-interface)] text-[13.5px] font-medium text-azul-esc hover:underline"
          >
            Editar dados
          </Link>
          {usuario.status === "PENDENTE" && <BotaoGerarLinkConvite usuarioId={usuario.id} />}
          {usuario.status === "PENDENTE" && <BotaoReenviarConvite usuarioId={usuario.id} />}
          <BotaoDesativarUsuario
            usuarioId={usuario.id}
            nome={usuario.nome}
            ativo={usuario.ativo}
          />
        </div>
      </aside>
    </li>
  );
}

function LinhaUsuarioDesktop({ usuario }: { usuario: UsuarioDaListagem }) {
  return (
    <tr className={`border-t border-linha align-top ${usuario.ativo ? "bg-branco" : "bg-papel"}`}>
      <td className="px-4 py-4">
        <Link href={`/usuarios/${usuario.id}`} className="font-semibold text-tinta hover:text-azul-esc hover:underline">{usuario.nome}</Link>
        {usuario.cargo && <p className="mt-1 text-cinza">{usuario.cargo}</p>}
        <p className="mt-1 break-all text-cinza">{usuario.email}</p>
        {usuario.origemPessoaEnvolvida && <p className="mt-1 text-cinza">Pessoa envolvida de {usuario.origemPessoaEnvolvida.cliente}</p>}
      </td>
      <td className="px-4 py-4">{NOME_PERFIL[usuario.perfil]}</td>
      <td className="px-4 py-4"><Atribuicoes usuario={usuario} /></td>
      <td className="px-4 py-4"><EtiquetaStatus usuario={usuario} /></td>
      <td className="px-4 py-4">
        <div className="flex flex-col items-start gap-1">
          <Link href={`/usuarios/${usuario.id}/editar`} className="inline-flex min-h-11 items-center text-azul-esc hover:underline">Editar dados</Link>
          {usuario.status === "PENDENTE" && <BotaoGerarLinkConvite usuarioId={usuario.id} />}
          {usuario.status === "PENDENTE" && <BotaoReenviarConvite usuarioId={usuario.id} />}
          <BotaoDesativarUsuario usuarioId={usuario.id} nome={usuario.nome} ativo={usuario.ativo} />
        </div>
      </td>
    </tr>
  );
}

/**
 * RF-030/RF-040 — retorno do cadastro que acabou de acontecer.
 *
 * O aviso de falha é o que importa aqui: quando o Resend está fora, o usuário é criado do
 * mesmo jeito (`criarUsuarioInterno` não derruba a criação por causa do e-mail) e a única
 * pista na listagem seria a etiqueta "Pendente de ativação" — idêntica à de um convite
 * recém-enviado com sucesso. Sem esta faixa, a Talita concluiria que o convite saiu.
 */
function RetornoConvite({ convite }: { convite?: string }) {
  if (convite === "enviado") {
    return (
      <p className="mt-5 rounded-[3px] border border-verde bg-verde-cl px-4 py-3 text-[14.5px] text-verde-esc">
        Usuário criado e convite enviado por e-mail.
      </p>
    );
  }

  if (convite === "falhou") {
    return (
      <p className="mt-5 rounded-[3px] border border-ambar bg-branco px-4 py-3 text-[14.5px] text-ambar">
        O usuário foi criado, mas o e-mail de convite não saiu. Use &ldquo;Reenviar
        convite&rdquo; na linha dele para tentar de novo.
      </p>
    );
  }

  if (convite === "manual") {
    return (
      <p className="mt-5 rounded-[3px] border border-ambar bg-branco px-4 py-3 text-[14.5px] text-ambar">
        O usuário foi criado, mas o envio de e-mail não está configurado. Na linha dele, use
        &ldquo;Gerar link de acesso&rdquo; para copiar e compartilhar um convite seguro.
      </p>
    );
  }

  return null;
}

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{
    busca?: string;
    perfil?: string;
    desativados?: string;
    convite?: string;
  }>;
}) {
  const ctx = await exigirAcessoARota("/usuarios");
  const { busca, perfil, desativados, convite } = await searchParams;

  const perfilFiltrado = PERFIS_FILTRAVEIS.find((p) => p === perfil);
  const incluirDesativados = desativados === "1";

  const usuarios = await listarUsuarios(ctx, {
    busca,
    perfil: perfilFiltrado,
    incluirDesativados,
  });

  return (
    <div className="w-full max-w-[1280px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[24px]">Usuários</h1>
        <Link
          href="/usuarios/novo"
          className="flex min-h-11 shrink-0 items-center rounded-[6px] bg-tinta px-5 py-2.5 font-[family-name:var(--font-interface)] text-[14px] font-semibold text-branco hover:bg-tinta2"
        >
          + Novo usuário
        </Link>
      </div>

      <RetornoConvite convite={convite} />

      <form className="mt-7 flex flex-wrap items-center gap-3">
        <input
          type="search"
          name="busca"
          aria-label="Buscar usuários"
          defaultValue={busca}
          placeholder="Buscar por nome, e-mail ou cargo"
          className={`${inputClass} placeholder:text-cinza sm:max-w-sm`}
        />
        <select name="perfil" aria-label="Filtrar por perfil" defaultValue={perfilFiltrado ?? ""} className={`${inputClass} sm:w-auto`}>
          <option value="">Todos os perfis</option>
          {PERFIS_FILTRAVEIS.map((p) => (
            <option key={p} value={p}>
              {NOME_PERFIL[p]}
            </option>
          ))}
        </select>
        <label className="flex min-h-11 items-center gap-2 text-[14px] text-tinta">
          <input
            type="checkbox"
            name="desativados"
            value="1"
            defaultChecked={incluirDesativados}
            className="h-4 w-4 accent-verde"
          />
          Mostrar desativados
        </label>
        <button
          type="submit"
          className="min-h-11 w-full rounded-[3px] border border-linha px-4 py-2.5 text-[14px] font-medium text-tinta hover:border-azul sm:w-auto"
        >
          Filtrar
        </button>
      </form>

      {usuarios.length === 0 ? (
        <div className="mt-7 rounded-[3px] border border-linha bg-branco px-6 py-10 text-center">
          <p className="text-[15px] text-cinza">
            {busca || perfilFiltrado
              ? "Nenhum usuário corresponde a esse filtro."
              : "Nenhum usuário além de você."}
          </p>
          <Link
            href="/usuarios/novo"
            className="mt-4 inline-flex min-h-11 items-center rounded-[6px] bg-tinta px-5 py-2.5 font-[family-name:var(--font-interface)] text-[14px] font-semibold text-branco hover:bg-tinta2"
          >
            + Novo usuário
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-7 overflow-hidden rounded-[3px] border border-linha md:hidden">
            {usuarios.map((usuario) => <LinhaUsuario key={usuario.id} usuario={usuario} />)}
          </ul>
          <div className="mt-7 hidden overflow-hidden rounded-[3px] border border-linha bg-branco md:block">
            <table className="w-full table-fixed text-left text-[13px]">
              <caption className="sr-only">Usuários e acessos</caption>
              <colgroup><col className="w-[30%]" /><col className="w-[15%]" /><col className="w-[20%]" /><col className="w-[15%]" /><col className="w-[20%]" /></colgroup>
              <thead className="bg-papel text-cinza"><tr><th scope="col" className="px-4 py-3">Nome</th><th scope="col" className="px-4 py-3">Perfil</th><th scope="col" className="px-4 py-3">O que acessa</th><th scope="col" className="px-4 py-3">Situação</th><th scope="col" className="px-4 py-3">Ações</th></tr></thead>
              <tbody>{usuarios.map((usuario) => <LinhaUsuarioDesktop key={usuario.id} usuario={usuario} />)}</tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
