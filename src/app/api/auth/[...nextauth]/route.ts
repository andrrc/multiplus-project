import { handlers } from "@/server/auth";

// Entrega ao Next os handlers GET e POST que o Auth.js configurou para a rota dinâmica.
export const { GET, POST } = handlers;
