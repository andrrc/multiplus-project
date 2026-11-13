import path from "node:path";
import PDFDocument from "pdfkit";
import { calcularDiasRestantes } from "@/ui/indicador-dias-restantes";
import { formatarDataCadastro, formatarDataHoraBrasilia } from "@/lib/datas";
import { interpretarResponsavel, type ResponsavelFiltro } from "@/lib/filtro-responsavel";
import { numeroCliente } from "@/lib/formatacao";
import {
  listarClientesParaProjeto,
  listarPrazos,
  listarProjetos,
  listarResponsaveisParaFiltro,
  listarSubtarefasPrazos,
  listarTarefasParaFiltro,
  type FiltrosPrazos,
} from "@/lib/projetos-tarefas";
import { buscarLimitesSemaforo } from "@/lib/semaforo";
import { codigoProjeto } from "@/lib/identificadores-hierarquicos";
import { prepararListaProjetos } from "@/lib/lista-projetos";
import { calcularPercentualConclusao } from "@/lib/regras-projetos-tarefas";
import { rotulosSituacao } from "@/lib/situacao-prazo";
import type { ContextoUsuario } from "@/lib/prisma-app";

type TipoLista = "tarefas" | "subtarefas";
type TipoExportacao = TipoLista | "projetos";
type TomPrazo = "normal" | "atrasado" | "hoje" | "neutro";
type Celula = {
  texto: string;
  detalhe?: string;
  negrito?: boolean;
  centralizada?: boolean;
  algarismos?: boolean;
  tom?: TomPrazo;
};
type Linha = Celula[];
type FiltrosExportacao = FiltrosPrazos & { incluirConcluidas: boolean; responsavel?: string | string[] };

const CORES = {
  tinta: "#0B2530",
  tinta2: "#12394A",
  verde: "#0E7A3C",
  cinza: "#5D7079",
  linha: "#DCE6E9",
  azulClaro: "#E8F4FC",
  vermelho: "#9A2A1E",
  ambar: "#B45309",
  branco: "#FFFFFF",
};
const MARGEM = 40;
const FONTES = path.join(process.cwd(), "src", "app", "fonts", "pdf-exportacao");
const LOGO = path.join(process.cwd(), "public", "logo-multiplus.png");

function validarIdParametro(params: URLSearchParams, nome: string): string | undefined {
  const valores = params.getAll(nome);
  if (valores.length > 1) throw new Error(`O filtro ${nome} foi informado mais de uma vez.`);
  const valor = valores[0]?.trim();
  if (!valor) return undefined;
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(valor)) throw new Error(`O filtro ${nome} é inválido.`);
  return valor;
}

function lerFiltros(params: URLSearchParams, tipo: TipoLista): FiltrosExportacao {
  const clienteId = validarIdParametro(params, "cliente");
  const projetoId = validarIdParametro(params, "projeto");
  const tarefaId = validarIdParametro(params, "tarefa");
  const responsaveis = params.getAll("responsavel");
  const responsavel = responsaveis.length > 1 ? responsaveis : responsaveis[0];
  const todos = params.getAll("todos");
  return {
    clienteId,
    projetoId,
    tarefaId,
    responsavel,
    pendentes: tipo === "subtarefas" && !(todos.length === 1 && todos[0] === "1"),
    incluirConcluidas: tipo === "subtarefas" && todos.length === 1 && todos[0] === "1",
  };
}

function labelFiltro(valor: string | undefined, opcoes: Array<{ id: string; nome: string }>, todos: string): string {
  if (!valor) return todos;
  return opcoes.find(opcao => opcao.id === valor)?.nome ?? "Sem correspondência";
}

function labelResponsavel(valor: string | string[] | undefined, opcoes: Array<{ valor: string; nome: string }>): string {
  const filtro: ResponsavelFiltro = interpretarResponsavel(valor);
  if (filtro.tipo === "todos") return "Todos os responsáveis";
  if (filtro.tipo === "sem") return "Sem responsável";
  if (filtro.tipo === "invalido") return "Filtro inválido";
  const chave = `${filtro.tipo}:${filtro.id}`;
  return opcoes.find(opcao => opcao.valor === chave)?.nome ?? "Sem correspondência";
}

