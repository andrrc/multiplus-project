/**
 * Regras puras dos comprovantes do colaborador externo (sem acesso a banco nem a storage, para testar sem infraestrutura):
 * tipos aceitos, conferência do conteúdo pelos bytes iniciais, limites, nome seguro e a situação do envio de um item.
 */

/** Tamanho máximo de cada arquivo; a foto é reduzida no navegador antes de chegar aqui. */
export const LIMITE_ARQUIVO_COMPROVANTE_BYTES = 10 * 1024 * 1024;
/** Máximo de arquivos por envio (o banco repete este limite). */
export const MAX_ARQUIVOS_POR_ENVIO = 20;
/** Quantidade máxima que um item pode exigir. */
export const MAX_COMPROVANTES_EXIGIDOS = 20;

export type TipoComprovante =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "application/pdf"
  | "text/csv"
  | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  | "application/vnd.ms-excel"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "application/msword";

/** Extensão gravada na chave do storage, por tipo. A chave nunca usa o nome enviado pelo colaborador. */
export const EXTENSAO_POR_TIPO: Record<TipoComprovante, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "text/csv": "csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "doc",
};

/** Atributo `accept` do campo de arquivo; a conferência de verdade é a dos bytes, feita no servidor. */
export const ACCEPT_COMPROVANTE = "image/*,.pdf,.xlsx,.xls,.csv,.doc,.docx";

const IMAGENS: ReadonlyArray<TipoComprovante> = ["image/jpeg", "image/png", "image/webp"];

/** Imagens abrem na própria página; os demais tipos só são baixados. */
export function ehImagemComprovante(tipo: string): boolean {
  return (IMAGENS as ReadonlyArray<string>).includes(tipo);
}

function comeca(bytes: Uint8Array, assinatura: number[]): boolean {
  return bytes.length >= assinatura.length && assinatura.every((valor, i) => bytes[i] === valor);
}

function extensaoDoNome(nome: string): string {
  const ponto = nome.lastIndexOf(".");
  return ponto < 0 ? "" : nome.slice(ponto + 1).toLowerCase();
}

/**
 * Descobre o tipo pelo conteúdo, nunca pelo `Content-Type` enviado. Planilhas e documentos do Office compartilham a
 * assinatura do ZIP (formatos novos) ou do OLE (formatos antigos); a extensão só escolhe entre eles depois de a assinatura
 * bater. Retorna `null` para qualquer arquivo fora da lista.
 */
