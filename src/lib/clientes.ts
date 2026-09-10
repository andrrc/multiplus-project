import { comContextoDeUsuario, type ContextoUsuario } from "@/lib/prisma-app";
import { normalizarCnpj } from "@/lib/cnpj";
import { normalizarCpf } from "@/lib/cpf";
import { criarTokenAcesso } from "@/lib/tokens";
import { enviarEmail, linkDefinirSenha } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import type { DadosPessoa } from "@/lib/heranca-pessoa";

export type { DadosPessoa } from "@/lib/heranca-pessoa";
export { heredarDadosPontoContato } from "@/lib/heranca-pessoa";

type DadosComunsCliente = {
  segmento: string;
  origemContato: string;
  pessoasOperacional: { nome: string; cargo: string; email?: string }[];
};

/** RF-001, RF-026, RF-027 — Pessoa Jurídica, com Responsável Legal e Ponto de Contato. */
export type NovoClientePJInput = DadosComunsCliente & {
  tipo: "PESSOA_JURIDICA";
  razaoSocial: string;
  cnpj: string;
  endereco?: string;
  responsavelLegal: DadosPessoa;
  pontoContato: DadosPessoa & { cargo: string };
};

/** RF-035 — Pessoa Física: a própria pessoa cadastrada é quem recebe o acesso (RF-031). */
export type NovoClientePFInput = DadosComunsCliente & {
  tipo: "PESSOA_FISICA";
  nome: string;
  cpf: string;
  rg: string;
  endereco?: string;
  cep?: string;
  municipio?: string;
  email: string;
};

/** RF-034 — o cadastro começa pela escolha do tipo; os campos seguintes dependem dela. */
export type NovoClienteInput = NovoClientePJInput | NovoClientePFInput;

const INCLUDE_CLIENTE_COMPLETO = {
  responsavelLegal: true,
  pontoContato: true,
  pessoasOperacional: true,
} as const;

/** RF-001/002/026/027/028/034/035 — cadastro completo do cliente numa única transação. */
export async function criarCliente(ctx: ContextoUsuario, dados: NovoClienteInput) {
  return comContextoDeUsuario(ctx, (tx) => {
    const comuns = {
      segmento: dados.segmento,
      origemContato: dados.origemContato,
      pessoasOperacional: { create: dados.pessoasOperacional },
    };

    if (dados.tipo === "PESSOA_JURIDICA") {
      return tx.cliente.create({
        data: {
          ...comuns,
          tipo: "PESSOA_JURIDICA",
          razaoSocial: dados.razaoSocial,
          cnpj: normalizarCnpj(dados.cnpj),
          endereco: dados.endereco,
          responsavelLegal: {
            create: { ...dados.responsavelLegal, cpf: normalizarCpf(dados.responsavelLegal.cpf) },
          },
          pontoContato: {
            create: { ...dados.pontoContato, cpf: normalizarCpf(dados.pontoContato.cpf) },
          },
        },
        include: INCLUDE_CLIENTE_COMPLETO,
      });
    }

    return tx.cliente.create({
      data: {
        ...comuns,
        tipo: "PESSOA_FISICA",
        razaoSocial: dados.nome,
        cpf: normalizarCpf(dados.cpf),
        rg: dados.rg,
        endereco: dados.endereco,
        cep: dados.cep,
        municipio: dados.municipio,
        email: dados.email,
      },
      include: INCLUDE_CLIENTE_COMPLETO,
    });
  });
}

/** RF-003 — painel central de clientes, com busca por razão social, CNPJ ou CPF. */
export async function listarClientes(ctx: ContextoUsuario, busca?: string) {
  return comContextoDeUsuario(ctx, (tx) =>
    tx.cliente.findMany({
      where: busca
        ? {
            OR: [
              { razaoSocial: { contains: busca, mode: "insensitive" } },
              { cnpj: { contains: normalizarCnpj(busca) } },
              { cpf: { contains: normalizarCpf(busca) } },
            ],
          }
        : undefined,
      orderBy: { razaoSocial: "asc" },
    }),
  );
}