function textoFiltros(
  filtros: FiltrosExportacao,
  clientes: Array<{ id: string; razaoSocial: string }>,
  projetos: Array<{ id: string; nome: string }>,
  tarefas: Array<{ id: string; nome: string }>,
  responsaveis: Array<{ valor: string; nome: string }>,
  tipo: TipoLista,
) {
  const partes = [
    `Cliente: ${labelFiltro(filtros.clienteId, clientes.map(item => ({ id: item.id, nome: item.razaoSocial })), "Todos")}`,
    `Projeto: ${labelFiltro(filtros.projetoId, projetos, "Todos")}`,
    `Tarefa: ${labelFiltro(filtros.tarefaId, tarefas, "Todas")}`,
    `Responsável: ${labelResponsavel(filtros.responsavel, responsaveis)}`,
  ];
  if (tipo === "subtarefas") partes.push(`Situação: ${filtros.incluirConcluidas ? "Todas" : "Pendentes"}`);
  return partes.join("  ·  ");
}

function indicadorPrazo(prazo: Date | null, status: string, limites: { diasAmareloAte: number }): Celula {
  if (status === "CONCLUIDO") return { texto: "Concluído", tom: "normal", detalhe: prazo ? formatarDataCadastro(prazo) : undefined, algarismos: !!prazo };
  if (status === "CANCELADO") return { texto: "Cancelado", tom: "neutro", detalhe: prazo ? formatarDataCadastro(prazo) : undefined, algarismos: !!prazo };
  if (!prazo) return { texto: "Sem prazo", tom: "neutro" };

  const dias = calcularDiasRestantes(prazo);
  const texto = dias < 0
    ? `Atrasado ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia" : "dias"}`
    : dias === 0
      ? "Vence hoje"
      : `${dias} ${dias === 1 ? "dia" : "dias"}`;
  return {
    texto,
    tom: dias < 0 ? "atrasado" : dias <= limites.diasAmareloAte ? "hoje" : "normal",
    detalhe: formatarDataCadastro(prazo),
    algarismos: true,
  };
}

const STATUS_TAREFA: Record<string, string> = {
  A_INICIAR: "A iniciar",
  EM_ANDAMENTO: "Em andamento",
  AGUARDANDO_DOCUMENTO_CLIENTE: "Aguardando documento do cliente",
  VISITA_REUNIAO_AGENDADA: "Visita/reunião agendada",
  PROTOCOLADO: "Protocolado",
  SOB_ANALISE_ORGAO_AMBIENTAL: "Sob análise do órgão",
  COM_EXIGENCIA_A_CUMPRIR: "Com exigência a cumprir",
  CONCLUIDO: "Concluída",
  CANCELADO: "Cancelada",
};

