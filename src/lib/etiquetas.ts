import { Prisma } from "@prisma/client";
import { comContextoDeUsuario, type ContextoUsuario } from "@/lib/prisma-app";
import { CORES_ETIQUETA, type EtiquetaSelecionada } from "@/lib/etiqueta-colors";

export type { CorEtiqueta, EtiquetaSelecionada } from "@/lib/etiqueta-colors";

/** Lista o catálogo disponível para seletores que respeitam as policies RLS. */
export async function listarEtiquetas(ctx: ContextoUsuario) {
  return comContextoDeUsuario(ctx, (tx) => tx.etiqueta.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true, cor: true } }));
}

export async function listarEtiquetasGerenciadas(ctx: ContextoUsuario) {
  // Ações de gestão do catálogo são restritas ao perfil administrador.
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, async (tx) => {
    // Lê o catálogo e os nomes associados; o segundo conjunto permite exibir a contagem de uso.
    const [etiquetas, subtarefas] = await Promise.all([
      tx.etiqueta.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true, cor: true, criadoEm: true } }),
      tx.subtarefa.findMany({ select: { etiquetas: true } }),
    ]);
    // A etiqueta é contabilizada uma vez por subtarefa, sem duplicar o uso no mesmo registro.
    const usos = new Map<string, number>();
    for (const subtarefa of subtarefas) {
      for (const nome of new Set(subtarefa.etiquetas.map((etiqueta) => etiqueta.toLocaleLowerCase("pt-BR")))) {
        usos.set(nome, (usos.get(nome) ?? 0) + 1);
      }
    }
    // Mantém todos os metadados da etiqueta e acrescenta a contagem calculada em memória.
    return etiquetas.map((etiqueta) => ({ ...etiqueta, quantidadeSubtarefas: usos.get(etiqueta.nome.toLocaleLowerCase("pt-BR")) ?? 0 }));
  });
}

export async function criarEtiquetaGerenciada(ctx: ContextoUsuario, dados: EtiquetaSelecionada) {
  // Confere permissão, forma canônica do nome e cor antes de iniciar a transação.
  exigirAdministrador(ctx);
  const nome = normalizarNome(dados.nome);
  validarCor(dados.cor);
  return comContextoDeUsuario(ctx, async (tx) => {
    // A checagem amigável complementa a restrição de unicidade do banco.
    await validarNomeDisponivel(tx, nome);
    return tx.etiqueta.create({ data: { nome, cor: dados.cor } });
  });
}

export async function atualizarEtiquetaGerenciada(ctx: ContextoUsuario, id: string, dados: EtiquetaSelecionada) {
  exigirAdministrador(ctx);
  const nome = normalizarNome(dados.nome);
  validarCor(dados.cor);
  return comContextoDeUsuario(ctx, async (tx) => {
    // A edição exige que o registro ainda exista, inclusive se a tela estiver desatualizada.
    const atual = await tx.etiqueta.findUnique({ where: { id } });
    if (!atual) throw new Error("Esta etiqueta não está mais no catálogo.");
    await validarNomeDisponivel(tx, nome, id);
    if (atual.nome !== nome) {
      // Atualiza referências antigas para preservar as associações das subtarefas.
      await tx.$executeRaw`UPDATE "subtarefas" SET "etiquetas" = array_replace("etiquetas", ${atual.nome}, ${nome}), "atualizadoEm" = CURRENT_TIMESTAMP WHERE ${atual.nome} = ANY("etiquetas")`;
    }
    return tx.etiqueta.update({ where: { id }, data: { nome, cor: dados.cor } });
  });
}

export async function excluirEtiquetaGerenciada(ctx: ContextoUsuario, id: string) {
  exigirAdministrador(ctx);
  return comContextoDeUsuario(ctx, async (tx) => {
    // Lê a etiqueta antes de alterar associações para devolver um resumo do que foi removido.
    const etiqueta = await tx.etiqueta.findUnique({ where: { id } });
    if (!etiqueta) throw new Error("Esta etiqueta já foi removida.");
    // A contagem é feita antes da remoção para informar quantas subtarefas foram afetadas.
    const subtarefas = await tx.subtarefa.findMany({ where: { etiquetas: { has: etiqueta.nome } }, select: { id: true } });
    // Remove o nome de todos os arrays antes de excluir o catálogo, tudo na mesma transação.
    await tx.$executeRaw`UPDATE "subtarefas" SET "etiquetas" = array_remove("etiquetas", ${etiqueta.nome}), "atualizadoEm" = CURRENT_TIMESTAMP WHERE ${etiqueta.nome} = ANY("etiquetas")`;
    await tx.etiqueta.delete({ where: { id } });
    return { nome: etiqueta.nome, quantidadeSubtarefas: subtarefas.length };
  });
}

