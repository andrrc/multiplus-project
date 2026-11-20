import type { Perfil } from "@prisma/client";
import { comContextoDeUsuario, type ContextoUsuario } from "@/lib/prisma-app";

/**
 * "Quem acessa este projeto" (protótipo 04-projeto): a administração, a equipe atribuída ao projeto inteiro, os
 * colaboradores atribuídos a tarefas ou subtarefas dele e o portal do cliente. Só a administração lê isto, pela função
 * e pela RLS (a consulta roda com o contexto do usuário). Não traz e-mail, telefone nem documento de ninguém.
 */
export type PessoaComAcesso = { chave: string; nome: string; descricao: string };

const PAPEL_DO_PERFIL: Record<Perfil, string> = {
  ADMIN: "Administração",
  ADMIN_INTERNO: "Equipe Múltiplus",
  ADMIN_EXTERNO: "Colaborador externo",
  CLIENTE: "Portal do cliente",
};

type Dados = {
  administradores: Array<{ id: string; nome: string }>;
  /** Atribuições ao projeto (equipe) e a tarefas (colaborador externo); só de usuários ativos. */
  atribuicoes: Array<{ entidadeTipo: "PROJETO" | "TAREFA"; entidadeId: string; usuario: { id: string; nome: string; perfil: Perfil } }>;
  /** Subtarefas ativas do projeto com responsável da equipe ou externo. */
  subtarefasAtribuidas: Array<{ usuario: { id: string; nome: string; perfil: Perfil } }>;
  cliente: { razaoSocial: string; pessoasComAcesso: number };
};

const plural = (n: number, singular: string, pluralTexto: string) => `${n} ${n === 1 ? singular : pluralTexto}`;

/** Junta as fontes de acesso numa lista, sem repetir a pessoa que aparece por mais de um caminho. */
export function montarQuemAcessa(dados: Dados): PessoaComAcesso[] {
  const lista: PessoaComAcesso[] = dados.administradores.map((a) => ({ chave: `usuario:${a.id}`, nome: a.nome, descricao: PAPEL_DO_PERFIL.ADMIN }));
  const vistos = new Set(dados.administradores.map((a) => a.id));

  const porPessoa = new Map<string, { nome: string; perfil: Perfil; projetoInteiro: boolean; tarefas: Set<string>; subtarefas: number }>();
  const pessoa = (usuario: { id: string; nome: string; perfil: Perfil }) => {
    const atual = porPessoa.get(usuario.id) ?? { nome: usuario.nome, perfil: usuario.perfil, projetoInteiro: false, tarefas: new Set<string>(), subtarefas: 0 };
    porPessoa.set(usuario.id, atual);
    return atual;
  };
  for (const atribuicao of dados.atribuicoes) {
    const registro = pessoa(atribuicao.usuario);
    if (atribuicao.entidadeTipo === "PROJETO") registro.projetoInteiro = true;
    else registro.tarefas.add(atribuicao.entidadeId);
  }
  for (const subtarefa of dados.subtarefasAtribuidas) pessoa(subtarefa.usuario).subtarefas += 1;

  // Equipe primeiro, depois os colaboradores externos; dentro de cada grupo, em ordem alfabética.
  const ordem = (perfil: Perfil) => (perfil === "ADMIN_INTERNO" ? 0 : 1);
  const pessoas = [...porPessoa.entries()]
    .filter(([id]) => !vistos.has(id))
    .sort(([, a], [, b]) => ordem(a.perfil) - ordem(b.perfil) || a.nome.localeCompare(b.nome, "pt-BR"));
  for (const [id, registro] of pessoas) {
    const partes = [PAPEL_DO_PERFIL[registro.perfil]];
    if (registro.projetoInteiro) partes.push("projeto inteiro");
    else {
      if (registro.tarefas.size > 0) partes.push(plural(registro.tarefas.size, "tarefa", "tarefas"));
      if (registro.subtarefas > 0) partes.push(plural(registro.subtarefas, "subtarefa", "subtarefas"));
    }
    lista.push({ chave: `usuario:${id}`, nome: registro.nome, descricao: partes.join(" · ") });
  }

  if (dados.cliente.pessoasComAcesso > 0) {
    lista.push({
      chave: "portal",
      nome: dados.cliente.razaoSocial,
      descricao: `Portal do cliente · ${plural(dados.cliente.pessoasComAcesso, "pessoa com acesso", "pessoas com acesso")}`,
    });
  }
  return lista;
}

export async function listarQuemAcessaProjeto(ctx: ContextoUsuario, projetoId: string): Promise<PessoaComAcesso[]> {
  if (ctx.perfil !== "ADMIN") throw new Error("Ação restrita ao Administrador.");
  return comContextoDeUsuario(ctx, async (tx) => {
    const projeto = await tx.projeto.findUnique({
      where: { id: projetoId },
      select: { clienteId: true, cliente: { select: { razaoSocial: true } }, tarefas: { where: { ativo: true }, select: { id: true } } },
    });
    if (!projeto) return [];
    const tarefaIds = projeto.tarefas.map((t) => t.id);
    const [administradores, atribuicoes, subtarefas, pessoasComAcesso] = await Promise.all([
      tx.usuario.findMany({ where: { perfil: "ADMIN", ativo: true }, select: { id: true, nome: true } }),
      tx.atribuicao.findMany({
        where: {
          usuario: { ativo: true },
          OR: [{ entidadeTipo: "PROJETO", entidadeId: projetoId }, ...(tarefaIds.length > 0 ? [{ entidadeTipo: "TAREFA" as const, entidadeId: { in: tarefaIds } }] : [])],
        },
        select: { entidadeTipo: true, entidadeId: true, usuario: { select: { id: true, nome: true, perfil: true } } },
      }),
      tx.subtarefa.findMany({
        where: { ativo: true, tarefa: { projetoId }, atribuidoAUsuario: { is: { ativo: true } } },
        select: { atribuidoAUsuario: { select: { id: true, nome: true, perfil: true } } },
      }),
      tx.usuario.count({ where: { perfil: "CLIENTE", clienteId: projeto.clienteId, ativo: true } }),
    ]);
    return montarQuemAcessa({
      administradores,
      atribuicoes,
      subtarefasAtribuidas: subtarefas.flatMap((s) => (s.atribuidoAUsuario ? [{ usuario: s.atribuidoAUsuario }] : [])),
      cliente: { razaoSocial: projeto.cliente.razaoSocial, pessoasComAcesso },
    });
  });
}