const STATUS_PROJETO: Record<string, string> = {
  A_INICIAR: "A iniciar",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

const STATUS_SUBTAREFA: Record<string, string> = {
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluída",
  CANCELADO: "Cancelada",
};

function fontes(documento: PDFKit.PDFDocument) {
  documento.registerFont("Raleway", path.join(FONTES, "Raleway-Regular.ttf"));
  documento.registerFont("Raleway-Bold", path.join(FONTES, "Raleway-Bold.ttf"));
  documento.registerFont("Montserrat", path.join(FONTES, "Montserrat-Regular.ttf"));
  documento.registerFont("Montserrat-Bold", path.join(FONTES, "Montserrat-Bold.ttf"));
  documento.registerFont("DroidSerif", path.join(process.cwd(), "src", "app", "fonts", "droid-serif", "DroidSerif-Regular.ttf"));
  documento.registerFont("DroidSerif-Bold", path.join(process.cwd(), "src", "app", "fonts", "droid-serif", "DroidSerif-Bold.ttf"));
}

function largurasColunas(tipo: TipoLista, progresso: boolean) {
  if (tipo === "tarefas" && progresso) return [118, 112, 101, 40, 100, 62, 120, 109];
  if (tipo === "tarefas") return [130, 129, 118, 40, 120, 115, 110];
  return [100, 95, 101, 106, 40, 100, 115, 105];
}

function cabecalhoColunas(tipo: TipoLista, progresso: boolean) {
  if (tipo === "tarefas") return ["Tarefa", "Projeto", "Cliente", "ID", "Responsável", ...(progresso ? ["Subtarefas"] : []), "Prazo", "Status"];
  return ["Subtarefa", "Tarefa", "Projeto", "Cliente", "ID", "Responsável", "Prazo", "Status"];
}

function linhaTarefa(tarefa: Awaited<ReturnType<typeof listarPrazos>>[number], limites: { diasAmareloAte: number }, progresso: boolean): Linha {
  const qtdSemAtribuicao = tarefa._count.subtarefas;
  const linha: Linha = [
    {
      texto: tarefa.nome,
      negrito: true,
      ...(qtdSemAtribuicao > 0 ? { detalhe: `${qtdSemAtribuicao} ${qtdSemAtribuicao === 1 ? "subtarefa aguarda" : "subtarefas aguardam"} atribuição` } : {}),
    },
    { texto: tarefa.projeto.nome },
    { texto: tarefa.projeto.cliente.razaoSocial },
    { texto: numeroCliente(tarefa.projeto.cliente.numeroIdentificacao), centralizada: true, algarismos: true },
    { texto: tarefa.responsavel?.nome ?? tarefa.responsavelUsuario?.nome ?? "—" },
  ];
  if (progresso) {
    const total = tarefa.progressoSubtarefas?.total ?? 0;
    const concluidas = tarefa.progressoSubtarefas?.concluidas ?? 0;
    linha.push({ texto: `${concluidas}/${total}`, centralizada: true, algarismos: true });
  }
  linha.push(indicadorPrazo(tarefa.prazo, tarefa.status, limites));
  linha.push({ texto: STATUS_TAREFA[tarefa.status] ?? tarefa.status });
  return linha;
}

function linhaSubtarefa(subtarefa: Awaited<ReturnType<typeof listarSubtarefasPrazos>>[number], limites: { diasAmareloAte: number }): Linha {
  return [
    { texto: subtarefa.titulo, negrito: true },
    { texto: subtarefa.tarefa.nome },
    { texto: subtarefa.tarefa.projeto.nome },
    { texto: subtarefa.tarefa.projeto.cliente.razaoSocial },
    { texto: numeroCliente(subtarefa.tarefa.projeto.cliente.numeroIdentificacao), centralizada: true, algarismos: true },
    { texto: subtarefa.atribuidoA?.nome ?? subtarefa.atribuidoAUsuario?.nome ?? "—" },
    indicadorPrazo(subtarefa.prazo, subtarefa.status, limites),
    { texto: STATUS_SUBTAREFA[subtarefa.status] ?? subtarefa.status },
  ];
}

function alturaTexto(doc: PDFKit.PDFDocument, texto: string, largura: number, fonte: string, tamanho: number) {
  doc.font(fonte).fontSize(tamanho);
  return doc.heightOfString(texto || "—", { width: largura, lineGap: 1 });
}

function desenharTextoComAlgarismos(doc: PDFKit.PDFDocument, texto: string, x: number, y: number, largura: number, tamanho: number, cor: string, centralizado = false) {
  const partes = texto.match(/\d+|\D+/g) ?? [texto];
  const partesMedidas = partes.map(parte => {
    const fonte = /^\d+$/.test(parte) ? "DroidSerif" : "Montserrat";
    doc.font(fonte).fontSize(tamanho);
    return { parte, fonte, largura: doc.widthOfString(parte) };
  });
  const total = partesMedidas.reduce((soma, parte) => soma + parte.largura, 0);
  let cursor = centralizado ? x + Math.max(0, (largura - total) / 2) : x;
  for (const parte of partesMedidas) {
    doc.font(parte.fonte).fontSize(tamanho).fillColor(cor).text(parte.parte, cursor, y, { lineBreak: false });
    cursor += parte.largura;
  }
}

function desenharLinha(doc: PDFKit.PDFDocument, linha: Linha, larguras: number[], x: number, y: number, altura: number) {
  let cursorX = x;
  for (let indice = 0; indice < linha.length; indice++) {
    const celula = linha[indice];
    const largura = larguras[indice];
    const recuo = 6;
    const textoX = cursorX + recuo;
    const textoW = largura - recuo * 2;
    const fonte = celula.negrito ? "Montserrat-Bold" : "Montserrat";
    const fonteTamanho = 7.8;
    const cor = celula.tom === "atrasado" ? CORES.vermelho : celula.tom === "hoje" ? CORES.ambar : celula.tom === "neutro" ? CORES.cinza : CORES.tinta;
    if (celula.algarismos) {
      desenharTextoComAlgarismos(doc, celula.texto, textoX, y + 5, textoW, fonteTamanho, cor, celula.centralizada);
    } else {
      doc.font(fonte).fontSize(fonteTamanho).fillColor(cor).text(celula.texto, textoX, y + 5, {
        width: textoW,
        height: Math.max(8, altura - 10),
        lineGap: 1,
        ellipsis: true,
        align: celula.centralizada ? "center" : undefined,
      });
    }
    if (celula.detalhe) {
      const textoPrincipalAltura = alturaTexto(doc, celula.texto, textoW, fonte, fonteTamanho);
      const detalheY = y + 5 + Math.min(textoPrincipalAltura, altura - 20) + 2;
      const detalheCor = celula.tom === "atrasado" ? CORES.vermelho : celula.tom === "hoje" ? CORES.ambar : celula.detalhe.endsWith("atribuição") ? CORES.ambar : CORES.cinza;
      if (celula.algarismos && /^\d{2}\/\d{2}\/\d{4}$/.test(celula.detalhe)) {
        doc.font("DroidSerif").fontSize(6.8).fillColor(CORES.cinza).text(celula.detalhe, textoX, detalheY, { width: textoW, lineBreak: false });
      } else {
        doc.font(celula.detalhe.endsWith("atribuição") ? "Montserrat" : "Montserrat").fontSize(6.6).fillColor(detalheCor).text(celula.detalhe, textoX, detalheY, {
          width: textoW,
          height: Math.max(7, altura - (detalheY - y) - 3),
          lineGap: 1,
          ellipsis: true,
          align: celula.centralizada ? "center" : "left",
        });
      }
    }
    cursorX += largura;
  }
}

function desenharCabecalhoPagina(
  doc: PDFKit.PDFDocument,
  titulo: string,
  contagem: string,
  filtros: string,
  colunas: string[],
  larguras: number[],
  continuacao: boolean,
) {
  const larguraPagina = doc.page.width;
  doc.rect(0, 0, larguraPagina, 66).fill(CORES.tinta);
  doc.image(LOGO, MARGEM, 10, { fit: [166, 45], valign: "center" });
  doc.rect(0, 66, larguraPagina, 4).fill("#1EBD1F");

  doc.font("Raleway-Bold").fontSize(20).fillColor(CORES.tinta).text(titulo, MARGEM, 82, { lineBreak: false });
  const subtitulo = continuacao ? "Continuação da listagem · filtros mantidos" : "Compromissos organizados conforme os filtros selecionados";
  doc.font("Montserrat").fontSize(8.2).fillColor(CORES.cinza).text(subtitulo, MARGEM, 109, { lineBreak: false });
  doc.font("Raleway-Bold").fontSize(9).fillColor(CORES.tinta).text(contagem, MARGEM, 88, { width: larguraPagina - MARGEM * 2, align: "right", lineBreak: false });

  const filtroY = 128;
  const filtroLargura = larguraPagina - MARGEM * 2;
  const filtroTextoAltura = Math.min(26, alturaTexto(doc, filtros, filtroLargura - 26, "Montserrat", 8.1));
  const filtroAltura = Math.max(42, 27 + filtroTextoAltura);
  doc.roundedRect(MARGEM, filtroY, filtroLargura, filtroAltura, 4).fill(CORES.azulClaro);
  doc.font("Raleway-Bold").fontSize(7).fillColor(CORES.tinta2).text("FILTROS APLICADOS", MARGEM + 13, filtroY + 7, { lineBreak: false });
  doc.font("Montserrat").fontSize(8.1).fillColor(CORES.tinta).text(filtros, MARGEM + 13, filtroY + 19, {
    width: filtroLargura - 26,
    height: filtroAltura - 22,
    lineGap: 1,
    ellipsis: true,
  });

  const tabelaY = filtroY + filtroAltura + 14;
  const alturaCabecalho = 25;
  const tabelaLargura = larguras.reduce((soma, valor) => soma + valor, 0);
  doc.roundedRect(MARGEM, tabelaY, tabelaLargura, alturaCabecalho, 3).fill(CORES.azulClaro);
  let x = MARGEM;
  for (let indice = 0; indice < colunas.length; indice++) {
    doc.font("Raleway-Bold").fontSize(7).fillColor(CORES.tinta).text(colunas[indice], x + 6, tabelaY + 8, {
      width: larguras[indice] - 12,
      lineBreak: false,
      align: indice === 3 ? "center" : "left",
      ellipsis: true,
    });
    x += larguras[indice];
  }
  doc.strokeColor(CORES.linha).lineWidth(0.6).moveTo(MARGEM, tabelaY + alturaCabecalho).lineTo(MARGEM + tabelaLargura, tabelaY + alturaCabecalho).stroke();
  return tabelaY + alturaCabecalho;
}

function desenharRodape(doc: PDFKit.PDFDocument, pagina: number, total: number, instante: Date) {
  const altura = doc.page.height;
  const largura = doc.page.width;
  doc.strokeColor(CORES.linha).lineWidth(0.7).moveTo(MARGEM, altura - 35).lineTo(largura - MARGEM, altura - 35).stroke();
  doc.font("Montserrat").fontSize(7).fillColor(CORES.cinza).text(`Prévia oficial · Gerado em ${formatarDataHoraBrasilia(instante)} (Brasília)`, MARGEM, altura - 24, { lineBreak: false });
  const rotulo = `Página ${pagina} de ${total}`;
  desenharTextoComAlgarismos(doc, rotulo, largura - MARGEM - 105, altura - 24, 105, 7, CORES.cinza, true);
}

function gerarBufferPdf(
  titulo: string,
  contagem: string,
  resumoFiltros: string,
  colunas: string[],
  larguras: number[],
  linhas: Linha[],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const documento = new PDFDocument({ size: "A4", layout: "landscape", margin: 0, bufferPages: true, compress: true });
    fontes(documento);
    const partes: Buffer[] = [];
    documento.on("data", parte => partes.push(Buffer.from(parte)));
    documento.on("error", reject);
    documento.on("end", () => resolve(Buffer.concat(partes)));

    let y = 0;
    const iniciarPagina = (continuacao: boolean) => {
      documento.addPage({ size: "A4", layout: "landscape", margin: 0 });
      y = desenharCabecalhoPagina(documento, titulo, contagem, resumoFiltros, colunas, larguras, continuacao) + 2;
    };
    iniciarPagina(false);

    if (linhas.length === 0) {
      const larguraPagina = documento.page.width;
      documento.font("Montserrat").fontSize(10).fillColor(CORES.cinza).text("Nenhum item encontrado", MARGEM, y + 28, {
        width: larguraPagina - MARGEM * 2,
        align: "center",
      });
    } else {
      const larguraUtil = larguras.map(largura => largura - 12);
      const limiteY = documento.page.height - 52;
      for (const linha of linhas) {
        const alturas = linha.map((celula, indice) => {
          const fonte = celula.negrito ? "Montserrat-Bold" : "Montserrat";
          const tamanho = 7.8;
          let altura = alturaTexto(documento, celula.texto, larguraUtil[indice], fonte, tamanho);
          if (celula.detalhe) altura += 8;
          return altura;
        });
        const alturaLinha = Math.max(27, Math.min(100, Math.max(...alturas) + 10));
        if (y + alturaLinha > limiteY) {
          iniciarPagina(true);
        }
        desenharLinha(documento, linha, larguras, MARGEM, y, alturaLinha);
        y += alturaLinha;
        documento.strokeColor(CORES.linha).lineWidth(0.55).moveTo(MARGEM, y).lineTo(MARGEM + larguras.reduce((soma, valor) => soma + valor, 0), y).stroke();
      }
    }

    const intervalo = documento.bufferedPageRange();
    const instanteGeracao = new Date();
    for (let indice = 0; indice < intervalo.count; indice++) {
      documento.switchToPage(intervalo.start + indice);
      desenharRodape(documento, indice + 1, intervalo.count, instanteGeracao);
    }
    documento.end();
  });
}

