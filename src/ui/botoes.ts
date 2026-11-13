/**
 * Classes dos botões dos protótipos (`telas-novas/`). Servem tanto para `<button>` quanto
 * para `<Link>` com aparência de botão. Altura de 40 px no desktop; no celular a área de
 * toque é de 44 px.
 */
const BASE =
  "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-controle border px-4 font-[family-name:var(--font-interface)] text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 md:h-10";

/** Ação principal da tela: fundo azul-escuro. */
export const botaoPrimario = `${BASE} border-transparent bg-tinta text-branco hover:bg-tinta2`;

/** Ação secundária: fundo branco com borda. */
export const botaoSecundario = `${BASE} border-linha-forte bg-branco text-ink hover:bg-papel`;

/** Ação discreta, sem borda (voltar, cancelar). */
export const botaoDiscreto = `${BASE} border-transparent bg-transparent text-cinza hover:bg-papel hover:text-ink`;

/** Ação destrutiva: texto e borda vermelhos, fundo claro ao passar o mouse. */
export const botaoPerigo = `${BASE} border-critico bg-branco text-critico hover:bg-critico-cl`;
