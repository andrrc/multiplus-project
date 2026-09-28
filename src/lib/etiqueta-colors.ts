export const CORES_ETIQUETA = [
  { nome: "Azul", fundo: "#DBEAFE", texto: "#1E40AF" },
  { nome: "Verde", fundo: "#DCFCE7", texto: "#166534" },
  { nome: "Âmbar", fundo: "#FEF3C7", texto: "#92400E" },
  { nome: "Roxo", fundo: "#F3E8FF", texto: "#6B21A8" },
  { nome: "Rosa", fundo: "#FCE7F3", texto: "#9D174D" },
  { nome: "Cinza", fundo: "#E2E8F0", texto: "#334155" },
] as const;

export type CorEtiqueta = (typeof CORES_ETIQUETA)[number]["fundo"];
export type EtiquetaSelecionada = { nome: string; cor: string };
