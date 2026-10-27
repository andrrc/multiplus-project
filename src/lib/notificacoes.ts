/**
 * Biblioteca de domínio `notificacoes`. Reúne funções reutilizáveis desta área; os comentários junto às funções explicam validações, decisões e efeitos específicos de cada operação.
 */
import { EventoNotificacao, Perfil, Prisma } from "@prisma/client";
import { enviarEmail } from "@/lib/email";
import { renderTemplateMencaoComentario, renderTemplateNotificacao } from "@/lib/email-templates";
import { rotaDoRegistroParaPerfil } from "@/lib/notificacoes-rotas";
import { dataDeHojeEmSaoPaulo } from "@/lib/datas";
import { prisma } from "@/lib/prisma";
import { comContextoDeUsuario, type ContextoUsuario } from "@/lib/prisma-app";

type DadosEvento = {
  titulo: string;
  mensagem: string;
  url?: string | null;
  urlCliente?: string | null;
  entidadeId?: string | null;
  dedupeKey?: string | null;
  usuarioIds: string[];
};

type Destinatario = {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  preferenciasNotificacao: { email: boolean; inApp: boolean }[];
};

async function listarDestinatarios(evento: EventoNotificacao, usuarioIds: string[]) {
  // Evita consultas quando o evento não tem destinatários possíveis.
  if (usuarioIds.length === 0) return [];
  // Preferências válidas definem quais perfis podem receber este evento por algum canal.
  const preferencias = await prisma.preferenciaNotificacao.findMany({
    where: { evento, OR: [{ email: true }, { inApp: true }] },
  });
  const perfis = preferencias.map((preferencia) => preferencia.perfil);
  // Deduplica ids e limita a consulta a contas ativas dos perfis com preferência configurada.
  const usuarios = await prisma.usuario.findMany({
    where: {
      ativo: true,
      id: { in: [...new Set(usuarioIds)] },
      perfil: { in: perfis },
    },
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
    },
  });
  return usuarios.map((usuario) => ({
    ...usuario,
    preferenciasNotificacao: preferencias.filter((preferencia) => preferencia.perfil === usuario.perfil),
  }));
}

/** B6 — dispara in-app e e-mail sem deixar a integração externa bloquear a ação. */
export async function dispararEventoNotificacao(evento: EventoNotificacao, dados: DadosEvento) {
  // Métricas retornadas ao chamador indicam o resultado de cada canal sem interromper a ação original.
  const metricas = { emailsEnviados: 0, inAppCriadas: 0, falhas: 0 };
  try {
    // Destinatários são derivados no servidor; o formulário não controla canais ou perfis.
    const destinatarios = await listarDestinatarios(evento, dados.usuarioIds);
    await Promise.all(destinatarios.map(async (destinatario: Destinatario) => {
      const preferencia = destinatario.preferenciasNotificacao[0];
      if (!preferencia) return;
      // Colaboradores e clientes recebem rotas compatíveis com seu escopo de acesso.
      const url = rotaDoRegistroParaPerfil(
        destinatario.perfil === "CLIENTE" ? dados.urlCliente ?? null : dados.url,
        destinatario.perfil,
      );

      if (dados.dedupeKey && evento === EventoNotificacao.PRAZO_PROXIMO) {
        try {
          // Reserva uma chave por destinatário; a restrição única impede reenvio do mesmo aviso diário.
          await prisma.registroEnvioPrazo.create({ data: { chave: `${dados.dedupeKey}:${destinatario.id}` } });
        } catch (erro) {
          if ((erro as { code?: string }).code === "P2002") return;
          throw erro;
        }
      }

      if (preferencia.inApp) {
        // P2002 indica que uma notificação idempotente já foi criada, não falha de entrega.
        await prisma.notificacao.create({
          data: {
            usuarioId: destinatario.id,
            evento,
            titulo: dados.titulo,
            mensagem: dados.mensagem,
            url,
            entidadeId: dados.entidadeId ?? null,
            dedupeKey: dados.dedupeKey ? `${dados.dedupeKey}:${destinatario.id}` : null,
          },
        }).then(() => { metricas.inAppCriadas += 1; }).catch((erro: unknown) => {
          if ((erro as { code?: string }).code !== "P2002") throw erro;
        });
      }

      if (preferencia.email) {
        // A falha de e-mail é contabilizada, mas não impede a entrega in-app nem outros destinatários.
        await enviarEmail({
          to: destinatario.email,
          subject: dados.titulo,
          html: renderTemplateNotificacao(evento, {
            nome: destinatario.nome,
            titulo: dados.titulo,
            mensagem: dados.mensagem,
            url,
          }),
        }).then(() => { metricas.emailsEnviados += 1; }).catch((erro: unknown) => {
          metricas.falhas += 1;
          console.error(`[notificacao] falha ao enviar para ${destinatario.email}:`, erro);
        });
      }
    }));
  } catch (erro) {
    metricas.falhas += 1;
    console.error(`[notificacao] falha no evento ${evento}:`, erro);
  }
  return metricas;
}

