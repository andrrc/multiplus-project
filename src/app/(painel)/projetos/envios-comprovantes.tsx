/**
 * Envios de comprovante de um item: cada envio é um pedido de conclusão com os arquivos anexados. Serve ao colaborador
 * (que vê os próprios envios e o motivo de uma devolução) e a quem confere (administração e interno do projeto), que
 * confirma ou devolve o envio pendente. A decisão é checada de novo no servidor e no banco; o botão é só conveniência.
 */
import { formatarDataHoraBrasilia } from "@/lib/datas";
import { ehImagemComprovante } from "@/lib/comprovantes-arquivos";
import { decidirSolicitacaoConclusaoFormAction } from "@/app/(painel)/projetos/actions";
import { botaoPerigo, botaoPrimario } from "@/ui/botoes";
import { Etiqueta, inputClass } from "@/ui/campo";

export type EnvioComprovante = {
  id: string;
  status: string;
  solicitadoPorNome: string;
  solicitadoEm: Date;
  observacaoEnvio: string | null;
  decididoPorNome: string | null;
  decididoEm: Date | null;
  comentarioDecisao: string | null;
  podeDecidir: boolean;
  arquivos: Array<{ id: string; nomeOriginal: string; tipo: string; tamanhoBytes: number; enviadoEm: Date }>;
};

const ROTULO: Record<string, { texto: string; tom: "atencao" | "positivo" | "neutro" | "info" }> = {
  PENDENTE: { texto: "Aguardando conferência", tom: "atencao" },
  APROVADA: { texto: "Confirmado", tom: "positivo" },
  REJEITADA: { texto: "Devolvido para correção", tom: "info" },
  CANCELADA: { texto: "Retirado pelo colaborador", tom: "neutro" },
};

export function formatarTamanho(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

function ArquivosDoEnvio({ arquivos }: { arquivos: EnvioComprovante["arquivos"] }) {
  if (arquivos.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-3" aria-label="Arquivos do envio">
      {arquivos.map((arquivo) => (
        <li key={arquivo.id} className="w-24">
          <a href={`/api/comprovantes/${arquivo.id}`} target="_blank" rel="noopener noreferrer" className="block" title={`${arquivo.nomeOriginal} · ${formatarTamanho(arquivo.tamanhoBytes)}`}>
            {ehImagemComprovante(arquivo.tipo)
              // eslint-disable-next-line @next/next/no-img-element -- a rota autenticada entrega a imagem; next/image não leria o cookie de sessão.
              ? <img src={`/api/comprovantes/${arquivo.id}`} alt={arquivo.nomeOriginal} loading="lazy" className="h-24 w-24 rounded-controle border border-linha object-cover" />
              : <span className="flex h-24 w-24 items-center justify-center rounded-controle border border-linha bg-papel px-1 text-center text-[11px] font-semibold uppercase text-cinza">{arquivo.nomeOriginal.split(".").pop()}</span>}
            <span className="mt-1 block truncate text-[12px] text-azul-esc">{arquivo.nomeOriginal}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function Decisao({ envio }: { envio: EnvioComprovante }) {
  // Confirmar não precisa de texto (formNoValidate); devolver exige o motivo, que volta ao colaborador.
  return (
    <form action={decidirSolicitacaoConclusaoFormAction.bind(null, envio.id)} className="mt-4 grid gap-2 border-t border-linha pt-4">
      <label className="grid gap-1 text-[12px] font-medium text-cinza">
        Motivo (obrigatório para devolver)
        <textarea name="comentario" maxLength={2000} rows={2} required className={inputClass} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button name="decisao" value="APROVAR" formNoValidate className={botaoPrimario}>Confirmar envio</button>
        <button name="decisao" value="REJEITAR" className={botaoPerigo}>Devolver para correção</button>
      </div>
    </form>
  );
}

export function EnviosComprovantes({ envios, titulo = "Envios de comprovante" }: { envios: EnvioComprovante[]; titulo?: string }) {
  // Só interessam os envios com arquivos, ou o pedido ainda pendente (que a pessoa precisa decidir).
  const visiveis = envios.filter((envio) => envio.arquivos.length > 0 || envio.status === "PENDENTE");
  if (visiveis.length === 0) return null;
  return (
    <section aria-label={titulo} className="mt-4 grid gap-3">
      <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-cinza">{titulo}</h3>
      {visiveis.map((envio) => {
        const rotulo = ROTULO[envio.status] ?? ROTULO.PENDENTE;
        return (
          <article key={envio.id} className="rounded-cartao border border-linha bg-branco p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Etiqueta tom={rotulo.tom}>{rotulo.texto}</Etiqueta>
              <span className="text-[13px] text-cinza">
                {envio.solicitadoPorNome} · <span className="tabular-nums">{formatarDataHoraBrasilia(envio.solicitadoEm)}</span>
              </span>
            </div>
            {envio.observacaoEnvio && <p className="mt-2 whitespace-pre-wrap break-words text-[13.5px] text-ink">{envio.observacaoEnvio}</p>}
            <ArquivosDoEnvio arquivos={envio.arquivos} />
            {envio.status === "REJEITADA" && (
              <p role="status" className="mt-3 rounded-controle bg-azul-cl px-3 py-2 text-[13.5px] text-azul-esc">
                <strong className="font-semibold">Motivo da devolução{envio.decididoPorNome ? ` (${envio.decididoPorNome})` : ""}:</strong>{" "}
                {envio.comentarioDecisao ?? "Sem motivo informado."}
              </p>
            )}
            {envio.status === "APROVADA" && envio.decididoPorNome && envio.decididoEm && (
              <p className="mt-3 text-[13px] text-cinza">Confirmado por {envio.decididoPorNome} em <span className="tabular-nums">{formatarDataHoraBrasilia(envio.decididoEm)}</span>.</p>
            )}
            {envio.status === "PENDENTE" && envio.podeDecidir && <Decisao envio={envio} />}
          </article>
        );
      })}
    </section>
  );
}
