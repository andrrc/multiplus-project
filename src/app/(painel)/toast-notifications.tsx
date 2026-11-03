"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IconAlertCircle, IconAlertTriangle, IconCircleCheck, IconInfoCircle, IconX } from "@tabler/icons-react";
import type { Perfil } from "@prisma/client";
import { formatarDataHoraBrasilia } from "@/lib/datas";
import { criarAmostrasToastDemonstracao, enfileirarToast, EVENTO_GERAR_TOASTS_DEMONSTRACAO, rotaCentralNotificacoes, rotaSeguraDoToast, substituirAmostrasToast, textoResumoNotificacoes, tipoToastDoEvento, toastsVisiveis, type NotificacaoToast, type TipoToast } from "@/lib/notificacoes-toasts";
import { marcarNotificacaoLidaAction, marcarTodasNotificacoesLidasAction } from "./notificacoes/actions";

type Toast = NotificacaoToast & { resumo?: boolean; demonstracao?: boolean; tipoVisual?: TipoToast };

export function BotaoGerarToastsDemonstracao({ habilitado }: { habilitado: boolean }) {
  if (!habilitado) return null;

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(EVENTO_GERAR_TOASTS_DEMONSTRACAO))}
      className="inline-flex min-h-11 items-center justify-center rounded-[3px] border border-azul px-4 py-2.5 font-[family-name:var(--font-interface)] text-[13px] font-medium text-azul-esc hover:bg-azul-cl"
    >
      Gerar toasts de demonstração
    </button>
  );
}

const visualPorTipo: Record<TipoToast, { classe: string; barra: string; Icone: typeof IconInfoCircle; rotulo: string }> = {
  sucesso: { classe: "bg-verde-cl text-verde-esc", barra: "bg-verde", Icone: IconCircleCheck, rotulo: "Sucesso" },
  aviso: { classe: "bg-branco text-ambar", barra: "bg-ambar", Icone: IconAlertTriangle, rotulo: "Atenção" },
  erro: { classe: "bg-critico-cl text-critico", barra: "bg-critico", Icone: IconAlertCircle, rotulo: "Erro" },
  informacao: { classe: "bg-azul-cl text-azul-esc", barra: "bg-azul", Icone: IconInfoCircle, rotulo: "Informação" },
};

function ToastCard({
  toast,
  perfil,
  aoFechar,
}: {
  toast: Toast;
  perfil: Perfil;
  aoFechar: (id: string) => void;
}) {
  const [pausado, setPausado] = useState(false);
  const pausadoRef = useRef(false);
  const [fechando, setFechando] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inicio = useRef(0);
  const restante = useRef(6000);
  const fechandoRef = useRef(false);
  const router = useRouter();
  const fechar = useCallback(() => {
    if (fechandoRef.current) return;
    fechandoRef.current = true;
    setFechando(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => aoFechar(toast.id), 180);
  }, [aoFechar, toast.id]);

  const iniciarTimer = useCallback(() => {
    if (pausadoRef.current || fechandoRef.current) return;
    inicio.current = Date.now();
    timer.current = setTimeout(fechar, restante.current);
  }, [fechar]);

  useEffect(() => {
    iniciarTimer();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [iniciarTimer]);

  const pausar = () => {
    if (pausadoRef.current || fechandoRef.current) return;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
      restante.current = Math.max(0, restante.current - (Date.now() - inicio.current));
    }
    pausadoRef.current = true;
    setPausado(true);
  };

  const retomar = () => {
    if (!pausadoRef.current || fechandoRef.current) return;
    pausadoRef.current = false;
    setPausado(false);
    iniciarTimer();
  };

  const tipo = toast.resumo ? "informacao" : toast.tipoVisual ?? tipoToastDoEvento(toast.evento);
  const visual = visualPorTipo[tipo];
  const Icone = visual.Icone;
  const destino = toast.resumo ? rotaCentralNotificacoes(perfil) : rotaSeguraDoToast(toast.url, perfil);
  const mensagem = toast.resumo ? textoResumoNotificacoes(Number(toast.mensagem)) : toast.mensagem;
  const data = new Date(toast.criadaEm);
  const horario = toast.resumo
    ? "Agora"
    : formatarDataHoraBrasilia(data).split(", ").at(-1) ?? "Agora";

  return (
    <article
      role="status"
      aria-live="polite"
      data-pausado={pausado}
      onPointerEnter={pausar}
      onPointerLeave={retomar}
      onFocusCapture={pausar}
      onBlurCapture={(evento) => {
        if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) retomar();
      }}
      className={`pointer-events-auto relative overflow-hidden rounded-[3px] border border-linha bg-branco ${fechando ? "animate-toast-saida" : "animate-toast-entrada"}`}
    >
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-[3px] ${visual.barra}`} />
      <Link
        href={destino}
        aria-label={`${visual.rotulo}: ${toast.resumo ? "Notificações" : toast.titulo}. ${mensagem}`}
        onClick={async (evento) => {
          if (toast.resumo || toast.demonstracao) {
            fechar();
            return;
          }
          evento.preventDefault();
          await marcarNotificacaoLidaAction(toast.id);
          fechar();
          router.push(destino);
        }}
        className="flex min-h-[88px] items-start gap-3 px-4 py-3 pr-12 text-tinta focus-visible:outline-offset-[-3px]"
      >
        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] ${visual.classe}`}>
          <Icone aria-hidden="true" size={21} stroke={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-3">
            <span className="font-[family-name:var(--font-interface)] text-[13px] font-semibold leading-5 text-tinta">{toast.resumo ? "Notificações" : toast.titulo}</span>
            <time className="shrink-0 pt-0.5 font-[family-name:var(--font-interface)] text-[11px] text-cinza tabular-nums">{horario}</time>
          </span>
          <span className="mt-0.5 block line-clamp-2 break-words text-[13px] leading-5 text-cinza">{mensagem}</span>
        </span>
      </Link>
      <button
        type="button"
        aria-label="Fechar notificação"
        onClick={fechar}
        className="absolute right-1.5 top-1.5 inline-flex min-h-11 min-w-11 items-center justify-center rounded-[3px] text-cinza hover:bg-papel hover:text-tinta"
      >
        <IconX aria-hidden="true" size={17} stroke={1.8} />
      </button>
      <span aria-hidden="true" className={`toast-progresso absolute inset-x-0 bottom-0 h-[2px] ${visual.barra}`} style={{ animationPlayState: pausado || fechando ? "paused" : "running" }} />
    </article>
  );
}