function exigirAdministrador(ctx: ContextoUsuario) {
  // A interface não é a fronteira de segurança; a permissão é validada no servidor.
  if (ctx.perfil !== "ADMIN") throw new Error("A gestão do catálogo de etiquetas é exclusiva do Administrador.");
}

function validarCor(cor: string) {
  // Cores legadas são mantidas para compatibilidade com dados antigos e testes existentes.
  if (!CORES_ETIQUETA.some((opcao) => opcao.fundo === cor) && !CORES_LEGADAS_ETIQUETA.includes(cor)) {
    throw new Error("Escolha uma cor disponível para a etiqueta.");
  }
}

// Mantém compatibilidade com cores gravadas por versões anteriores e fixtures existentes.
const CORES_LEGADAS_ETIQUETA = ["#DBEAFE", "#DCFCE7", "#FEF3C7", "#FEE2E2", "#F3E8FF"];

async function validarNomeDisponivel(tx: Prisma.TransactionClient, nome: string, ignorarId?: string) {
  // A comparação case-insensitive evita nomes visualmente duplicados; edição ignora seu próprio id.
  const existente = await tx.etiqueta.findFirst({ where: { nome: { equals: nome, mode: "insensitive" }, ...(ignorarId ? { id: { not: ignorarId } } : {}) }, select: { id: true } });
  if (existente) throw new Error("Já existe uma etiqueta com esse nome.");
}

function normalizarNome(nome: string) {
  // Colapsa espaços internos e externos para que as pesquisas usem um nome canônico.
  const valor = nome.trim().replace(/\s+/g, " ");
  if (!valor || valor.length > 40) throw new Error("O nome da etiqueta deve ter entre 1 e 40 caracteres.");
  return valor;
}

/** Cria as etiquetas globais necessárias e retorna os nomes canônicos selecionados. */
export async function salvarEtiquetasSubtarefa(
  tx: Prisma.TransactionClient,
  nomesSelecionados: string[],
  novasEtiquetas: EtiquetaSelecionada[],
) {
  // Busca o catálogo atual e monta um índice por nome normalizado para evitar leituras repetidas.
  const existentes = await tx.etiqueta.findMany({ select: { nome: true, cor: true } });
  const porNome = new Map(existentes.map((etiqueta) => [etiqueta.nome.toLocaleLowerCase("pt-BR"), etiqueta]));
  const novasResolvidas = [...novasEtiquetas];
  // Seleções antigas sem registro explícito ganham a cor cinza padrão.
  const corLegada = CORES_ETIQUETA.find((cor) => cor.nome === "Cinza")!.fundo;
  for (const nomeOriginal of nomesSelecionados) {
    const nome = normalizarNome(nomeOriginal);
    const chave = nome.toLocaleLowerCase("pt-BR");
    if (!porNome.has(chave) && !novasResolvidas.some((nova) => nova.nome.toLocaleLowerCase("pt-BR") === chave)) {
      novasResolvidas.push({ nome, cor: corLegada });
    }
  }

  for (const nova of novasResolvidas) {
    // Revalida cada etiqueta enviada pelo formulário dentro da camada de servidor.
    const nome = normalizarNome(nova.nome);
    validarCor(nova.cor);
    const chave = nome.toLocaleLowerCase("pt-BR");
    if (porNome.has(chave)) continue;
    // skipDuplicates lida com duas criações concorrentes do mesmo nome.
    await tx.etiqueta.createMany({ data: { nome, cor: nova.cor }, skipDuplicates: true });
    // Relê o registro canônico, que também pode ter sido criado por outra transação.
    const criada = await tx.etiqueta.findFirst({ where: { nome: { equals: nome, mode: "insensitive" } }, select: { nome: true, cor: true } });
    if (!criada) throw new Error("Não foi possível salvar a nova etiqueta.");
    porNome.set(chave, criada);
  }

  const nomesCanonicos = new Map<string, string>();
  for (const nomeOriginal of nomesSelecionados) {
    // Apenas nomes que existem no catálogo podem ser persistidos na subtarefa.
    const nome = normalizarNome(nomeOriginal);
    const etiqueta = porNome.get(nome.toLocaleLowerCase("pt-BR"));
    if (!etiqueta) throw new Error(`A etiqueta “${nome}” não existe. Selecione uma etiqueta disponível.`);
    nomesCanonicos.set(etiqueta.nome.toLocaleLowerCase("pt-BR"), etiqueta.nome);
  }
  // Retorna os nomes com capitalização canônica, sem duplicatas por diferença de caixa.
  return [...nomesCanonicos.values()];
}