/**
 * RF-020 — leitura para exibição (Tela de Detalhe do Cliente). Usa as views
 * `responsavelLegalSeguro`/`pontoContatoSeguro` (telefone mascarado no Postgres,
 * ver migration `cadastro_clientes_rls_masking`) — nunca os models base
 * `responsavelLegal`/`pontoContato`, que só devem ser usados para escrita.
 */
export async function buscarClienteDetalheSeguro(ctx: ContextoUsuario, clienteId: string) {
  return comContextoDeUsuario(ctx, async (tx) => {
    const cliente = await tx.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) return null;

    const [responsavelLegal, pontoContato, pessoasOperacional, documentos, usuarioAcesso] =
      await Promise.all([
        tx.responsavelLegalSeguro.findUnique({ where: { clienteId } }),
        tx.pontoContatoSeguro.findUnique({ where: { clienteId } }),
        tx.pessoaOperacional.findMany({ where: { clienteId }, orderBy: { nome: "asc" } }),
        tx.documento.findMany({ where: { clienteId }, orderBy: { criadoEm: "desc" } }),
        tx.usuario.findFirst({
          where: { clienteId, perfil: "CLIENTE" },
          select: { id: true, ativo: true, senhaHash: true },
        }),
      ]);

    return { cliente, responsavelLegal, pontoContato, pessoasOperacional, documentos, usuarioAcesso };
  });
}

export type AtualizarClientePJInput = {
  tipo: "PESSOA_JURIDICA";
  razaoSocial: string;
  endereco?: string;
  segmento: string;
  origemContato: string;
  responsavelLegal: DadosPessoa;
  pontoContato: DadosPessoa & { cargo: string };
};

export type AtualizarClientePFInput = {
  tipo: "PESSOA_FISICA";
  nome: string;
  rg: string;
  endereco?: string;
  cep?: string;
  municipio?: string;
  email: string;
  segmento: string;
  origemContato: string;
};

export type AtualizarClienteInput = AtualizarClientePJInput | AtualizarClientePFInput;

/**
 * Edição do cadastro (CNPJ/CPF não são editáveis — são o identificador do cliente, PJ ou
 * PF). Pessoas do Operacional e Documentos têm gestão própria (adicionar/remover na tela
 * de detalhe), não fazem parte desta edição — ver PDD, wireframe de Detalhe do Cliente.
 */
export async function atualizarCliente(
  ctx: ContextoUsuario,
  clienteId: string,
  dados: AtualizarClienteInput,
) {
  return comContextoDeUsuario(ctx, (tx) => {
    if (dados.tipo === "PESSOA_JURIDICA") {
      return tx.cliente.update({
        where: { id: clienteId },
        data: {
          razaoSocial: dados.razaoSocial,
          endereco: dados.endereco,
          segmento: dados.segmento,
          origemContato: dados.origemContato,
          responsavelLegal: {
            upsert: {
              create: { ...dados.responsavelLegal, cpf: normalizarCpf(dados.responsavelLegal.cpf) },
              update: { ...dados.responsavelLegal, cpf: normalizarCpf(dados.responsavelLegal.cpf) },
            },
          },
          pontoContato: {
            upsert: {
              create: { ...dados.pontoContato, cpf: normalizarCpf(dados.pontoContato.cpf) },
              update: { ...dados.pontoContato, cpf: normalizarCpf(dados.pontoContato.cpf) },
            },
          },
        },
        include: { responsavelLegal: true, pontoContato: true },
      });
    }

    return tx.cliente.update({
      where: { id: clienteId },
      data: {
        razaoSocial: dados.nome,
        rg: dados.rg,
        endereco: dados.endereco,
        cep: dados.cep,
        municipio: dados.municipio,
        email: dados.email,
        segmento: dados.segmento,
        origemContato: dados.origemContato,
      },
      include: { responsavelLegal: true, pontoContato: true },
    });
  });
}