export function ToastNotifications({
  usuarioId,
  versaoSessao,
  perfil,
  naoLidasIniciais,
  demoDisponivel,
}: {
  usuarioId: string;
  versaoSessao: number;
  perfil: Perfil;
  naoLidasIniciais: number;
  demoDisponivel: boolean;
}) {
  const [fila, setFila] = useState<Toast[]>([]);
  const pathname = usePathname();
  const idsRecebidos = useRef(new Set<string>());
  const centraisVisitadas = useRef(new Set<string>());

  const adicionar = useCallback((toast: Toast) => {
    if (idsRecebidos.current.has(toast.id)) return;
    idsRecebidos.current.add(toast.id);
    setFila((atual) => enfileirarToast(atual, toast));
  }, []);

  const remover = useCallback((id: string) => {
    setFila((atual) => atual.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    if (!demoDisponivel) return;
    const gerarDemonstracao = () => {
      const amostras = criarAmostrasToastDemonstracao(crypto.randomUUID());
      setFila((atual) => substituirAmostrasToast(atual, amostras));
    };
    window.addEventListener(EVENTO_GERAR_TOASTS_DEMONSTRACAO, gerarDemonstracao);
    return () => window.removeEventListener(EVENTO_GERAR_TOASTS_DEMONSTRACAO, gerarDemonstracao);
  }, [demoDisponivel]);

  useEffect(() => {
    if (naoLidasIniciais > 0) {
      const chave = `mplus-toast-resumo:${usuarioId}:${versaoSessao}`;
      try {
        if (sessionStorage.getItem(chave) !== "exibido") {
          sessionStorage.setItem(chave, "exibido");
          adicionar({
            id: chave,
            evento: "NOVO_COMENTARIO",
            titulo: "Notificações",
            mensagem: String(naoLidasIniciais),
            url: null,
            criadaEm: new Date().toISOString(),
            resumo: true,
          });
        }
      } catch {
        adicionar({
          id: `resumo:${usuarioId}:${versaoSessao}`,
          evento: "NOVO_COMENTARIO",
          titulo: "Notificações",
          mensagem: String(naoLidasIniciais),
          url: null,
          criadaEm: new Date().toISOString(),
          resumo: true,
        });
      }
    }
  }, [adicionar, naoLidasIniciais, usuarioId, versaoSessao]);

  useEffect(() => {
    const chave = `mplus-central-visit:${usuarioId}:${versaoSessao}`;
    const caminhoCentral = rotaCentralNotificacoes(perfil);
    if (pathname !== caminhoCentral) {
      centraisVisitadas.current.delete(chave);
      try {
        sessionStorage.removeItem(chave);
      } catch {
        // A deduplicação em memória continua valendo quando o navegador bloqueia storage.
      }
      return;
    }

    if (centraisVisitadas.current.has(chave)) return;
    try {
      if (sessionStorage.getItem(chave) === "aberta") {
        centraisVisitadas.current.add(chave);
        return;
      }
      sessionStorage.setItem(chave, "aberta");
    } catch {
      // O marcador em memória evita chamadas repetidas durante a visita atual.
    }
    centraisVisitadas.current.add(chave);
    void marcarTodasNotificacoesLidasAction();
  }, [pathname, perfil, usuarioId, versaoSessao]);

  useEffect(() => {
    const conexao = new EventSource("/api/notificacoes/stream");
    const receber = (evento: MessageEvent<string>) => {
      try {
        const notificacao = JSON.parse(evento.data) as Toast;
        adicionar(notificacao);
      } catch {
        // Respostas inesperadas do canal não interrompem os eventos seguintes.
      }
    };
    const leitura = (evento: MessageEvent<string>) => {
      try {
        const { id } = JSON.parse(evento.data) as { id?: unknown };
        if (typeof id !== "string") return;
        remover(id);
      } catch {
        // Um sinal inválido não afeta a conexão nem o restante dos toasts.
      }
    };
    const expirada = () => conexao.close();
    conexao.addEventListener("notificacao", receber as EventListener);
    conexao.addEventListener("notificacao-lida", leitura as EventListener);
    conexao.addEventListener("sessao-expirada", expirada);
    return () => {
      conexao.close();
    };
  }, [adicionar, remover, usuarioId]);

  return (
    <div className="pointer-events-none fixed right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3 sm:right-6" style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
      {toastsVisiveis(fila).map((toast) => (
        <ToastCard key={toast.id} toast={toast} perfil={perfil} aoFechar={remover} />
      ))}
    </div>
  );
}
