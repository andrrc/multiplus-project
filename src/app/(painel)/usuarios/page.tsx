import Link from "next/link";
import type { Perfil } from "@prisma/client";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { listarUsuarios, ROTULO_STATUS, type UsuarioDaListagem } from "@/lib/usuarios";
import { Etiqueta } from "@/ui/campo";
import { botaoPrimario } from "@/ui/botoes";
import { CelulaLista, LinhaLista, StatusPonto, TabelaLista, TextoSecundario, TituloLinha, Vazio } from "@/ui/lista";
import {
  BotaoDesativarUsuario,
  BotaoGerarLinkConvite,
  BotaoReenviarConvite,
} from "./acoes-usuario";
import { FiltrosUsuarios } from "./filtros-usuarios";

/** Mesmos rótulos da barra lateral (reunião de aprovação da Sprint 2). */
const NOME_PERFIL: Record<Perfil, string> = {
  ADMIN: "Administração",
  ADMIN_INTERNO: "Colaborador interno",
  ADMIN_EXTERNO: "Colaborador externo",
  CLIENTE: "Cliente",
};

const PERFIS_FILTRAVEIS: Perfil[] = ["ADMIN", "ADMIN_INTERNO", "ADMIN_EXTERNO"];
const SITUACOES_FILTRAVEIS = ["ativo", "pendente", "desativado"] as const;

const COLUNAS = [
  { titulo: "Nome", largura: "26%" },
  { titulo: "Perfil", largura: "16%" },
  { titulo: "O que acessa", largura: "20%" },
  { titulo: "Situação", largura: "15%" },
  { titulo: "Ações", largura: "23%" },
];

/**
 * RF-040 — a contagem de atribuições é a informação que justifica esta coluna existir:
 * zero atribuições significa que a pessoa consegue entrar e não encontra nada, e isso
 * precisa ser dito com todas as letras, não insinuado por um número.
 */
