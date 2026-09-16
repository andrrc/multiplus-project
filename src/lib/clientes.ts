import { comContextoDeUsuario, type ContextoUsuario } from "@/lib/prisma-app";
import { normalizarCnpj } from "@/lib/cnpj";
import { normalizarCpf } from "@/lib/cpf";
import { enviarConviteDefinicaoSenha, type ResultadoConvite } from "@/lib/convites";
import { prisma } from "@/lib/prisma";
import { limparDadosPessoa, type DadosPessoa } from "@/lib/heranca-pessoa";
import { criarAcessoPessoaEnvolvida } from "@/lib/pessoas-envolvidas";
import { exigirClienteAtivo } from "@/lib/desativacao";

export type { DadosPessoa } from "@/lib/heranca-pessoa";
export { heredarDadosPontoContato } from "@/lib/heranca-pessoa";

/** RF-028/ADR-007 — item da lista de Pessoas Envolvidas, adicionado no próprio cadastro do cliente. */
export type PessoaEnvolvidaInput = {
  tipo: "PESSOA" | "EMPRESA";
  /** Pessoa: nome. Empresa/PJ envolvida: razão social. */
  nome: string;
  cpf?: string;
  cnpj?: string;
  telefone: string;
  email: string;
  /** Quando `true`, cria automaticamente um `Usuario` Colaborador Externo vinculado. */
  temAcesso: boolean;
};

type DadosComunsCliente = {
  segmento: string;
  /** RF-002 — só usado quando `segmento` é a opção "Outro"/"Outros"; resolvido antes de chegar aqui. */
  segmentoCustomizado?: string;
  origemContato: string;
  /** RF-002a — texto livre, PF e PJ. */
  atividadePrincipal?: string;
  /** RF-002c — via API de localidades (IBGE), adicional a `endereco`. */
  estado?: string;
  municipio?: string;
  pessoasEnvolvidas: PessoaEnvolvidaInput[];
};

/** RF-001, RF-026, RF-027 — Pessoa Jurídica, com Responsável Legal e Ponto de Contato. */
export type NovoClientePJInput = DadosComunsCliente & {
  tipo: "PESSOA_JURIDICA";
  razaoSocial: string;
  cnpj: string;
  endereco?: string;
  /** RF-002b — só Pessoa Jurídica. */
  porte?: string;
  responsavelLegal: DadosPessoa;
  pontoContato: DadosPessoa & { cargo?: string };
};

/** RF-035 — Pessoa Física: a própria pessoa cadastrada é quem recebe o acesso (RF-031). */
export type NovoClientePFInput = DadosComunsCliente & {
  tipo: "PESSOA_FISICA";
  nome: string;
  cpf: string;
  rg?: string;
  endereco?: string;
  cep?: string;
  email?: string;
};

/** RF-034 — o cadastro começa pela escolha do tipo; os campos seguintes dependem dela. */
export type NovoClienteInput = NovoClientePJInput | NovoClientePFInput;

const INCLUDE_CLIENTE_COMPLETO = {
  responsavelLegal: true,
  pontoContato: true,
  pessoasEnvolvidas: true,
} as const;

/**
 * RF-028/ADR-007 — normaliza CPF/CNPJ (só o do tipo aplicável) antes de persistir.
 * `temAcesso` sempre entra `false` na criação — reflete se **existe** `Usuario`
 * vinculado, não a intenção marcada no checkbox. `criarCliente` dispara a criação real do
 * acesso depois que a transação commitar (ver comentário abaixo).
 */
function normalizarPessoaEnvolvida(pessoa: PessoaEnvolvidaInput) {
  return {
    tipo: pessoa.tipo,
    nome: pessoa.nome,
    cpf: pessoa.tipo === "PESSOA" && pessoa.cpf ? normalizarCpf(pessoa.cpf) : undefined,
    cnpj: pessoa.tipo === "EMPRESA" && pessoa.cnpj ? normalizarCnpj(pessoa.cnpj) : undefined,
    telefone: pessoa.telefone,
    email: pessoa.email,
    temAcesso: false,
  };
}

/**
 * RF-001/002/026/027/028/034/035 — cadastro completo do cliente numa única transação (app
 * role). Em seguida, fora da transação, dispara `criarAcessoPessoaEnvolvida` (role dona —
 * mesmo motivo de `criarAcessoCliente`: `tokens_acesso` não é acessível pela role de app)
 * pra cada Pessoa Envolvida cujo checkbox "é um colaborador?" veio marcado — sem isso, o
 * `Usuario`/e-mail de definição de senha nunca seriam criados pra quem marca o checkbox já
 * no cadastro inicial (só funcionaria via "criar acesso depois", RF-033).
 */