/** Menções são direcionadas, mas respeitam os canais de NOVO_COMENTARIO do perfil. */
export async function dispararNotificacoesMencaoComentario(dados: { destinatarioIds: string[]; autorId: string; comentario: string; url: string; entidadeId: string }) {
  try {
    // Deduplica menções e descarta usuários já inativos antes de preparar os canais.
    const ids = [...new Set(dados.destinatarioIds)];
    if (!ids.length) return;
    const usuarios = await prisma.usuario.findMany({ where: { id: { in: ids }, ativo: true }, select: { id: true, nome: true, email: true, perfil: true } });
    const autor = await prisma.usuario.findUnique({ where: { id: dados.autorId }, select: { nome: true } });
    const preferencias = await prisma.preferenciaNotificacao.findMany({ where: { evento: EventoNotificacao.NOVO_COMENTARIO } });
    await Promise.all(usuarios.map(async (usuario) => {
      const preferencia = preferencias.find((item) => item.perfil === usuario.perfil);
      if (!preferencia) return;
      // A menção também confirma ao autor que o comentário foi publicado.
      const eAutor = usuario.id === dados.autorId;
      const titulo = eAutor ? "Menção enviada em comentário" : "Você foi mencionado em um comentário";
      const mensagem = eAutor ? "Esta confirmação registra a publicação da menção no comentário." : `${autor?.nome ?? "Alguém"} mencionou você em um comentário.`;
      const url = rotaDoRegistroParaPerfil(dados.url, usuario.perfil);
      if (preferencia.inApp) {
        await prisma.notificacao.create({
          data: {
            usuarioId: usuario.id,
            evento: EventoNotificacao.NOVO_COMENTARIO,
            titulo,
            mensagem,
            url,
            entidadeId: dados.entidadeId,
            dedupeKey: `mencao:${dados.entidadeId}:${usuario.id}`,
          },
        }).catch((erro: unknown) => {
          if ((erro as { code?: string }).code !== "P2002") throw erro;
        });
      }
      if (preferencia.email) {
        await enviarEmail({
          to: usuario.email,
          subject: titulo,
          html: renderTemplateMencaoComentario({ nome: usuario.nome, titulo, mensagem, autor: autor?.nome ?? "Usuário", comentario: dados.comentario, url }),
        }).catch((erro: unknown) => console.error(`[mencao] falha ao enviar para ${usuario.email}:`, erro));
      }
    }));
  } catch (erro) {
    console.error("[mencao] falha ao preparar e-mails de comentário:", erro);
  }
}

/** O perfil ADMIN representa a conta da Talita, destinatária dos avisos de conclusão. */
export async function listarAdministradoresAtivos(): Promise<string[]> {
  const administradores = await prisma.usuario.findMany({
    where: { ativo: true, perfil: "ADMIN" },
    select: { id: true },
  });
  return administradores.map(({ id }) => id);
}

