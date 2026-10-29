import type { Prisma } from "@prisma/client";
import { comContextoDeUsuario, type ContextoUsuario } from "@/lib/prisma-app";
import { calcularPercentualConclusao } from "@/lib/regras-projetos-tarefas";

// O portal fornece leitura restrita ao cliente associado à sessão autenticada.
function exigirCliente(ctx: ContextoUsuario) {
  if (ctx.perfil !== "CLIENTE") throw new Error("Visão exclusiva do cliente.");
}

async function contarSubtarefas(tx: Prisma.TransactionClient, tarefaId: string) {
  // A função SQL aplica o limite de dados permitido ao portal no banco.
  const rows = await tx.$queryRaw<Array<{ total: number; concluidas: number }>>`SELECT * FROM contar_subtarefas_portal(${tarefaId})`;
  // Uma tarefa sem subtarefas retorna contagens zeradas para manter o contrato estável.
  return rows[0] ?? { total: 0, concluidas: 0 };
}

async function nomeResponsavel(tx: Prisma.TransactionClient, tarefaId: string) {
  // O banco resolve o nome segundo as permissões específicas do portal.
  const rows = await tx.$queryRaw<Array<{ nome: string | null }>>`SELECT responsavel_nome_portal(${tarefaId}) AS nome`;
  return rows[0]?.nome ?? null;
}

export async function listarProjetosPortal(ctx: ContextoUsuario) {
  // A validação do perfil ocorre na função de domínio, além da guarda da interface.
  exigirCliente(ctx);
  return comContextoDeUsuario(ctx, async (tx) => {
    // O vínculo clienteId da própria sessão limita a busca ao cadastro associado.
    const usuario = await tx.usuario.findUnique({ where: { id: ctx.usuarioId }, select: { clienteId: true } });
    if (!usuario?.clienteId) return [];
    // Seleciona apenas projetos e tarefas ativas e os campos necessários ao resumo do portal.
    const projetos = await tx.projeto.findMany({
      where: { clienteId: usuario.clienteId, ativo: true, cliente: { ativo: true } },
      select: {
        id: true, numeroLocal: true, nome: true, status: true, dataInicio: true, dataPrevistaConclusao: true,
        cliente: { select: { numeroIdentificacao: true } },
        tarefas: { where: { ativo: true }, select: { id: true, status: true, ativo: true } },
      },
      orderBy: [{ atualizadoEm: "desc" }, { id: "asc" }],
    });
    // Cada projeto recebe sua última atividade e o indicador agregado de conclusão.
    const comAtividade = await Promise.all(projetos.map(async (projeto) => {
      const atualizacoes = await tx.$queryRaw<Array<{ em: Date | null }>>`SELECT ultima_atualizacao_portal(${projeto.id}) AS em`;
      const conclusao = calcularPercentualConclusao(projeto.tarefas);
      return { ...projeto, ultimaAtualizacao: atualizacoes[0]?.em ?? null, conclusao };
    }));
    // Ordena por atividade mais recente; projetos sem data ficam ao final.
    return comAtividade.sort((a, b) => (b.ultimaAtualizacao?.getTime() ?? 0) - (a.ultimaAtualizacao?.getTime() ?? 0));
  });
}

export async function buscarProjetoPortal(ctx: ContextoUsuario, projetoId: string) {
  // A mesma restrição por perfil e cliente é aplicada também à rota de detalhe.
  exigirCliente(ctx);
  return comContextoDeUsuario(ctx, async (tx) => {
    const usuario = await tx.usuario.findUnique({ where: { id: ctx.usuarioId }, select: { clienteId: true } });
    if (!usuario?.clienteId) return null;
    // O identificador da URL só retorna resultado quando pertence ao cliente da sessão.
    const projeto = await tx.projeto.findFirst({
      where: { id: projetoId, clienteId: usuario.clienteId, ativo: true, cliente: { ativo: true } },
      select: {
        id: true, numeroLocal: true, nome: true, status: true, dataInicio: true, dataPrevistaConclusao: true,
        documentos: { where: { ativo: true }, select: { id: true, nome: true, link: true }, orderBy: { criadoEm: "desc" } },
        cliente: { select: { numeroIdentificacao: true, documentos: { where: { ativo: true, projetoId: null }, select: { id: true, nome: true, link: true }, orderBy: { criadoEm: "desc" } } } },
        tarefas: {
          where: { ativo: true },
          select: { id: true, numeroLocal: true, nome: true, prazo: true, status: true, ativo: true },
          orderBy: [{ prazo: "asc" }, { nome: "asc" }],
        },
      },
    });
    // Não revela se o id existe para outro cliente: ambos os casos retornam null.
    if (!projeto) return null;
    // Consultas auxiliares independentes são executadas em paralelo para reduzir latência.
    const [ultimaAtualizacao, tarefas] = await Promise.all([
      tx.$queryRaw<Array<{ em: Date | null }>>`SELECT ultima_atualizacao_portal(${projeto.id}) AS em`,
      Promise.all(projeto.tarefas.map(async (tarefa) => {
        // Contagem de subtarefas e nome de responsável passam pelas funções seguras do portal.
        const [contagem, responsavel] = await Promise.all([contarSubtarefas(tx, tarefa.id), nomeResponsavel(tx, tarefa.id)]);
        // Sem subtarefas, o progresso da tarefa deriva diretamente do status dela.
        const progresso = contagem.total === 0
          ? calcularPercentualConclusao([{ ativo: tarefa.ativo, status: tarefa.status }])
          : { total: contagem.total, concluidas: contagem.concluidas, percentual: Math.round((contagem.concluidas / contagem.total) * 100) };
        return { ...tarefa, responsavel, progresso };
      })),
    ]);
    // O indicador do projeto usa somente as tarefas ativas selecionadas acima.
    const conclusao = calcularPercentualConclusao(projeto.tarefas);
    // Junta documentos do projeto e documentos gerais do cliente sem expor outros registros.
    return {
      ...projeto,
      tarefas,
      conclusao,
      ultimaAtualizacao: ultimaAtualizacao[0]?.em ?? null,
      documentos: [...projeto.documentos, ...projeto.cliente.documentos],
    };
  });
}
