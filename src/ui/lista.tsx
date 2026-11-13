import type { ReactNode } from "react";
import Link from "next/link";
import { IndicadorSemaforoProjeto } from "@/ui/indicador-dias-restantes";
import type { LimitesSemaforo } from "@/lib/semaforo";

/**
 * Peças das listas de Projetos, Tarefas e Subtarefas (protótipo 03-listas-projetos-tarefas):
 * no desktop é uma tabela dentro de um cartão; no celular cada linha vira um cartão, sem
 * rolagem lateral. A linha inteira é clicável por um link esticado no título.
 */

const FONTE = "font-[family-name:var(--font-interface)]";

export type ColunaLista = { titulo: string; largura: string };

export function TabelaLista({
  rotulo,
  colunas,
  children,
}: {
  rotulo: string;
  colunas: ColunaLista[];
  children: ReactNode;
}) {
  return (
    <div
      role="region"
      aria-label={rotulo}
      className="overflow-hidden rounded-cartao border border-linha bg-branco max-md:overflow-visible max-md:border-0 max-md:bg-transparent"
    >
      <table className={`w-full table-fixed border-collapse text-left text-sm ${FONTE} max-md:block`}>
        <colgroup className="max-md:hidden">
          {colunas.map((coluna) => <col key={coluna.titulo} style={{ width: coluna.largura }} />)}
        </colgroup>
        <thead className="max-md:hidden">
          <tr>
            {colunas.map((coluna) => (
              <th key={coluna.titulo} scope="col" className="whitespace-nowrap border-b border-linha bg-cabecalho px-4 py-[11px] text-xs font-semibold text-cinza">
                {coluna.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="max-md:block">{children}</tbody>
      </table>
    </div>
  );
}

export function LinhaLista({ children }: { children: ReactNode }) {
  return (
    <tr className="relative border-t border-linha first:border-t-0 hover:bg-cabecalho max-md:mb-2.5 max-md:grid max-md:grid-cols-[1fr_auto] max-md:gap-x-3 max-md:gap-y-1.5 max-md:rounded-cartao max-md:border max-md:bg-branco max-md:p-3.5">
      {children}
    </tr>
  );
}

/** `rotulo` aparece acima do valor só no celular, onde o cabeçalho da tabela some. */
export function CelulaLista({
  children,
  rotulo,
  larga,
  alinharADireita,
}: {
  children: ReactNode;
  rotulo?: string;
  /** No celular a célula ocupa a linha inteira do cartão (nome e contexto). */
  larga?: boolean;
  alinharADireita?: boolean;
}) {
  return (
    <td
      data-l={rotulo}
      className={`overflow-hidden px-4 py-[13px] align-middle max-md:block max-md:overflow-visible max-md:p-0 ${larga ? "max-md:col-span-full" : ""} ${alinharADireita ? "text-right max-md:text-left" : ""} ${rotulo ? "max-md:before:mb-0.5 max-md:before:block max-md:before:text-[11px] max-md:before:font-semibold max-md:before:uppercase max-md:before:tracking-[0.04em] max-md:before:text-faint max-md:before:content-[attr(data-l)]" : ""}`}
    >
      {children}
    </td>
  );
}

/** Título da linha: o link se estende sobre a linha toda, então clicar em qualquer ponto abre o registro. */
export function TituloLinha({ href, children, rotuloAcessivel }: { href: string; children: ReactNode; rotuloAcessivel?: string }) {
  return (
    <Link
      href={href}
      aria-label={rotuloAcessivel}
      className="block truncate font-medium text-ink before:absolute before:inset-0 before:content-[''] hover:text-azul-esc max-md:whitespace-normal"
    >
      {children}
    </Link>
  );
}

/** Link secundário dentro da linha (cliente, projeto): fica acima do link esticado do título. */
export function LinkSecundario({ href, children, suave }: { href: string; children: ReactNode; suave?: boolean }) {
  return (
    <Link href={href} className={`relative z-10 hover:text-azul-esc hover:underline ${suave ? "text-cinza" : "text-ink"}`}>
      {children}
    </Link>
  );
}

export function TextoPrincipal({ children }: { children: ReactNode }) {
  return <span className="block truncate max-md:whitespace-normal">{children}</span>;
}

export function TextoSecundario({ children }: { children: ReactNode }) {
  return <span className="mt-px block truncate text-[12.5px] text-cinza max-md:whitespace-normal">{children}</span>;
}

export function CodigoLinha({ children }: { children: ReactNode }) {
  return <span className="block truncate text-xs tabular-nums text-faint">{children}</span>;
}

export function Vazio({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div className="rounded-cartao border border-linha bg-branco px-5 py-12 text-center text-cinza">
      <b className="mb-1 block font-semibold text-ink">{titulo}</b>
      {descricao}
    </div>
  );
}

/** Cores dos pontos de status, pelos tokens `ponto-*`. */
const COR_PONTO: Record<string, string> = {
  A_INICIAR: "bg-ponto-inicio",
  EM_ANDAMENTO: "bg-ponto-andamento",
  AGUARDANDO_DOCUMENTO_CLIENTE: "bg-ponto-espera",
  VISITA_REUNIAO_AGENDADA: "bg-ponto-visita",
  PROTOCOLADO: "bg-ponto-orgao",
  SOB_ANALISE_ORGAO_AMBIENTAL: "bg-ponto-orgao",
  COM_EXIGENCIA_A_CUMPRIR: "bg-ponto-exigencia",
  CONCLUIDO: "bg-verde",
  CANCELADO: "bg-cinza",
};

/** Status como texto com um ponto colorido à esquerda, sem caixa nem borda. */
export function StatusPonto({ status, children }: { status: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-[7px] text-[13px] leading-snug text-ink">
      <span aria-hidden="true" className={`size-2 shrink-0 -translate-y-px rounded-full ${COR_PONTO[status] ?? "bg-ponto-inicio"}`} />
      <span>{children}</span>
    </span>
  );
}

const formatarData = (data: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(data);

/** Data do prazo com o selo de situação logo abaixo. */
export function CelulaPrazo({
  prazo,
  status,
  ativo,
  limites,
}: {
  prazo: Date | null;
  status: string;
  ativo: boolean;
  limites: LimitesSemaforo;
}) {
  return (
    <div className="flex flex-col items-start gap-1">
      {prazo && <span className="tabular-nums text-ink">{formatarData(prazo)}</span>}
      <IndicadorSemaforoProjeto prazo={prazo} status={status} ativo={ativo} limites={limites} />
    </div>
  );
}

/** Barra de progresso com a contagem ao lado (ex.: 2/3). */
export function ProgressoBarra({ concluidas, total }: { concluidas: number; total: number }) {
  if (total === 0) return <span className="text-faint">Sem tarefas</span>;
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 max-w-[110px] flex-1 overflow-hidden rounded-full bg-linha" role="img" aria-label={`${concluidas} de ${total} concluídas`}>
        <span className="block h-full bg-verde" style={{ width: `${Math.round((concluidas / total) * 100)}%` }} />
      </div>
      <span className="whitespace-nowrap text-[12.5px] tabular-nums text-cinza">{concluidas}/{total}</span>
    </div>
  );
}