export async function criarCliente(ctx: ContextoUsuario, dados: NovoClienteInput) {
  const cliente = await comContextoDeUsuario(ctx, (tx) => {
    const comuns = {
      segmento: dados.segmento,
      origemContato: dados.origemContato,
      atividadePrincipal: dados.atividadePrincipal,
      estado: dados.estado,
      municipio: dados.municipio,
      pessoasEnvolvidas: { create: dados.pessoasEnvolvidas.map(normalizarPessoaEnvolvida) },
    };

    if (dados.tipo === "PESSOA_JURIDICA") {
      return tx.cliente.create({
        data: {
          ...comuns,
          tipo: "PESSOA_JURIDICA",
          razaoSocial: dados.razaoSocial,
          cnpj: normalizarCnpj(dados.cnpj),
          endereco: dados.endereco,
          porte: dados.porte,
          responsavelLegal: {
            create: limparDadosPessoa(dados.responsavelLegal, normalizarCpf),
          },
          pontoContato: {
            create: {
              ...limparDadosPessoa(dados.pontoContato, normalizarCpf),
              cargo: dados.pontoContato.cargo?.trim() || undefined,
            },
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
        email: dados.email,
      },
      include: INCLUDE_CLIENTE_COMPLETO,
    });
  });

  // A ordem de `cliente.pessoasEnvolvidas` corresponde à ordem de `dados.pessoasEnvolvidas`
  // (mesmo array, uma única chamada de nested-create) — usada aqui só pra saber qual
  // checkbox veio marcado, nunca pra decidir o que persistir.
  await Promise.all(
    cliente.pessoasEnvolvidas.map((pessoaCriada, i) =>
      dados.pessoasEnvolvidas[i]?.temAcesso ? criarAcessoPessoaEnvolvida(pessoaCriada.id) : null,
    ),
  );

  return cliente;
}

/**
 * RF-003 — painel central de clientes, com busca por razão social/CNPJ/CPF/cidade +
 * filtro de cidade.
 *
 * RF-039: desativados ficam de fora por padrão. `incluirDesativados` é o toggle "Mostrar
 * desativados" da listagem — pedir por ele não dá acesso a nada: a RLS só devolve linha
 * desativada para o Administrador, então para qualquer outro perfil o parâmetro não muda
 * o resultado (ver migration 20260916110500_rls_soft_delete_cascata).
 */
export async function listarClientes(
  ctx: ContextoUsuario,
  busca?: string,
  cidade?: string,
  incluirDesativados = false,
) {
  return comContextoDeUsuario(ctx, (tx) =>
    tx.cliente.findMany({
      where: {
        AND: [
          incluirDesativados ? {} : { ativo: true },
          busca
            ? {
                OR: [
                  { razaoSocial: { contains: busca, mode: "insensitive" } },
                  { cnpj: { contains: normalizarCnpj(busca) } },
                  { cpf: { contains: normalizarCpf(busca) } },
                  { municipio: { contains: busca, mode: "insensitive" } },
                ],
              }
            : {},
          cidade ? { municipio: cidade } : {},
        ],
      },
      orderBy: { razaoSocial: "asc" },
    }),
  );
}

/** RF-003 — cidades pra popular o dropdown do painel; só as que já têm cliente cadastrado. */
export async function listarCidadesComCliente(ctx: ContextoUsuario): Promise<string[]> {
  const clientes = await comContextoDeUsuario(ctx, (tx) =>
    tx.cliente.findMany({
      // RF-039 — cidade cujo único cliente foi desativado sai do dropdown junto.
      where: { municipio: { not: null }, ativo: true },
      distinct: ["municipio"],
      select: { municipio: true },
      orderBy: { municipio: "asc" },
    }),
  );
  return clientes.map((c) => c.municipio).filter((m): m is string => m !== null);
}

/**
 * RF-020 — leitura para exibição (Tela de Detalhe do Cliente). Usa as views
 * `responsavelLegalSeguro`/`pontoContatoSeguro` (telefone mascarado no Postgres,
 * ver migration `cadastro_clientes_rls_masking`) — nunca os models base
 * `responsavelLegal`/`pontoContato`, que só devem ser usados para escrita.
 */
export async function buscarClienteDetalheSeguro(
  ctx: ContextoUsuario,
  clienteId: string,
  incluirDesativados = false,
) {
  const soAtivos = incluirDesativados ? {} : { ativo: true };

  return comContextoDeUsuario(ctx, async (tx) => {
    const cliente = await tx.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) return null;

    const [responsavelLegal, pontoContato, pessoasEnvolvidas, documentos, usuarioAcesso] =
      await Promise.all([
        tx.responsavelLegalSeguro.findUnique({ where: { clienteId } }),
        tx.pontoContatoSeguro.findUnique({ where: { clienteId } }),
        tx.pessoaEnvolvida.findMany({
          where: { clienteId, ...soAtivos },
          orderBy: { nome: "asc" },
        }),
        tx.documento.findMany({
          where: { clienteId, ...soAtivos },
          orderBy: { criadoEm: "desc" },
        }),
        tx.usuario.findFirst({
          where: { clienteId, perfil: "CLIENTE" },
          select: { id: true, ativo: true, senhaHash: true },
        }),
      ]);

    return { cliente, responsavelLegal, pontoContato, pessoasEnvolvidas, documentos, usuarioAcesso };
  });
}

export type AtualizarClientePJInput = {
  tipo: "PESSOA_JURIDICA";
  razaoSocial: string;
  endereco?: string;
  segmento: string;
  segmentoCustomizado?: string;
  origemContato: string;
  atividadePrincipal?: string;
  estado?: string;
  municipio?: string;
  porte?: string;
  responsavelLegal: DadosPessoa;
  pontoContato: DadosPessoa & { cargo?: string };
};

export type AtualizarClientePFInput = {
  tipo: "PESSOA_FISICA";
  nome: string;
  rg?: string;
  endereco?: string;
  cep?: string;
  municipio?: string;
  estado?: string;
  atividadePrincipal?: string;
  email?: string;
  segmento: string;
  segmentoCustomizado?: string;
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
  // RF-039 — cliente desativado é somente leitura. A RLS sozinha não cobre este caso:
  // `clientes_write` precisa aceitar UPDATE em cliente desativado, senão não haveria como
  // reativá-lo.
  await exigirClienteAtivo(ctx, clienteId);

  return comContextoDeUsuario(ctx, (tx) => {
    if (dados.tipo === "PESSOA_JURIDICA") {
      const responsavelLegal = limparDadosPessoa(dados.responsavelLegal, normalizarCpf);
      const pontoContato = {
        ...limparDadosPessoa(dados.pontoContato, normalizarCpf),
        cargo: dados.pontoContato.cargo?.trim() || undefined,
      };
      return tx.cliente.update({
        where: { id: clienteId },
        data: {
          razaoSocial: dados.razaoSocial,
          endereco: dados.endereco,
          segmento: dados.segmento,
          origemContato: dados.origemContato,
          atividadePrincipal: dados.atividadePrincipal,
          estado: dados.estado,
          municipio: dados.municipio,
          porte: dados.porte,
          responsavelLegal: { upsert: { create: responsavelLegal, update: responsavelLegal } },
          pontoContato: { upsert: { create: pontoContato, update: pontoContato } },
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
        estado: dados.estado,
        atividadePrincipal: dados.atividadePrincipal,
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
  | { sucesso: true; convite: ResultadoConvite }
  | { sucesso: false; motivo: "sem_email" | "ja_existe" | "cliente_desativado" };

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

  // RF-039 — cliente desativado é somente leitura, e criar acesso é a escrita mais visível
  // que existe aqui: nasce um Usuario e sai um e-mail de definição de senha. A checagem mora
  // nesta função, e não só na Server Action, porque ela roda na role dona (`usuarios_write`
  // é ADMIN-only via RLS, mas quem chama já vem pré-autorizado) — a RLS não barraria.
  if (!cliente.ativo) return { sucesso: false, motivo: "cliente_desativado" };

  let nome: string;
  let email: string;

  if (cliente.tipo === "PESSOA_JURIDICA") {
    const pontoContato = await prisma.pontoContato.findUnique({ where: { clienteId } });
    if (!pontoContato?.nome || !pontoContato.email) return { sucesso: false, motivo: "sem_email" };
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

  const convite = await enviarConviteDefinicaoSenha(usuario, "CLIENTE");

  return { sucesso: true, convite };
}

/** RF-029 — bloqueio/desbloqueio de acesso do cliente reaproveita `usuarios.ativo`. */
export async function definirAcessoClienteAtivo(usuarioId: string, ativo: boolean) {
  return prisma.usuario.update({ where: { id: usuarioId }, data: { ativo } });
}
