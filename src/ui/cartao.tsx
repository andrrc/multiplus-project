import type { ReactNode } from "react";

/**
 * Cartões das páginas de detalhe (ficha do cliente, projeto, tarefa), no padrão dos
 * protótipos: fundo branco, borda de 1 px, raio de 8 px e cabeçalho com título de 16 px.
 */
const FONTE = "font-[family-name:var(--font-interface)]";

export function Cartao({
  titulo,
  acao,
  children,
  semMargem,
  id,
}: {
  titulo?: ReactNode;
  /** Controles à direita do título (botões, abas, contadores). */
  acao?: ReactNode;
  children: ReactNode;
  /** Sem espaçamento interno, para tabelas e listas que vão de ponta a ponta. */
  semMargem?: boolean;
  id?: string;
}) {
  return (
    <section id={id} className="min-w-0 rounded-cartao border border-linha bg-branco">
      {(titulo || acao) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-linha px-5 py-4">
          <h2 className={`flex items-center gap-2.5 text-base font-semibold ${FONTE}`}>{titulo}</h2>
          {acao}
        </header>
      )}
      <div className={semMargem ? "" : "px-5 py-4"}>{children}</div>
    </section>
  );
}

/** Coluna lateral: um cartão só, dividido em blocos separados por linha. */
export function CartaoLateral({ children }: { children: ReactNode }) {
  return <aside className="min-w-0 rounded-cartao border border-linha bg-branco">{children}</aside>;
}

export function BlocoLateral({ titulo, acao, children }: { titulo: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <div className="border-t border-linha px-5 py-4 first:border-t-0">
      <h3 className={`mb-2.5 flex items-center justify-between gap-3 text-[13px] font-semibold ${FONTE}`}>
        {titulo}
        {acao}
      </h3>
      {children}
    </div>
  );
}

/** Pares rótulo/valor da coluna lateral: rótulo discreto à esquerda, valor alinhado à direita. */
export function ListaChaveValor({ itens }: { itens: Array<{ rotulo: string; valor: ReactNode }> }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13px]">
      {itens.map((item) => (
        <div key={item.rotulo} className="contents">
          <dt className="text-cinza">{item.rotulo}</dt>
          <dd className="min-w-0 break-words text-right tabular-nums">{item.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Texto âmbar para dado ausente: "Não informado", nunca um traço nem um selo vazio. */
export function NaoInformado({ children = "Não informado" }: { children?: ReactNode }) {
  return <span className="text-ambar">{children}</span>;
}
