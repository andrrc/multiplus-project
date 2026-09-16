import type { EntidadeTipo, Perfil } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { comContextoDeUsuario, type ContextoUsuario } from "@/lib/prisma-app";
import { enviarConviteDefinicaoSenha, type ResultadoConvite } from "@/lib/convites";
import { validarEmail } from "@/lib/validacao";
import { normalizarCpf, validarCpf } from "@/lib/cpf";
import { normalizarCnpj, validarCnpj } from "@/lib/cnpj";
import { hashSenha, verificarSenha } from "@/lib/senha";
import { validarPoliticaSenha } from "@/lib/politica-senha";

/**
 * RF-040 — status de acesso exibido na Tela A1. Derivado, não persistido: "pendente" é
 * exatamente "existe usuário mas ele nunca definiu senha", e "desativado" é o `ativo`
 * que já existia desde a Sprint 1 (RF-029). Uma coluna a mais só criaria a chance de ela
 * discordar dos dois campos que realmente decidem se a pessoa entra no sistema.
 */
export type StatusAcesso = "ATIVO" | "PENDENTE" | "DESATIVADO";

export function statusAcesso(usuario: {
  ativo: boolean;
  senhaHash: string | null;
}): StatusAcesso {
  if (!usuario.ativo) return "DESATIVADO";
  return usuario.senhaHash ? "ATIVO" : "PENDENTE";
}

export const ROTULO_STATUS: Record<StatusAcesso, string> = {
  ATIVO: "Ativo",
  PENDENTE: "Pendente de ativação",
  DESATIVADO: "Desativado",
};

/**
 * RN-005 — a granularidade da atribuição é consequência do perfil, não uma escolha à
 * parte: Colaborador Interno enxerga por projeto, Externo por tarefa, e o Administrador
 * enxerga tudo sem precisar de atribuição nenhuma. `null` = perfil que não recebe
 * atribuição.
 */
export function granularidadeDoPerfil(perfil: Perfil): EntidadeTipo | null {
  if (perfil === "ADMIN_INTERNO") return "PROJETO";
  if (perfil === "ADMIN_EXTERNO") return "TAREFA";
  return null;
}

/**
 * RF-040 — a Tela A1 lista quem trabalha no sistema. O perfil CLIENTE fica de fora: ele
 * não é usuário interno, nasce e morre pelo cadastro do cliente (RF-031/RF-029), e
 * misturá-lo aqui faria a Talita gerir o mesmo acesso por dois caminhos diferentes.
 */
const PERFIS_INTERNOS: Perfil[] = ["ADMIN", "ADMIN_INTERNO", "ADMIN_EXTERNO"];

export type FiltrosUsuarios = {
  busca?: string;
  perfil?: Perfil;
  incluirDesativados?: boolean;
};

export type UsuarioDaListagem = {
  id: string;
  nome: string;
  email: string;
  cargo: string | null;
  perfil: Perfil;
  ativo: boolean;
  status: StatusAcesso;
  totalAtribuicoes: number;
  /** ADR-005/ADR-007 — Pessoa Envolvida que originou este acesso (RF-028/RF-033), se houver. */
  origemPessoaEnvolvida: { nome: string; cliente: string } | null;
};

/**
 * RF-040 / RN-007 — listagem de usuários. Restrita ao Administrador tanto aqui quanto na
 * política `usuarios_select` (que devolve, para qualquer outro perfil, só a própria
 * linha). Os dois níveis são propositais: se um dia esta função for chamada de um lugar
 * novo sem a guarda da Server Action, o banco continua recusando.
 */