/**
 * Leitura para a tela de edição — só ADMIN chega aqui (rota protegida), e é quem
 * também escreve o cadastro, então usa as tabelas base (telefone real, não mascarado
 * pela view — mascarar aqui impediria editar o próprio campo).
 */
export async function buscarClienteParaEdicao(ctx: ContextoUsuario, clienteId: string) {
  return comContextoDeUsuario(ctx, async (tx) => {
    const cliente = await tx.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) return null;

    const [responsavelLegal, pontoContato] = await Promise.all([
      tx.responsavelLegal.findUnique({ where: { clienteId } }),
      tx.pontoContato.findUnique({ where: { clienteId } }),
    ]);

    return { cliente, responsavelLegal, pontoContato };
  });
}

/** RF-028 — adiciona uma pessoa do operacional depois do cadastro (não só na criação). */
export async function adicionarPessoaOperacional(
  ctx: ContextoUsuario,
  clienteId: string,
  nome: string,
  cargo: string,
  email?: string,
) {
  return comContextoDeUsuario(ctx, (tx) =>
    tx.pessoaOperacional.create({ data: { clienteId, nome, cargo, email } }),
  );
}

/** RF-013 — vincula um link de documento (Google Drive) ao cliente. */
export async function adicionarDocumento(
  ctx: ContextoUsuario,
  clienteId: string,
  nome: string,
  link: string,
) {
  return comContextoDeUsuario(ctx, (tx) => tx.documento.create({ data: { clienteId, nome, link } }));
}

export type ResultadoCriarAcesso =
  | { sucesso: true }
  | { sucesso: false; motivo: "sem_email" | "ja_existe" };

/**
 * RF-031 — cria o login do cliente e reaproveita o fluxo de onboarding da Sprint 1
 * (RF-030): link de definição de senha por e-mail. Pessoa Jurídica: destinatário é o
 * Ponto de Contato. Pessoa Física: destinatário é a própria pessoa cadastrada, sem
 * intermediário. Criação de `Usuario` só é permitida pela role dona (`usuarios_write` é
 * ADMIN-only via RLS, mas quem chama esta função já roda pré-autorizado como ADMIN).
 */
export async function criarAcessoCliente(clienteId: string): Promise<ResultadoCriarAcesso> {
  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!cliente) return { sucesso: false, motivo: "sem_email" };

  let nome: string;
  let email: string;

  if (cliente.tipo === "PESSOA_JURIDICA") {
    const pontoContato = await prisma.pontoContato.findUnique({ where: { clienteId } });
    if (!pontoContato) return { sucesso: false, motivo: "sem_email" };
    nome = pontoContato.nome;
    email = pontoContato.email;
  } else {
    if (!cliente.email) return { sucesso: false, motivo: "sem_email" };
    nome = cliente.razaoSocial;
    email = cliente.email;
  }

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) return { sucesso: false, motivo: "ja_existe" };

  const usuario = await prisma.usuario.create({
    data: { nome, email, perfil: "CLIENTE", clienteId },
  });

  const token = await criarTokenAcesso(usuario.id, "DEFINIR_SENHA");
  await enviarEmail({
    to: usuario.email,
    subject: "Acesso ao Múltiplus — defina sua senha",
    html: `<p>Olá, ${usuario.nome}. Defina sua senha de acesso: <a href="${linkDefinirSenha(token)}">${linkDefinirSenha(token)}</a></p>`,
  });

  return { sucesso: true };
}

/** RF-029 — bloqueio/desbloqueio de acesso do cliente reaproveita `usuarios.ativo`. */
export async function definirAcessoClienteAtivo(usuarioId: string, ativo: boolean) {
  return prisma.usuario.update({ where: { id: usuarioId }, data: { ativo } });
}