function Atribuicoes({ usuario }: { usuario: UsuarioDaListagem }) {
  if (usuario.perfil === "ADMIN") {
    return <span className="text-cinza">Acesso total</span>;
  }

  if (usuario.totalAtribuicoes === 0) {
    return <Etiqueta tom="atencao">Sem atribuição — não vê nada ao entrar</Etiqueta>;
  }

  return (
    <span className="text-ink">
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

/**
 * RF-030/RF-040 — retorno do cadastro que acabou de acontecer.
 *
 * O aviso de falha é o que importa aqui: quando o Resend está fora, o usuário é criado do
 * mesmo jeito (`criarUsuarioInterno` não derruba a criação por causa do e-mail) e a única
 * pista na listagem seria a situação "Pendente de ativação" — idêntica à de um convite
 * recém-enviado com sucesso. Sem esta faixa, a Talita concluiria que o convite saiu.
 */
function RetornoConvite({ convite }: { convite?: string }) {
  if (convite === "enviado") {
    return (
      <p className="mt-5 rounded-cartao border border-verde-borda bg-verde-cl px-4 py-3 text-sm text-verde-esc">
        Usuário criado e convite enviado por e-mail.
      </p>
    );
  }

  if (convite === "falhou") {
    return (
      <p className="mt-5 rounded-cartao border border-ambar/25 bg-ambar-cl px-4 py-3 text-sm text-ambar">
        O usuário foi criado, mas o e-mail de convite não saiu. Use &ldquo;Reenviar
        convite&rdquo; na linha dele para tentar de novo.
      </p>
    );
  }

  if (convite === "manual") {
    return (
      <p className="mt-5 rounded-cartao border border-ambar/25 bg-ambar-cl px-4 py-3 text-sm text-ambar">
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
    situacao?: string;
    desativados?: string;
    convite?: string;
  }>;
}) {
  const ctx = await exigirAcessoARota("/usuarios");
  const { busca, perfil, situacao, desativados, convite } = await searchParams;

  const perfilFiltrado = PERFIS_FILTRAVEIS.find((p) => p === perfil);
  const situacaoFiltrada = SITUACOES_FILTRAVEIS.find((s) => s === situacao);
  const incluirDesativados = desativados === "1";

  // A consulta traz todos os perfis da equipe; o perfil e a situação são aplicados aqui para que
  // os botões de perfil mostrem a contagem de cada um dentro da busca atual.
  const todos = await listarUsuarios(ctx, { busca, incluirDesativados });
  const naSituacao = situacaoFiltrada
    ? todos.filter((usuario) => usuario.status.toLowerCase() === situacaoFiltrada)
    : todos;
  const usuarios = perfilFiltrado ? naSituacao.filter((usuario) => usuario.perfil === perfilFiltrado) : naSituacao;
  const opcoesPerfil = [
    { valor: "", rotulo: "Todos", total: naSituacao.length },
    ...PERFIS_FILTRAVEIS.map((p) => ({ valor: p, rotulo: NOME_PERFIL[p], total: naSituacao.filter((usuario) => usuario.perfil === p).length })),
  ];

  return (
    <div className="w-full max-w-[1280px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl">Usuários</h1>
          <p className="mt-1 text-sm text-cinza">Pessoas da equipe com acesso ao sistema.</p>
        </div>
        <Link href="/usuarios/novo" className={botaoPrimario}>+ Novo usuário</Link>
      </div>

      <RetornoConvite convite={convite} />

      <FiltrosUsuarios
        key={`${busca ?? ""}|${perfilFiltrado ?? ""}|${situacaoFiltrada ?? ""}|${incluirDesativados}`}
        buscaInicial={busca ?? ""}
        perfilInicial={perfilFiltrado ?? ""}
        situacaoInicial={situacaoFiltrada ?? ""}
        desativadosInicial={incluirDesativados}
        opcoesPerfil={opcoesPerfil}
        total={usuarios.length}
      />

      {usuarios.length === 0 ? (
        <Vazio
          titulo={busca || perfilFiltrado || situacaoFiltrada ? "Nenhum usuário corresponde a esse filtro." : "Nenhum usuário além de você."}
          descricao="Ajuste a busca ou os filtros, ou cadastre uma pessoa da equipe."
        />
      ) : (
        <TabelaLista rotulo="Usuários e acessos" colunas={COLUNAS}>
          {usuarios.map((usuario) => (
            <LinhaLista key={usuario.id}>
              <CelulaLista larga>
                <TituloLinha href={`/usuarios/${usuario.id}`}>{usuario.nome}</TituloLinha>
                <TextoSecundario>{usuario.email}</TextoSecundario>
                {usuario.cargo && <TextoSecundario>{usuario.cargo}</TextoSecundario>}
                {usuario.origemPessoaEnvolvida && <TextoSecundario>Pessoa envolvida de {usuario.origemPessoaEnvolvida.cliente}</TextoSecundario>}
              </CelulaLista>
              <CelulaLista rotulo="Perfil"><span>{NOME_PERFIL[usuario.perfil]}</span></CelulaLista>
              <CelulaLista rotulo="O que acessa"><Atribuicoes usuario={usuario} /></CelulaLista>
              <CelulaLista rotulo="Situação"><StatusPonto status={usuario.status}>{ROTULO_STATUS[usuario.status]}</StatusPonto></CelulaLista>
              <CelulaLista larga>
                {/* Acima do link esticado do nome, para os botões continuarem clicáveis. */}
                <div className="relative z-10 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <Link href={`/usuarios/${usuario.id}/editar`} className="inline-flex min-h-11 items-center font-[family-name:var(--font-interface)] text-[13.5px] font-medium text-azul-esc hover:underline md:min-h-8">Editar dados</Link>
                  {usuario.status === "PENDENTE" && <BotaoGerarLinkConvite usuarioId={usuario.id} />}
                  {usuario.status === "PENDENTE" && <BotaoReenviarConvite usuarioId={usuario.id} />}
                  <BotaoDesativarUsuario usuarioId={usuario.id} nome={usuario.nome} ativo={usuario.ativo} />
                </div>
              </CelulaLista>
            </LinhaLista>
          ))}
        </TabelaLista>
      )}
    </div>
  );
}