export function detectarTipoComprovante(bytes: Uint8Array, nomeOriginal: string): TipoComprovante | null {
  if (comeca(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (comeca(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (bytes.length >= 12 && comeca(bytes, [0x52, 0x49, 0x46, 0x46]) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  if (comeca(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  const extensao = extensaoDoNome(nomeOriginal);
  if (comeca(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    if (extensao === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    if (extensao === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    return null;
  }
  if (comeca(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    if (extensao === "xls") return "application/vnd.ms-excel";
    if (extensao === "doc") return "application/msword";
    return null;
  }
  // CSV é texto puro, sem assinatura: exige a extensão e rejeita conteúdo binário (byte nulo nos primeiros 4 KB).
  if (extensao === "csv" && bytes.length > 0 && !bytes.subarray(0, 4096).includes(0x00)) return "text/csv";
  return null;
}

/** Nome exibido ao usuário: sem caminho, sem caracteres de controle e com no máximo 200 caracteres. */
export function nomeSeguroDoArquivo(nome: string): string {
  const semCaminho = nome.split(/[\\/]/).pop() ?? "";
  const limpo = semCaminho.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!limpo) return "arquivo";
  return limpo.length <= 200 ? limpo : limpo.slice(0, 200);
}

/** Valida o tamanho informado antes de ler o arquivo inteiro. */
export function validarTamanhoComprovante(tamanho: number): void {
  if (!Number.isFinite(tamanho) || tamanho <= 0) throw new Error("O arquivo está vazio.");
  if (tamanho > LIMITE_ARQUIVO_COMPROVANTE_BYTES) throw new Error("Cada arquivo deve ter no máximo 10 MB.");
}

/** Extrai a mensagem de regra de negócio (RN-009) de um erro do banco; qualquer outro erro vira uma mensagem genérica. */
export function mensagemDeErroComprovante(erro: unknown): string {
  const texto = erro instanceof Error ? erro.message : String(erro);
  const regra = texto.match(/RN-00[479]: ([^`\n]+)/);
  if (regra) return regra[1].trim();
  const conhecida = [
    "O arquivo está vazio.",
    "Cada arquivo deve ter no máximo 10 MB.",
    "Formato não aceito. Envie foto, PDF, planilha ou documento.",
    "Informe o arquivo.",
  ].find((frase) => texto.includes(frase));
  return conhecida ?? "Não foi possível enviar o arquivo. Tente novamente.";
}

export type SituacaoDoEnvio = "para_enviar" | "aguardando" | "devolvida" | "concluida";

/**
 * Situação de um item do colaborador, derivada dos pedidos de conclusão (sem estado novo no banco):
 * concluída/cancelada não volta; pedido pendente é "aguardando conferência"; o último pedido rejeitado, com o item
 * ainda aberto e sem pedido novo, é "devolvida para correção"; o resto é "para enviar".
 */
export function situacaoDoEnvio(
  item: { status: string; ativo?: boolean },
  ultimaSolicitacao: { status: string } | null,
): SituacaoDoEnvio {
  if (item.status === "CONCLUIDO" || item.status === "CANCELADO") return "concluida";
  if (ultimaSolicitacao?.status === "PENDENTE") return "aguardando";
  if (ultimaSolicitacao?.status === "REJEITADA") return "devolvida";
  return "para_enviar";
}

type ItemDoColaborador = {
  status: string;
  ativo: boolean;
  /** O item é do colaborador (responsável direto ou atribuição); só esses entram na situação dele. */
  meu: boolean;
  /** Pedido mais recente do item, de qualquer estado. */
  ultimaSolicitacao: { status: string; comentarioDecisao: string | null } | null;
};

const PRIORIDADE: Record<SituacaoDoEnvio, number> = { devolvida: 0, para_enviar: 1, aguardando: 2, concluida: 3 };

/**
 * Situação da tarefa na lista do colaborador (grupos "Devolvidas", "Para enviar", "Aguardando conferência" e "Concluídas").
 * Se a tarefa é dele, vale o pedido da própria tarefa; se ele só tem subtarefas, vale a mais urgente entre as abertas dele.
 */
export function situacaoDaTarefaDoColaborador(
  tarefa: ItemDoColaborador,
  subtarefas: ItemDoColaborador[],
): { situacao: SituacaoDoEnvio; motivoDevolucao: string | null } {
  if (tarefa.status === "CONCLUIDO" || tarefa.status === "CANCELADO") return { situacao: "concluida", motivoDevolucao: null };
  const candidatos = tarefa.meu
    ? [tarefa]
    : subtarefas.filter((sub) => sub.meu && sub.ativo && sub.status === "EM_ANDAMENTO");
  if (candidatos.length === 0) return { situacao: "concluida", motivoDevolucao: null };
  const avaliados = candidatos.map((item) => ({ item, situacao: situacaoDoEnvio(item, item.ultimaSolicitacao) }));
  avaliados.sort((a, b) => PRIORIDADE[a.situacao] - PRIORIDADE[b.situacao]);
  const primeiro = avaliados[0];
  return {
    situacao: primeiro.situacao,
    motivoDevolucao: primeiro.situacao === "devolvida" ? primeiro.item.ultimaSolicitacao?.comentarioDecisao ?? null : null,
  };
}

/** Texto curto do que o item exige: "2 fotos ou arquivos", "1 foto ou arquivo". */
export function descricaoDaExigencia(quantidade: number | null | undefined): string | null {
  if (!quantidade || quantidade < 1) return null;
  return quantidade === 1 ? "1 foto ou arquivo" : `${quantidade} fotos ou arquivos`;
}

/** Converte o texto "um item por linha" do formulário na lista de instruções (sem linhas vazias, no máximo 20 de 200 caracteres). */
export function lerInstrucoesDoComprovante(texto: string | null | undefined): string[] {
  const linhas = (texto ?? "").split(/\r?\n/).map((linha) => linha.trim()).filter(Boolean);
  if (linhas.length > 20) throw new Error("Informe no máximo 20 itens em \"O que enviar\".");
  if (linhas.some((linha) => linha.length > 200)) throw new Error("Cada item de \"O que enviar\" deve ter no máximo 200 caracteres.");
  return linhas;
}

/** Valida o par exigido/quantidade vindo do formulário. Sem exigência, a quantidade e a lista não valem. */
export function lerExigenciaDoComprovante(exigido: boolean, quantidade: string | null | undefined, instrucoes: string | null | undefined): {
  comprovanteExigido: boolean;
  comprovanteQuantidade: number | null;
  comprovanteInstrucoes: string[];
} {
  if (!exigido) return { comprovanteExigido: false, comprovanteQuantidade: null, comprovanteInstrucoes: [] };
  const numero = Number((quantidade ?? "").trim());
  if (!Number.isInteger(numero) || numero < 1 || numero > MAX_COMPROVANTES_EXIGIDOS) {
    throw new Error(`Informe a quantidade de comprovantes, de 1 a ${MAX_COMPROVANTES_EXIGIDOS}.`);
  }
  return { comprovanteExigido: true, comprovanteQuantidade: numero, comprovanteInstrucoes: lerInstrucoesDoComprovante(instrucoes) };
}

/**
 * Defesa contra requisição de outro site nas rotas que alteram dados: se o navegador informa a origem, ela precisa ser
 * a do próprio servidor. Sem cabeçalho de origem (chamadas do servidor, testes) a requisição segue; o cookie de sessão
 * já é SameSite, e esta conferência cobre o resto.
 */
export function origemConfere(origem: string | null, host: string | null): boolean {
  if (!origem) return true;
  try {
    return !!host && new URL(origem).host === host;
  } catch {
    return false;
  }
}
