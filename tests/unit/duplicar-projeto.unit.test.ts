import { expect, it, vi } from "vitest";
import { prepararCopiaDoProjeto } from "@/lib/duplicar-projeto";

vi.mock("@/lib/prisma-app", () => ({ comContextoDeUsuario: vi.fn() }));

it("seleciona somente os campos aprovados e registra o autor da cópia", () => {
  const prazo = new Date("2030-04-08T00:00:00Z");
  const comprovante = {
    comprovanteExigido: true,
    comprovanteQuantidade: 1,
    comprovanteInstrucoes: ["Foto da placa"],
  };
  const origem = {
    clienteId: "cliente",
    nome: "Licenciamento",
    descricao: "Descrição do projeto",
    dataInicio: prazo,
    numeroProposta: "12/2030",
    valorContratado: 500,
    documentos: ["Documento"],
    status: "CONCLUIDO",
    tarefas: [{
      ...comprovante,
      nome: "Vistoria",
      descricao: null,
      diasAntecedencia: 3,
      colaboradorPodeCriarSubtarefas: true,
      prazo,
      prazoOriginal: prazo,
      periodicidade: "SEMANAL",
      diaSemana: 1,
      serieId: "série",
      responsavelUsuarioId: "colaborador",
      criadoPorId: "autor-original",
      arquivosComprovante: ["foto"],
      solicitacoesConclusao: ["pedido"],
      comentarios: ["comentário"],
      subtarefas: [{
        ...comprovante,
        titulo: "Fotografar",
        descricao: "Fachada",
        etiquetas: ["Visita"],
        prazo,
        status: "CONCLUIDO",
        atribuidoAId: "pessoa",
      }],
    }],
  };

  expect(prepararCopiaDoProjeto(origem, "administrador")).toStrictEqual({
    projeto: { clienteId: "cliente", nome: "Cópia de Licenciamento", descricao: "Descrição do projeto" },
    tarefas: [{
      dados: {
        ...comprovante,
        nome: "Vistoria",
        descricao: null,
        diasAntecedencia: 3,
        colaboradorPodeCriarSubtarefas: true,
        criadoPorId: "administrador",
      },
      subtarefas: [{
        ...comprovante,
        titulo: "Fotografar",
        descricao: "Fachada",
        etiquetas: ["Visita"],
        criadoPorId: "administrador",
      }],
    }],
  });
});
