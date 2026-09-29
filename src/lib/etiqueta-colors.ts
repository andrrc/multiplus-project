export const CORES_ETIQUETA = [
  { nome: "Azul", fundo: "#BFDBFE", texto: "#1E3A8A", amostra: "#2563EB" },
  { nome: "Ciano", fundo: "#A5F3FC", texto: "#164E63", amostra: "#0891B2" },
  { nome: "Verde", fundo: "#BBF7D0", texto: "#14532D", amostra: "#16A34A" },
  { nome: "Lima", fundo: "#D9F99D", texto: "#365314", amostra: "#65A30D" },
  { nome: "Amarelo", fundo: "#FEF08A", texto: "#713F12", amostra: "#EAB308" },
  { nome: "Âmbar", fundo: "#FCD34D", texto: "#78350F", amostra: "#D97706" },
  { nome: "Laranja", fundo: "#FDBA74", texto: "#7C2D12", amostra: "#EA580C" },
  { nome: "Vermelho", fundo: "#FCA5A5", texto: "#7F1D1D", amostra: "#DC2626" },
  { nome: "Rosa", fundo: "#FBCFE8", texto: "#831843", amostra: "#DB2777" },
  { nome: "Roxo", fundo: "#E9D5FF", texto: "#581C87", amostra: "#9333EA" },
  { nome: "Índigo", fundo: "#C7D2FE", texto: "#312E81", amostra: "#4F46E5" },
  { nome: "Cinza", fundo: "#CBD5E1", texto: "#1E293B", amostra: "#475569" },
] as const;

export type CorEtiqueta = (typeof CORES_ETIQUETA)[number]["fundo"];
export type EtiquetaSelecionada = { nome: string; cor: string };