const COLUNAS_PROJETOS = ["Projeto", "Cliente", "Proposta", "ID", "Progresso", "Prazo", "Status"];
const LARGURAS_PROJETOS = [170, 140, 70, 78, 70, 120, 114];

function valorUnico(params: URLSearchParams, nome: string): string | undefined {
  const valores = params.getAll(nome);
  if (valores.length > 1) throw new Error(`O filtro ${nome} foi informado mais de uma vez.`);
  return valores[0]?.trim() || undefined;
}

/** Lista de Projetos em PDF, com os mesmos filtros da tela (cliente, busca, situação do prazo e desativados). */
async function gerarExportacaoProjetosPdf(ctx: ContextoUsuario, params: URLSearchParams) {
  const clienteId = validarIdParametro(params, "cliente");
  const busca = valorUnico(params, "busca");
  if (busca && busca.length > 120) throw new Error("O filtro busca é inválido.");
  const desativados = valorUnico(params, "desativados") === "1";
  const [projetos, clientes, limites] = await Promise.all([
    listarProjetos(ctx, desativados, busca, clienteId),
    listarClientesParaProjeto(ctx),
    buscarLimitesSemaforo(ctx),
  ]);
  const { situacaoFiltro, visiveis } = prepararListaProjetos(projetos, limites, valorUnico(params, "situacao"));
  const rotuloSituacao = rotulosSituacao(limites.diasAmareloAte).find(([valor]) => valor === situacaoFiltro)?.[1] ?? "Todos";
  const resumo = [
    `Cliente: ${labelFiltro(clienteId, clientes.map(item => ({ id: item.id, nome: item.razaoSocial })), "Todos")}`,
    `Busca: ${busca ? `"${busca}"` : "Nenhuma"}`,
    `Situação do prazo: ${rotuloSituacao}`,
    `Desativados: ${desativados ? "Incluídos" : "Não incluídos"}`,
  ].join("  ·  ");

  const linhas: Linha[] = visiveis.map(({ projeto: p }) => {
    const conclusao = calcularPercentualConclusao(p.tarefas);
    return [
      { texto: p.nome, negrito: true },
      { texto: p.cliente.razaoSocial },
      { texto: p.numeroProposta ?? "—", algarismos: !!p.numeroProposta },
      { texto: codigoProjeto(p.cliente.numeroIdentificacao, p.numeroLocal), centralizada: true, algarismos: true },
      { texto: conclusao.total === 0 ? "—" : `${conclusao.concluidas}/${conclusao.total}`, centralizada: true, algarismos: conclusao.total > 0 },
      p.ativo
        ? indicadorPrazo(p.dataPrevistaConclusao, p.status, limites)
        : { texto: "—", tom: "neutro", detalhe: p.dataPrevistaConclusao ? formatarDataCadastro(p.dataPrevistaConclusao) : undefined, algarismos: !!p.dataPrevistaConclusao },
      { texto: p.ativo ? STATUS_PROJETO[p.status] ?? p.status : "Desativado" },
    ];
  });
  return gerarBufferPdf("Projetos", `${linhas.length} ${linhas.length === 1 ? "projeto" : "projetos"}`, resumo, COLUNAS_PROJETOS, LARGURAS_PROJETOS, linhas);
}