/** RF-022 — resolve clientes ativos vinculados ao projeto sem aceitar IDs de destinatário do formulário. */
export async function listarClientesAtivosDoProjeto(projetoId: string): Promise<string[]> {
  // Não aceita destinatários enviados pela tela: resolve cliente a partir do projeto ativo.
  const projeto = await prisma.projeto.findFirst({
    where: { id: projetoId, ativo: true, cliente: { ativo: true } },
    select: { clienteId: true },
  });
  // Projeto ou cliente inativo não gera notificações para contas do portal.
  if (!projeto) return [];
  const usuarios = await prisma.usuario.findMany({
    where: { perfil: Perfil.CLIENTE, ativo: true, clienteId: projeto.clienteId, cliente: { ativo: true } },
    select: { id: true },
  });
  return usuarios.map(({ id }) => id);
}

export async function buscarProjetoAtivoDaTarefa(tarefaId: string): Promise<string | null> {
  // A cadeia tarefa → projeto → cliente deve estar ativa para produzir um link/notificação.
  const tarefa = await prisma.tarefa.findFirst({
    where: { id: tarefaId, ativo: true, projeto: { ativo: true, cliente: { ativo: true } } },
    select: { projetoId: true },
  });
  return tarefa?.projetoId ?? null;
}

/** Dispara ATRIBUICAO_RECEBIDA conforme a preferência do usuário atribuído. */
export async function dispararNotificacaoAtribuicaoRecebida(usuarioId: string, entidadeTipo: "PROJETO" | "TAREFA" | "SUBTAREFA", entidadeId: string) {
  try {
    // Busca o rótulo apropriado sem carregar dados que não entram na notificação.
    const registro = entidadeTipo === "PROJETO"
      ? await prisma.projeto.findUnique({ where: { id: entidadeId }, select: { nome: true } })
      : entidadeTipo === "TAREFA"
      ? await prisma.tarefa.findUnique({ where: { id: entidadeId }, select: { nome: true } })
      : await prisma.subtarefa.findUnique({ where: { id: entidadeId }, select: { titulo: true, tarefaId: true } });
    if (!registro) return;
    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { perfil: true } });
    if (!usuario) return;
    // Projetos/tarefas usam `nome`; subtarefas usam `titulo`.
    const nome = "nome" in registro ? registro.nome : registro.titulo;
    let url: string;
    if (entidadeTipo === "PROJETO") {
      url = `${usuario.perfil === "ADMIN" ? "/projetos" : "/meus-projetos"}/${entidadeId}`;
    } else if (entidadeTipo === "TAREFA") {
      url = `${usuario.perfil === "ADMIN" ? "/tarefas" : "/minhas-tarefas"}/${entidadeId}`;
    } else {
      if (!("tarefaId" in registro)) return;
      url = usuario.perfil === "ADMIN"
        ? `/tarefas/${registro.tarefaId}?subtarefa=${entidadeId}#subtarefa-${entidadeId}`
        : `/minhas-tarefas/${registro.tarefaId}`;
    }
    await dispararEventoNotificacao(EventoNotificacao.ATRIBUICAO_RECEBIDA, {
      titulo: `Nova atribuição: ${nome}`,
      mensagem: entidadeTipo === "PROJETO" ? "Você recebeu acesso a um projeto." : entidadeTipo === "TAREFA" ? "Você recebeu uma tarefa." : "Você recebeu uma subtarefa.",
      url,
      entidadeId,
      usuarioIds: [usuarioId],
    });
  } catch (erro) {
    console.error(`[notificacao] falha ao preparar atribuição ${entidadeTipo}:${entidadeId}:`, erro);
  }
}

