/**
 * RF-032 / Tela A4 — política de senha, em um lugar só.
 *
 * A mesma lista alimenta a validação do servidor e a marcação de "o que já foi atendido"
 * na tela: se fossem duas listas, a tela acabaria aceitando visualmente uma senha que o
 * servidor recusa. A validação que vale é sempre a do servidor — a da tela é conveniência.
 */
export type RequisitoSenha = {
  id: string;
  descricao: string;
  atende: (senha: string) => boolean;
};

export const REQUISITOS_SENHA: RequisitoSenha[] = [
  {
    id: "tamanho",
    descricao: "Pelo menos 8 caracteres",
    atende: (senha) => senha.length >= 8,
  },
  {
    id: "letra",
    descricao: "Pelo menos uma letra",
    atende: (senha) => /\p{L}/u.test(senha),
  },
  {
    id: "numero",
    descricao: "Pelo menos um número",
    atende: (senha) => /\d/.test(senha),
  },
];

/** Estado de cada requisito, para a tela marcar o que já foi atendido enquanto se digita. */
export function avaliarSenha(senha: string): { id: string; descricao: string; ok: boolean }[] {
  return REQUISITOS_SENHA.map(({ id, descricao, atende }) => ({
    id,
    descricao,
    ok: atende(senha),
  }));
}

/** `null` quando a senha atende a todos os requisitos; senão, a mensagem do primeiro que falta. */
export function validarPoliticaSenha(senha: string): string | null {
  const faltando = REQUISITOS_SENHA.filter((r) => !r.atende(senha));
  if (faltando.length === 0) return null;
  return `A senha precisa atender a: ${faltando.map((r) => r.descricao.toLowerCase()).join("; ")}.`;
}