export async function gerarExportacaoTarefasPdf(ctx: ContextoUsuario, params: URLSearchParams, tipo: TipoExportacao) {
  if (ctx.perfil !== "ADMIN") throw new Error("Ação restrita ao Administrador.");
  if (tipo === "projetos") return gerarExportacaoProjetosPdf(ctx, params);
  const filtros = lerFiltros(params, tipo);
  const filtrosConsulta: FiltrosPrazos = {
    clienteId: filtros.clienteId,
    projetoId: filtros.projetoId,
    tarefaId: filtros.tarefaId,
    responsavel: filtros.responsavel,
    pendentes: filtros.pendentes,
  };
  const baseResponsaveis: FiltrosPrazos = { ...filtrosConsulta, responsavel: undefined };
  const [clientes, projetos, tarefasFiltro, responsaveis, limites] = await Promise.all([
    listarClientesParaProjeto(ctx),
    listarProjetos(ctx),
    listarTarefasParaFiltro(ctx),
    listarResponsaveisParaFiltro(ctx, tipo, baseResponsaveis),
    buscarLimitesSemaforo(ctx),
  ]);
  const resumo = textoFiltros(filtros, clientes, projetos.map(item => ({ id: item.id, nome: item.nome })), tarefasFiltro.map(item => ({ id: item.id, nome: `${item.projeto.nome} · ${item.nome}` })), responsaveis, tipo);

  if (tipo === "tarefas") {
    const tipoResponsavel = interpretarResponsavel(filtros.responsavel).tipo;
    const mostrarProgresso = tipoResponsavel !== "todos" && tipoResponsavel !== "invalido";
    const tarefas = await listarPrazos(ctx, { ...filtrosConsulta, pendentes: false }, mostrarProgresso);
    const colunas = cabecalhoColunas(tipo, mostrarProgresso);
    const linhas = tarefas.map(tarefa => linhaTarefa(tarefa, limites, mostrarProgresso));
    return gerarBufferPdf("Tarefas", `${tarefas.length} ${tarefas.length === 1 ? "tarefa" : "tarefas"}`, resumo, colunas, largurasColunas(tipo, mostrarProgresso), linhas);
  }

  const subtarefas = await listarSubtarefasPrazos(ctx, filtrosConsulta);
  const colunas = cabecalhoColunas(tipo, false);
  const linhas = subtarefas.map(subtarefa => linhaSubtarefa(subtarefa, limites));
  return gerarBufferPdf("Subtarefas", `${subtarefas.length} ${subtarefas.length === 1 ? "subtarefa" : "subtarefas"}`, resumo, colunas, largurasColunas(tipo, false), linhas);
}
