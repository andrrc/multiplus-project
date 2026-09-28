import { Prisma } from "@prisma/client";
import { comContextoDeUsuario, type ContextoUsuario } from "@/lib/prisma-app";
import { CORES_ETIQUETA, type EtiquetaSelecionada } from "@/lib/etiqueta-colors";

export type { CorEtiqueta, EtiquetaSelecionada } from "@/lib/etiqueta-colors";

export async function listarEtiquetas(ctx: ContextoUsuario) {
  return comContextoDeUsuario(ctx, (tx) => tx.etiqueta.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true, cor: true } }));
}

function normalizarNome(nome: string) {
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
  const existentes = await tx.etiqueta.findMany({ select: { nome: true, cor: true } });
  const porNome = new Map(existentes.map((etiqueta) => [etiqueta.nome.toLocaleLowerCase("pt-BR"), etiqueta]));
  const novasResolvidas = [...novasEtiquetas];
  const corLegada = CORES_ETIQUETA.find((cor) => cor.nome === "Cinza")!.fundo;
  for (const nomeOriginal of nomesSelecionados) {
    const nome = normalizarNome(nomeOriginal);
    const chave = nome.toLocaleLowerCase("pt-BR");
    if (!porNome.has(chave) && !novasResolvidas.some((nova) => nova.nome.toLocaleLowerCase("pt-BR") === chave)) {
      novasResolvidas.push({ nome, cor: corLegada });
    }
  }

  for (const nova of novasResolvidas) {
    const nome = normalizarNome(nova.nome);
    if (!CORES_ETIQUETA.some((cor) => cor.fundo === nova.cor)) throw new Error("Escolha uma cor disponível para a etiqueta.");
    const chave = nome.toLocaleLowerCase("pt-BR");
    if (porNome.has(chave)) continue;
    await tx.etiqueta.createMany({ data: { nome, cor: nova.cor }, skipDuplicates: true });
    const criada = await tx.etiqueta.findFirst({ where: { nome: { equals: nome, mode: "insensitive" } }, select: { nome: true, cor: true } });
    if (!criada) throw new Error("Não foi possível salvar a nova etiqueta.");
    porNome.set(chave, criada);
  }

  const nomesCanonicos = new Map<string, string>();
  for (const nomeOriginal of nomesSelecionados) {
    const nome = normalizarNome(nomeOriginal);
    const etiqueta = porNome.get(nome.toLocaleLowerCase("pt-BR"));
    if (!etiqueta) throw new Error(`A etiqueta “${nome}” não existe. Selecione uma etiqueta disponível.`);
    nomesCanonicos.set(etiqueta.nome.toLocaleLowerCase("pt-BR"), etiqueta.nome);
  }
  return [...nomesCanonicos.values()];
}
