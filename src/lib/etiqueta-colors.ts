export const CORES_ETIQUETA = [
  { nome: "Azul", fundo: "#DBEAFE", texto: "#1E40AF" },
  { nome: "Ciano", fundo: "#CFFAFE", texto: "#155E75" },
  { nome: "Verde", fundo: "#DCFCE7", texto: "#166534" },
  { nome: "Lima", fundo: "#ECFCCB", texto: "#3F6212" },
  { nome: "Amarelo", fundo: "#FEF9C3", texto: "#854D0E" },
  { nome: "Âmbar", fundo: "#FEF3C7", texto: "#92400E" },
  { nome: "Laranja", fundo: "#FFEDD5", texto: "#9A3412" },
  { nome: "Vermelho", fundo: "#FEE2E2", texto: "#991B1B" },
  { nome: "Rosa", fundo: "#FCE7F3", texto: "#9D174D" },
  { nome: "Roxo", fundo: "#F3E8FF", texto: "#6B21A8" },
  { nome: "Índigo", fundo: "#E0E7FF", texto: "#3730A3" },
  { nome: "Cinza", fundo: "#E2E8F0", texto: "#334155" },
] as const;

export type CorEtiqueta = (typeof CORES_ETIQUETA)[number]["fundo"];
export type EtiquetaSelecionada = { nome: string; cor: string };
