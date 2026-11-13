import type { ReactNode } from "react";
import Link from "next/link";

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

/** Trilha de navegação no topo das páginas de detalhe: "Projetos / Cliente / Projeto". */
export function Trilha({ itens }: { itens: Array<{ rotulo: string; href?: string }> }) {
  return (
    <nav aria-label="Caminho" className="mb-2.5 flex flex-wrap items-center gap-1.5 text-[13px] text-cinza">
      {itens.map((item, indice) => (
        <span key={`${item.rotulo}-${indice}`} className="flex min-w-0 items-center gap-1.5">
          {indice > 0 && <span aria-hidden="true">/</span>}
          {item.href ? <Link href={item.href} className="truncate hover:text-ink">{item.rotulo}</Link> : <span className="truncate">{item.rotulo}</span>}
        </span>
      ))}
    </nav>
  );
}

/** Faixa única com os números principais da página (prazo, progresso, pendências, valor). */
export function FaixaResumo({ rotulo, colunas, children }: { rotulo: string; colunas: 3 | 4 | 5; children: ReactNode }) {
  const grade = colunas === 3 ? "lg:grid-cols-3" : colunas === 4 ? "lg:grid-cols-4" : "lg:grid-cols-5";
  return (
    <section aria-label={rotulo} className={`mb-6 grid grid-cols-2 rounded-cartao border border-linha bg-branco ${grade}`}>
      {children}
    </section>
  );
}

export function CelulaResumo({ rotulo, children, detalhe }: { rotulo: string; children: ReactNode; detalhe?: ReactNode }) {
  return (
    <div className="min-w-0 border-l border-linha px-5 py-4 first:border-l-0 max-lg:odd:border-l-0 max-lg:[&:nth-child(n+3)]:border-t">
      <p className="text-[12.5px] font-medium text-cinza">{rotulo}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-lg font-semibold tabular-nums">{children}</div>
      {detalhe && <p className="mt-1 text-[12.5px] tabular-nums text-cinza">{detalhe}</p>}
    </div>
  );
}

/** Círculo com as iniciais do nome, usado em comentários e responsáveis. */
export function Avatar({ nome, tamanho = 32 }: { nome: string; tamanho?: number }) {
  const partes = nome.trim().split(/\s+/);
  const iniciais = ((partes[0]?.[0] ?? "?") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
  return (
    <span
      aria-hidden="true"
      style={{ width: tamanho, height: tamanho }}
      className="flex shrink-0 items-center justify-center rounded-full bg-tinta2 text-xs font-semibold text-branco"
    >
      {iniciais}
    </span>
  );
}