export async function listarUsuarios(
  ctx: ContextoUsuario,
  filtros: FiltrosUsuarios = {},
): Promise<UsuarioDaListagem[]> {
  if (ctx.perfil !== "ADMIN") return [];

  // O filtro por perfil só estreita o recorte, nunca o amplia: pedir `perfil: "CLIENTE"`
  // aqui devolve vazio em vez de listar os acessos de cliente, que são geridos pelo
  // cadastro do cliente (RF-029/RF-031) e não por esta tela.
  const perfilFiltrado =
    filtros.perfil && PERFIS_INTERNOS.includes(filtros.perfil) ? filtros.perfil : undefined;
  if (filtros.perfil && !perfilFiltrado) return [];

  const usuarios = await comContextoDeUsuario(ctx, (tx) =>
    tx.usuario.findMany({
      where: {
        perfil: perfilFiltrado ? perfilFiltrado : { in: PERFIS_INTERNOS },
        ...(filtros.incluirDesativados ? {} : { ativo: true }),
        ...(filtros.busca
          ? {
              OR: [
                { nome: { contains: filtros.busca, mode: "insensitive" as const } },
                { email: { contains: filtros.busca, mode: "insensitive" as const } },
                { cargo: { contains: filtros.busca, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        nome: true,
        email: true,
        cargo: true,
        perfil: true,
        ativo: true,
        senhaHash: true,
        _count: { select: { atribuicoes: true } },
        pessoaEnvolvida: { select: { nome: true, cliente: { select: { razaoSocial: true } } } },
      },
      orderBy: { nome: "asc" },
    }),
  );

  return usuarios.map((u) => ({
    id: u.id,
    nome: u.nome,
    email: u.email,
    cargo: u.cargo,
    perfil: u.perfil,
    ativo: u.ativo,
    status: statusAcesso(u),
    totalAtribuicoes: u._count.atribuicoes,
    origemPessoaEnvolvida: u.pessoaEnvolvida
      ? { nome: u.pessoaEnvolvida.nome, cliente: u.pessoaEnvolvida.cliente.razaoSocial }
      : null,
  }));
}

export async function buscarUsuario(ctx: ContextoUsuario, usuarioId: string) {
  if (ctx.perfil !== "ADMIN" && ctx.usuarioId !== usuarioId) return null;
  return comContextoDeUsuario(ctx, (tx) =>
    tx.usuario.findUnique({ where: { id: usuarioId } }),
  );
}

export type AtribuicaoInput = { entidadeTipo: EntidadeTipo; entidadeId: string };

/**
 * RF-030/RF-040 — dados de cadastro, todos opcionais. Campo em branco vira `undefined`
 * (NULL no banco), nunca string vazia persistida — mesmo tratamento que `limparDadosPessoa`
 * dá aos campos do cliente (RF-002d).
 *
 * `cpf` e `cnpj` são mutuamente exclusivos na prática (a pessoa é PF ou PJ), mas nada no
 * banco impede os dois: a checagem fica aqui, onde dá para explicar o motivo em português.
 */
export type DadosCadastraisUsuario = {
  cargo?: string;
  telefone?: string;
  cpf?: string;
  cnpj?: string;
  observacoes?: string;
};

export type NovoUsuarioInput = {
  nome: string;
  email: string;
  perfil: Perfil;
  atribuicoes: AtribuicaoInput[];
} & DadosCadastraisUsuario;

export type MotivoRecusaUsuario =
  | "sem_permissao"
  | "nome_obrigatorio"
  | "email_invalido"
  | "email_duplicado"
  | "perfil_invalido"
  | "atribuicao_incompativel"
  | "cpf_invalido"
  | "cnpj_invalido"
  | "cpf_e_cnpj";

/**
 * RF-030/RF-040 — normaliza os dados de cadastro para persistir: em branco vira
 * `undefined`, e CPF/CNPJ saem sem máscara, prontos para gravar.
 */
function limparDadosCadastrais(dados: DadosCadastraisUsuario) {
  const cpf = dados.cpf?.trim();
  const cnpj = dados.cnpj?.trim();

  return {
    cargo: dados.cargo?.trim() || undefined,
    telefone: dados.telefone?.trim() || undefined,
    cpf: cpf ? normalizarCpf(cpf) : undefined,
    cnpj: cnpj ? normalizarCnpj(cnpj) : undefined,
    observacoes: dados.observacoes?.trim() || undefined,
  };
}

/** Só valida o que foi preenchido (RF-002d) — os campos são todos opcionais. */
function validarDadosCadastrais(dados: DadosCadastraisUsuario): MotivoRecusaUsuario | null {
  const cpf = dados.cpf?.trim();
  const cnpj = dados.cnpj?.trim();

  // A pessoa é PF ou PJ, não as duas. Aceitar os dois deixaria a tela de detalhe sem saber
  // qual documento mostrar, e a edição sem saber qual campo pré-selecionar.
  if (cpf && cnpj) return "cpf_e_cnpj";
  if (cpf && !validarCpf(cpf)) return "cpf_invalido";
  if (cnpj && !validarCnpj(cnpj)) return "cnpj_invalido";
  return null;
}

export type ResultadoCriarUsuario =
  | { sucesso: true; usuarioId: string; convite: ResultadoConvite }
  | { sucesso: false; motivo: MotivoRecusaUsuario };

/** Valida o que não depende do banco — reusado na criação e na edição. */
function validarDadosUsuario(
  dados: Pick<NovoUsuarioInput, "nome" | "email" | "perfil" | "atribuicoes"> &
    DadosCadastraisUsuario,
): MotivoRecusaUsuario | null {
  if (!dados.nome.trim()) return "nome_obrigatorio";
  if (!validarEmail(dados.email)) return "email_invalido";
  if (!PERFIS_INTERNOS.includes(dados.perfil)) return "perfil_invalido";

  const erroCadastral = validarDadosCadastrais(dados);
  if (erroCadastral) return erroCadastral;

  // RN-005 — atribuir uma tarefa a um Colaborador Interno (ou um projeto a um Externo)
  // não é só inconsistente na tela: a RLS resolve o acesso pela granularidade do perfil,
  // então a linha existiria sem dar acesso nenhum, e a Tela A1 contaria uma atribuição
  // que não serve pra nada.
  const granularidade = granularidadeDoPerfil(dados.perfil);
  if (granularidade === null && dados.atribuicoes.length > 0) return "atribuicao_incompativel";
  if (granularidade && dados.atribuicoes.some((a) => a.entidadeTipo !== granularidade)) {
    return "atribuicao_incompativel";
  }
  return null;
}

/**
 * RF-030 / RF-040 / RF-041 — cria o usuário interno, grava as atribuições e dispara o
 * convite de definição de senha.
 *
 * Roda na role dona porque `tokens_acesso` não é acessível pela role de aplicação; por
 * isso a checagem de perfil aqui não é redundância decorativa, é a única barreira neste
 * caminho (mesmo padrão já usado por `criarAcessoCliente`). As atribuições, essas sim,
 * passam pela role de aplicação e pela política `atribuicoes_write` (ADMIN-only).
 */
export async function criarUsuarioInterno(
  ctx: ContextoUsuario,
  dados: NovoUsuarioInput,
): Promise<ResultadoCriarUsuario> {
  if (ctx.perfil !== "ADMIN") return { sucesso: false, motivo: "sem_permissao" };

  const erro = validarDadosUsuario(dados);
  if (erro) return { sucesso: false, motivo: erro };

  const email = dados.email.trim().toLowerCase();
  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) return { sucesso: false, motivo: "email_duplicado" };

  const usuario = await prisma.usuario.create({
    data: {
      nome: dados.nome.trim(),
      email,
      perfil: dados.perfil,
      ...limparDadosCadastrais(dados),
    },
  });

  if (dados.atribuicoes.length > 0) {
    await comContextoDeUsuario(ctx, (tx) =>
      tx.atribuicao.createMany({
        data: dados.atribuicoes.map((a) => ({ usuarioId: usuario.id, ...a })),
        skipDuplicates: true,
      }),
    );
  }

  const convite = await enviarConviteDefinicaoSenha(usuario, "USUARIO_INTERNO");
  return { sucesso: true, usuarioId: usuario.id, convite };
}

export type AtualizarUsuarioInput = {
  nome: string;
  email: string;
  perfil: Perfil;
} & DadosCadastraisUsuario;

export type ResultadoAtualizarUsuario =
  | { sucesso: true; atribuicoesRemovidas: number }
  | { sucesso: false; motivo: MotivoRecusaUsuario };

/**
 * RF-040 — edição do usuário pelo Administrador (inclusive o e-mail, que o próprio dono
 * não altera — RF-042).
 *
 * Trocar o perfil troca a granularidade da atribuição (RN-005), então as atribuições da
 * granularidade antiga são removidas: mantê-las deixaria linhas que a RLS nunca honra,
 * fazendo a Tela A1 anunciar um acesso que não existe. O retorno diz quantas saíram, para
 * a tela poder avisar em vez de fazer isso em silêncio.
 */
export async function atualizarUsuario(
  ctx: ContextoUsuario,
  usuarioId: string,
  dados: AtualizarUsuarioInput,
): Promise<ResultadoAtualizarUsuario> {
  if (ctx.perfil !== "ADMIN") return { sucesso: false, motivo: "sem_permissao" };

  const erro = validarDadosUsuario({ ...dados, atribuicoes: [] });
  if (erro) return { sucesso: false, motivo: erro };

  const email = dados.email.trim().toLowerCase();
  const donoDoEmail = await prisma.usuario.findUnique({ where: { email } });
  if (donoDoEmail && donoDoEmail.id !== usuarioId) {
    return { sucesso: false, motivo: "email_duplicado" };
  }

  const granularidade = granularidadeDoPerfil(dados.perfil);

  const atribuicoesRemovidas = await comContextoDeUsuario(ctx, async (tx) => {
    await tx.usuario.update({
      where: { id: usuarioId },
      data: {
        nome: dados.nome.trim(),
        email,
        perfil: dados.perfil,
        // `?? null` e não `undefined`: apagar o conteúdo de um campo no formulário precisa
        // limpar a coluna, e `undefined` faria o Prisma ignorar o campo, mantendo o valor
        // antigo — o campo voltaria preenchido depois de a pessoa apagá-lo e salvar.
        ...Object.fromEntries(
          Object.entries(limparDadosCadastrais(dados)).map(([campo, valor]) => [
            campo,
            valor ?? null,
          ]),
        ),
      },
    });

    const { count } = await tx.atribuicao.deleteMany({
      where: {
        usuarioId,
        ...(granularidade ? { entidadeTipo: { not: granularidade } } : {}),
      },
    });
    return count;
  });

  return { sucesso: true, atribuicoesRemovidas };
}

/**
 * RF-040 — "Reenviar convite" da Tela A1. Emite um token novo em vez de reenviar o
 * anterior: o link antigo pode já ter expirado, e reaproveitá-lo tornaria o botão
 * inconsistente justamente no caso em que ele mais é usado.
 */
export type ResultadoReenvio =
  | { sucesso: true; convite: ResultadoConvite }
  | { sucesso: false; motivo: "sem_permissao" | "nao_encontrado" | "ja_ativou" };

export async function reenviarConvite(
  ctx: ContextoUsuario,
  usuarioId: string,
): Promise<ResultadoReenvio> {
  if (ctx.perfil !== "ADMIN") return { sucesso: false, motivo: "sem_permissao" };

  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) return { sucesso: false, motivo: "nao_encontrado" };
  if (usuario.senhaHash) return { sucesso: false, motivo: "ja_ativou" };

  const convite = await enviarConviteDefinicaoSenha(usuario, "USUARIO_INTERNO");
  return { sucesso: true, convite };
}

// ============================================================================
// Atribuições — Tela A3 (RF-041)
// ============================================================================

export type OrigemAtribuicao = "MANUAL" | "AUTOMATICA";

export type AtribuicaoDetalhada = {
  id: string;
  entidadeTipo: EntidadeTipo;
  entidadeId: string;
  /** Nome do projeto ou da tarefa. `null` quando a entidade referenciada já não existe. */
  entidadeNome: string | null;
  cliente: string | null;
  origem: OrigemAtribuicao;
};

/**
 * RF-041 / RN-006 — atribuições de um usuário, com a origem de cada uma.
 *
 * A origem é **derivada**, não guardada numa coluna: é "automática" quando a atribuição é
 * de tarefa e o responsável daquela tarefa é justamente a Pessoa Envolvida deste usuário —
 * que é exatamente a condição que faz `definirResponsavelTarefa` criar e remover a linha
 * (src/lib/tarefas.ts). Uma coluna `origem` seria um segundo registro da mesma verdade,
 * com chance de divergir dela; derivar mantém uma fonte só.
 *
 * Efeito colateral aceito: uma atribuição criada à mão para uma tarefa cuja responsável já
 * é aquela mesma pessoa aparece como automática. O resultado prático é o correto — remover
 * essa linha sem trocar o responsável faria a RN-006 recriá-la na próxima alteração.
 */
export async function listarAtribuicoesDetalhadas(
  ctx: ContextoUsuario,
  usuarioId: string,
): Promise<AtribuicaoDetalhada[]> {
  if (ctx.perfil !== "ADMIN" && ctx.usuarioId !== usuarioId) return [];

  return comContextoDeUsuario(ctx, async (tx) => {
    const usuario = await tx.usuario.findUnique({
      where: { id: usuarioId },
      select: { pessoaEnvolvidaId: true },
    });
    if (!usuario) return [];

    const atribuicoes = await tx.atribuicao.findMany({
      where: { usuarioId },
      orderBy: { criadoEm: "asc" },
    });

    const idsProjeto = atribuicoes.filter((a) => a.entidadeTipo === "PROJETO").map((a) => a.entidadeId);
    const idsTarefa = atribuicoes.filter((a) => a.entidadeTipo === "TAREFA").map((a) => a.entidadeId);

    const [projetos, tarefas] = await Promise.all([
      idsProjeto.length
        ? tx.projeto.findMany({
            where: { id: { in: idsProjeto } },
            select: { id: true, nome: true, cliente: { select: { razaoSocial: true } } },
          })
        : [],
      idsTarefa.length
        ? tx.tarefa.findMany({
            where: { id: { in: idsTarefa } },
            select: {
              id: true,
              nome: true,
              responsavelId: true,
              projeto: { select: { cliente: { select: { razaoSocial: true } } } },
            },
          })
        : [],
    ]);

    const porProjeto = new Map(projetos.map((p) => [p.id, p]));
    const porTarefa = new Map(tarefas.map((t) => [t.id, t]));

    return atribuicoes.map((a): AtribuicaoDetalhada => {
      if (a.entidadeTipo === "PROJETO") {
        const projeto = porProjeto.get(a.entidadeId);
        return {
          id: a.id,
          entidadeTipo: a.entidadeTipo,
          entidadeId: a.entidadeId,
          entidadeNome: projeto?.nome ?? null,
          cliente: projeto?.cliente.razaoSocial ?? null,
          origem: "MANUAL",
        };
      }

      const tarefa = porTarefa.get(a.entidadeId);
      // Os dois lados precisam existir antes de comparar: `pessoaEnvolvidaId` e
      // `responsavelId` são nulos com frequência, e em SQL — como já custou uma correção
      // na trigger da RN-004 — dois nulos não são "iguais", mas em JS `null === null` é
      // verdadeiro, o que marcaria como automática toda atribuição de um usuário sem
      // Pessoa Envolvida numa tarefa sem responsável.
      const automatica =
        usuario.pessoaEnvolvidaId != null &&
        tarefa?.responsavelId != null &&
        tarefa.responsavelId === usuario.pessoaEnvolvidaId;

      return {
        id: a.id,
        entidadeTipo: a.entidadeTipo,
        entidadeId: a.entidadeId,
        entidadeNome: tarefa?.nome ?? null,
        cliente: tarefa?.projeto.cliente.razaoSocial ?? null,
        origem: automatica ? "AUTOMATICA" : "MANUAL",
      };
    });
  });
}

export type OpcaoAtribuicao = {
  entidadeTipo: EntidadeTipo;
  entidadeId: string;
  nome: string;
  /** Usado para agrupar as opções por cliente na Tela A2. */
  cliente: string;
  /** Só para TAREFA — o PDD agrupa as tarefas por cliente > projeto. */
  projeto?: string;
};

/**
 * RF-041 — o que existe para atribuir, conforme a granularidade do perfil (RN-005).
 *
 * Na Sprint 3 as duas listas vêm vazias na prática: Projeto e Tarefa existem no schema
 * desde a Sprint 1 (esqueleto de RLS), mas o CRUD deles é da Sprint 4. A seção da Tela A2
 * fica estruturalmente pronta e passa a funcionar sozinha quando houver o que listar —
 * daí o estado vazio ser texto explicativo, e não um erro.
 */
export async function listarOpcoesDeAtribuicao(
  ctx: ContextoUsuario,
  perfil: Perfil,
): Promise<OpcaoAtribuicao[]> {
  if (ctx.perfil !== "ADMIN") return [];

  const granularidade = granularidadeDoPerfil(perfil);
  if (granularidade === null) return [];

  return comContextoDeUsuario(ctx, async (tx) => {
    if (granularidade === "PROJETO") {
      const projetos = await tx.projeto.findMany({
        where: { cliente: { ativo: true } },
        select: { id: true, nome: true, cliente: { select: { razaoSocial: true } } },
        orderBy: { nome: "asc" },
      });
      return projetos.map((p) => ({
        entidadeTipo: "PROJETO" as const,
        entidadeId: p.id,
        nome: p.nome,
        cliente: p.cliente.razaoSocial,
      }));
    }

    const tarefas = await tx.tarefa.findMany({
      where: { projeto: { cliente: { ativo: true } } },
      select: {
        id: true,
        nome: true,
        projeto: { select: { nome: true, cliente: { select: { razaoSocial: true } } } },
      },
      orderBy: { nome: "asc" },
    });
    return tarefas.map((t) => ({
      entidadeTipo: "TAREFA" as const,
      entidadeId: t.id,
      nome: t.nome,
      cliente: t.projeto.cliente.razaoSocial,
      projeto: t.projeto.nome,
    }));
  });
}

export type ResultadoAtribuicao =
  | { sucesso: true }
  | {
      sucesso: false;
      motivo: "sem_permissao" | "nao_encontrado" | "incompativel_com_perfil" | "automatica";
    };

/** RF-041 — vincula manualmente um usuário a um projeto (Interno) ou a uma tarefa (Externo). */
export async function adicionarAtribuicao(
  ctx: ContextoUsuario,
  usuarioId: string,
  entrada: AtribuicaoInput,
): Promise<ResultadoAtribuicao> {
  if (ctx.perfil !== "ADMIN") return { sucesso: false, motivo: "sem_permissao" };

  const usuario = await comContextoDeUsuario(ctx, (tx) =>
    tx.usuario.findUnique({ where: { id: usuarioId }, select: { perfil: true } }),
  );
  if (!usuario) return { sucesso: false, motivo: "nao_encontrado" };

  if (granularidadeDoPerfil(usuario.perfil) !== entrada.entidadeTipo) {
    return { sucesso: false, motivo: "incompativel_com_perfil" };
  }

  await comContextoDeUsuario(ctx, (tx) =>
    tx.atribuicao.createMany({
      data: [{ usuarioId, ...entrada }],
      skipDuplicates: true,
    }),
  );
  return { sucesso: true };
}

/**
 * RF-041 / RN-006 — remove uma atribuição manual. Atribuição automática é recusada aqui,
 * não só escondida na tela: ela é consequência de quem é o responsável da tarefa, e apagar
 * a linha sem trocar o responsável só faria a RN-006 recriá-la.
 */
export async function removerAtribuicao(
  ctx: ContextoUsuario,
  atribuicaoId: string,
): Promise<ResultadoAtribuicao> {
  if (ctx.perfil !== "ADMIN") return { sucesso: false, motivo: "sem_permissao" };

  const atribuicao = await comContextoDeUsuario(ctx, (tx) =>
    tx.atribuicao.findUnique({ where: { id: atribuicaoId }, select: { usuarioId: true } }),
  );
  if (!atribuicao) return { sucesso: false, motivo: "nao_encontrado" };

  const detalhadas = await listarAtribuicoesDetalhadas(ctx, atribuicao.usuarioId);
  const alvo = detalhadas.find((a) => a.id === atribuicaoId);
  if (alvo?.origem === "AUTOMATICA") return { sucesso: false, motivo: "automatica" };

  await comContextoDeUsuario(ctx, (tx) =>
    tx.atribuicao.deleteMany({ where: { id: atribuicaoId } }),
  );
  return { sucesso: true };
}

// ============================================================================
// Meu Perfil — Tela A6 (RF-042)
// ============================================================================

export type ResultadoPerfil =
  | { sucesso: true }
  | { sucesso: false; motivo: "nome_obrigatorio" | "senha_atual_incorreta" | "senha_fraca" | "sem_senha" };

/**
 * RF-042 — o próprio usuário edita apenas o nome; e-mail e perfil são do Administrador.
 *
 * Roda na role dona pelo mesmo motivo de `alterarMinhaSenha` logo abaixo: a política
 * `usuarios_write` é ADMIN-only, então pela role de aplicação esta escrita não passava e
 * nenhum Colaborador conseguia salvar o próprio nome (auditoria da Sprint 3, item 5). Abrir
 * a RLS para a própria linha resolveria o nome e abriria `perfil`, `email` e `ativo` de
 * carona — escalada de privilégio atrás de um campo de texto.
 *
 * A segurança aqui é estrutural, não uma checagem: a linha alvo vem de `ctx.usuarioId` (a
 * sessão) e a única coluna escrita está fixa no código. Não há entrada do cliente escolhendo
 * quem é atualizado nem o que é atualizado.
 */
export async function atualizarMeuNome(
  ctx: ContextoUsuario,
  nome: string,
): Promise<ResultadoPerfil> {
  if (!nome.trim()) return { sucesso: false, motivo: "nome_obrigatorio" };

  await prisma.usuario.update({
    where: { id: ctx.usuarioId },
    data: { nome: nome.trim() },
  });
  return { sucesso: true };
}

/**
 * RF-042 — troca de senha pelo próprio usuário, exigindo a senha atual. Roda na role dona
 * porque `senhaHash` é lido e reescrito fora de qualquer contexto de RLS útil (o usuário
 * só mexe na própria linha, identificada pela sessão).
 */
export async function alterarMinhaSenha(
  ctx: ContextoUsuario,
  senhaAtual: string,
  senhaNova: string,
): Promise<ResultadoPerfil> {
  const usuario = await prisma.usuario.findUnique({ where: { id: ctx.usuarioId } });
  if (!usuario?.senhaHash) return { sucesso: false, motivo: "sem_senha" };

  const confere = await verificarSenha(senhaAtual, usuario.senhaHash);
  if (!confere) return { sucesso: false, motivo: "senha_atual_incorreta" };

  if (validarPoliticaSenha(senhaNova)) return { sucesso: false, motivo: "senha_fraca" };

  await prisma.usuario.update({
    where: { id: ctx.usuarioId },
    data: { senhaHash: await hashSenha(senhaNova) },
  });
  return { sucesso: true };
}
