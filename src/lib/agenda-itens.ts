/**
 * Classificação dos itens da agenda para as cores do calendário (protótipo 09-agenda):
 * atrasado em vermelho, próximo do prazo em âmbar, no prazo em verde, visita ou reunião em
 * roxo, próxima ocorrência de tarefa recorrente tracejada e item fechado esmaecido.
 */
export type ClasseItemAgenda = "atrasado" | "proximo" | "prazo" | "visita" | "futura" | "concluida";

export function classeDoItemAgenda(
  item: { status: string; projetada: boolean },
  diasRestantes: number,
  diasAmareloAte: number,
): ClasseItemAgenda {
  // A ocorrência futura ainda não existe como tarefa, então não tem situação de prazo.
  if (item.projetada) return "futura";
  if (item.status === "CONCLUIDO" || item.status === "CANCELADO") return "concluida";
  // Visitas e reuniões têm cor própria, mesmo quando a data já passou.
  if (item.status === "VISITA_REUNIAO_AGENDADA") return "visita";
  if (diasRestantes < 0) return "atrasado";
  if (diasRestantes <= diasAmareloAte) return "proximo";
  return "prazo";
}

/** Classes de cor de cada situação, pelos tokens da identidade visual. */
export const COR_ITEM_AGENDA: Record<ClasseItemAgenda, string> = {
  atrasado: "bg-critico-cl text-critico",
  proximo: "bg-ambar-cl text-ambar",
  prazo: "bg-verde-cl text-verde-esc",
  visita: "bg-visita-cl text-visita",
  futura: "border border-dashed border-linha-forte bg-branco text-cinza",
  concluida: "bg-papel text-faint line-through",
};

/** Cor da barra lateral do item no painel do dia. */
export const COR_BARRA_AGENDA: Record<ClasseItemAgenda, string> = {
  atrasado: "bg-critico",
  proximo: "bg-ponto-espera",
  prazo: "bg-verde",
  visita: "bg-ponto-visita",
  futura: "bg-linha-forte",
  concluida: "bg-linha-forte",
};

export const ROTULO_CLASSE_AGENDA: Record<ClasseItemAgenda, string> = {
  atrasado: "Atrasado",
  proximo: "Vence em breve",
  prazo: "No prazo",
  visita: "Visita ou reunião",
  futura: "Próxima ocorrência recorrente",
  concluida: "Concluído",
};