export async function dispararPrazoProximo(dias?: number, hoje = new Date()) {
  // Parâmetro explícito facilita execuções controladas; fora delas vale a configuração global.
  const configuracao = await prisma.configuracaoNotificacao.findUnique({ where: { id: 1 } });
  const antecedencia = dias ?? configuracao?.diasAntecedenciaPadrao ?? 7;
  // Usa o início do dia de São Paulo para que avisos e semáforo mudem de data juntos.
  const inicio = new Date(dataDeHojeEmSaoPaulo(hoje));
  const whereBase: Prisma.TarefaWhereInput = { ativo: true, prazo: { gte: inicio }, status: { notIn: ["CONCLUIDO", "CANCELADO"] }, projeto: { ativo: true, cliente: { ativo: true } } };
  // A janela ampla precisa cobrir também tarefas com antecedência maior que o padrão.
  const maiorAntecedencia = await prisma.tarefa.aggregate({ where: whereBase, _max: { diasAntecedencia: true } });
  const fim = new Date(inicio);
  fim.setUTCDate(fim.getUTCDate() + Math.max(antecedencia, maiorAntecedencia._max?.diasAntecedencia ?? 0));
  fim.setUTCHours(23, 59, 59, 999);
  const tarefas = await prisma.tarefa.findMany({
    where: {
      ...whereBase,
      prazo: { gte: inicio, lte: fim },
    },
    select: {
      id: true,
      nome: true,
      prazo: true,
      diasAntecedencia: true,
      responsavel: { select: { usuario: { select: { id: true, ativo: true } } } },
      responsavelUsuario: { select: { id: true, ativo: true } },
    },
  });

  let processadas = 0;
  let emailsEnviados = 0;
  let inAppCriadas = 0;
  let falhas = 0;
  const administradores = await prisma.usuario.findMany({ where: { ativo: true, perfil: "ADMIN" }, select: { id: true } });
  // Cada tarefa aplica sua antecedência própria, com o parâmetro explícito tendo prioridade.
  const elegiveis = tarefas.filter((tarefa) => {
    const limite = new Date(inicio);
    limite.setUTCDate(limite.getUTCDate() + (dias ?? tarefa.diasAntecedencia ?? antecedencia));
    limite.setUTCHours(23, 59, 59, 999);
    return tarefa.prazo !== null && tarefa.prazo <= limite;
  });
  for (const tarefa of elegiveis) {
    // O aviso vai ao responsável ativo; sem responsável elegível, vai à ADMIN.
    const alvo = tarefa.responsavelUsuario?.ativo
      ? [tarefa.responsavelUsuario.id]
      : tarefa.responsavel?.usuario?.ativo
      ? [tarefa.responsavel.usuario.id]
      : administradores.map((administrador) => administrador.id);
    const metricas = await dispararEventoNotificacao(EventoNotificacao.PRAZO_PROXIMO, {
      titulo: `Prazo próximo: ${tarefa.nome}`,
      mensagem: `A tarefa vence em ${tarefa.prazo ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(tarefa.prazo) : "data não definida"}.`,
      url: `/tarefas/${tarefa.id}`,
      entidadeId: tarefa.id,
      dedupeKey: `prazo:${tarefa.id}:${inicio.toISOString().slice(0, 10)}`,
      usuarioIds: alvo,
    });
    emailsEnviados += metricas.emailsEnviados;
    inAppCriadas += metricas.inAppCriadas;
    falhas += metricas.falhas;
    processadas += 1;
  }
  return { encontradas: elegiveis.length, processadas, emailsEnviados, inAppCriadas, falhas };
}

export async function executarJobPrazo(hoje = new Date()) {
  // Marca o início antes do processamento para que a tela de observabilidade mostre execução atual.
  const inicio = new Date();
  await prisma.configuracaoNotificacao.upsert({ where: { id: 1 }, create: { id: 1, ultimaExecucaoPrazoEm: inicio, ultimaExecucaoPrazoStatus: "EM_EXECUCAO" }, update: { ultimaExecucaoPrazoEm: inicio, ultimaExecucaoPrazoStatus: "EM_EXECUCAO" } });
  try {
    // `undefined` instrui a rotina a respeitar as antecedências de cada tarefa.
    const resultado = await dispararPrazoProximo(undefined, hoje);
    const sucesso = resultado.falhas === 0;
    // O último sucesso só é substituído quando todos os envios terminaram sem falhas.
    await prisma.configuracaoNotificacao.update({ where: { id: 1 }, data: {
      ultimaExecucaoPrazoStatus: sucesso ? "SUCESSO" : "FALHA",
      ...(sucesso ? { ultimoSucessoPrazoEm: new Date(), ultimoSucessoPrazoTarefas: resultado.processadas, ultimoSucessoPrazoEmailsEnviados: resultado.emailsEnviados, ultimoSucessoPrazoInAppCriados: resultado.inAppCriadas } : {}),
    } });
    console.info(JSON.stringify({ evento: "job_notificacoes_prazo", status: sucesso ? "SUCESSO" : "FALHA", ...resultado }));
    return { ...resultado, status: sucesso ? "SUCESSO" : "FALHA" };
  } catch (erro) {
    await prisma.configuracaoNotificacao.update({ where: { id: 1 }, data: { ultimaExecucaoPrazoStatus: "FALHA" } }).catch(() => undefined);
    console.error(JSON.stringify({ evento: "job_notificacoes_prazo", status: "FALHA" }), erro);
    throw erro;
  }
}

