import { comContextoDeUsuario, type ContextoUsuario } from "@/lib/prisma-app";
import { normalizarCnpj, validarCnpj } from "@/lib/cnpj";
import { normalizarCpf, validarCpf } from "@/lib/cpf";
import { validarEmail } from "@/lib/validacao";
import { enviarConviteDefinicaoSenha, type ResultadoConvite } from "@/lib/convites";
import { prisma } from "@/lib/prisma";
import type { PessoaEnvolvidaInput } from "@/lib/clientes";

/**
 * RF-028 — a seção "Pessoas Envolvidas" é opcional como um todo, mas nome/razão social,
 * telefone e e-mail são obrigatórios pra confirmar um item já adicionado à lista. CPF/CNPJ
 * são sempre opcionais, com validação de formato só quando preenchidos.
 */
export function validarPessoaEnvolvida(pessoa: PessoaEnvolvidaInput): string | null {
  if (!pessoa.nome.trim()) {
    return pessoa.tipo === "EMPRESA" ? "Informe a razão social da pessoa envolvida." : "Informe o nome da pessoa envolvida.";
  }
  if (!pessoa.telefone.trim()) return "Informe o telefone da pessoa envolvida.";
  if (!pessoa.email.trim()) return "Informe o e-mail da pessoa envolvida.";
  if (!validarEmail(pessoa.email)) return "E-mail da pessoa envolvida inválido.";
  if (pessoa.tipo === "PESSOA" && pessoa.cpf && !validarCpf(pessoa.cpf)) {
    return "CPF da pessoa envolvida inválido.";
  }
  if (pessoa.tipo === "EMPRESA" && pessoa.cnpj && !validarCnpj(pessoa.cnpj)) {
    return "CNPJ da pessoa envolvida inválido.";
  }
  return null;
}

/**
 * RF-028/ADR-007 — adiciona uma Pessoa Envolvida depois do cadastro (não só na criação).
 *
 * `temAcesso` sempre entra `false` aqui, mesmo que o checkbox "é um colaborador?" tenha
 * vindo marcado (`dados.temAcesso`) — a coluna reflete se **existe** um `Usuario`
 * vinculado, não a intenção marcada no formulário. Quem chama esta função é responsável
 * por, em seguida, invocar `criarAcessoPessoaEnvolvida(pessoa.id)` quando `dados.temAcesso`
 * for `true` — é essa chamada que de fato cria o `Usuario` e vira `temAcesso` pra `true`.
 */
export async function adicionarPessoaEnvolvida(
  ctx: ContextoUsuario,
  clienteId: string,
  dados: PessoaEnvolvidaInput,
) {
  return comContextoDeUsuario(ctx, (tx) =>
    tx.pessoaEnvolvida.create({
      data: {
        clienteId,
        tipo: dados.tipo,
        nome: dados.nome,
        cpf: dados.tipo === "PESSOA" && dados.cpf ? normalizarCpf(dados.cpf) : undefined,
        cnpj: dados.tipo === "EMPRESA" && dados.cnpj ? normalizarCnpj(dados.cnpj) : undefined,
        telefone: dados.telefone,
        email: dados.email,
        temAcesso: false,
      },
    }),
  );
}

export type ResultadoCriarAcessoPessoaEnvolvida =
  | { sucesso: true; convite: ResultadoConvite }
  | {
      sucesso: false;
      motivo: "nao_encontrada" | "ja_tem_acesso" | "ja_existe" | "cliente_desativado";
    };

/**
 * RF-028 (checkbox inline no cadastro) / RF-033 (criar acesso depois) — cria o `Usuario`
 * Colaborador Externo vinculado à Pessoa Envolvida (FK do ADR-005/ADR-007), reaproveitando o
 * mesmo fluxo de definição de senha por e-mail do RF-030/RF-031. Mesmo padrão de
 * `criarAcessoCliente` em `src/lib/clientes.ts`: role dona, fora da transação de app role
 * (`usuarios_write` é ADMIN-only via RLS; quem chama já roda pré-autorizado como ADMIN).
 */
export async function criarAcessoPessoaEnvolvida(
  pessoaEnvolvidaId: string,
): Promise<ResultadoCriarAcessoPessoaEnvolvida> {
  const pessoa = await prisma.pessoaEnvolvida.findUnique({
    where: { id: pessoaEnvolvidaId },
    include: { cliente: { select: { ativo: true } } },
  });
  if (!pessoa) return { sucesso: false, motivo: "nao_encontrada" };
  if (pessoa.temAcesso) return { sucesso: false, motivo: "ja_tem_acesso" };
  if (!pessoa.email) return { sucesso: false, motivo: "nao_encontrada" };

  // RF-039 — mesmo motivo de `criarAcessoCliente`: esta função roda na role dona, então a
  // herança da RLS (que já impede escrever em pessoa de cliente desativado) não alcança este
  // caminho. Sem esta linha, desativar o cliente não impediria criar o acesso da pessoa dele.
  if (!pessoa.cliente.ativo) return { sucesso: false, motivo: "cliente_desativado" };

  const existente = await prisma.usuario.findUnique({ where: { email: pessoa.email } });
  if (existente) return { sucesso: false, motivo: "ja_existe" };

  const usuario = await prisma.usuario.create({
    data: { nome: pessoa.nome, email: pessoa.email, perfil: "ADMIN_EXTERNO", pessoaEnvolvidaId: pessoa.id },
  });
  await prisma.pessoaEnvolvida.update({ where: { id: pessoa.id }, data: { temAcesso: true } });

  const convite = await enviarConviteDefinicaoSenha(usuario, "COLABORADOR_EXTERNO");

  return { sucesso: true, convite };
}