export async function buscarStatusJobPrazo() {
  // Retorna somente os campos de execução necessários ao painel de observabilidade.
  return prisma.configuracaoNotificacao.findUnique({ where: { id: 1 }, select: {
    ultimaExecucaoPrazoEm: true, ultimaExecucaoPrazoStatus: true, ultimoSucessoPrazoEm: true,
    ultimoSucessoPrazoTarefas: true, ultimoSucessoPrazoEmailsEnviados: true, ultimoSucessoPrazoInAppCriados: true,
  } });
}

export async function listarNotificacoes(ctx: ContextoUsuario) {
  // A lista e o contador são consultados em paralelo e ambos ficam restritos ao usuário da sessão.
  return comContextoDeUsuario(ctx, async (tx) => {
    const [itens, naoLidas] = await Promise.all([
      tx.notificacao.findMany({ where: { usuarioId: ctx.usuarioId }, orderBy: { criadaEm: "desc" }, take: 50 }),
      tx.notificacao.count({ where: { usuarioId: ctx.usuarioId, lida: false } }),
    ]);
    return { itens, naoLidas };
  });
}

/** Retorna somente a quantidade de avisos não lidos do usuário atual, para o menu lateral. */
export async function contarNotificacoesNaoLidas(ctx: ContextoUsuario) {
  return comContextoDeUsuario(ctx, (tx) =>
    tx.notificacao.count({ where: { usuarioId: ctx.usuarioId, lida: false } }),
  );
}

export async function marcarNotificacaoLida(ctx: ContextoUsuario, id: string) {
  // O filtro composto impede marcar como lida uma notificação pertencente a outra conta.
  return comContextoDeUsuario(ctx, (tx) => tx.notificacao.updateMany({ where: { id, usuarioId: ctx.usuarioId }, data: { lida: true } }));
}

export async function marcarTodasNotificacoesLidas(ctx: ContextoUsuario) {
  // Atualiza somente notificações não lidas do usuário atual.
  return comContextoDeUsuario(ctx, (tx) => tx.notificacao.updateMany({ where: { usuarioId: ctx.usuarioId, lida: false }, data: { lida: true } }));
}

export async function listarPreferenciasNotificacao(ctx: ContextoUsuario) {
  // A matriz de preferências é administrada centralmente.
  if (ctx.perfil !== "ADMIN") throw new Error("Ação restrita ao Administrador.");
  return comContextoDeUsuario(ctx, (tx) => tx.preferenciaNotificacao.findMany({ orderBy: [{ perfil: "asc" }, { evento: "asc" }] }));
}

export async function atualizarPreferenciaNotificacao(ctx: ContextoUsuario, perfil: "ADMIN" | "ADMIN_INTERNO" | "ADMIN_EXTERNO" | "CLIENTE", evento: EventoNotificacao, canais: { email: boolean; inApp: boolean }) {
  // O servidor repete a checagem de ADMIN e atualiza o par único perfil/evento.
  if (ctx.perfil !== "ADMIN") throw new Error("Ação restrita ao Administrador.");
  return comContextoDeUsuario(ctx, (tx) => tx.preferenciaNotificacao.update({ where: { perfil_evento: { perfil, evento } }, data: canais }));
}
