import { Etiqueta } from "@/ui/campo";

export function StatusInline({
  status,
  label,
  opcoes,
  action,
}: {
  status: string;
  label: string;
  opcoes: Array<{ valor: string; label: string }>;
  action: (formData: FormData) => Promise<void>;
}) {
  return <details className="relative inline-block"><summary className="cursor-pointer list-none"><Etiqueta tom={status === "CONCLUIDO" ? "positivo" : status === "CANCELADO" ? "apagado" : undefined}>{label} ▾</Etiqueta></summary><div className="absolute right-0 z-10 mt-2 min-w-48 rounded-[3px] border border-linha bg-branco p-2 shadow-lg">{opcoes.map(opcao => <form action={action} key={opcao.valor}><button name="status" value={opcao.valor} className={`block w-full rounded-[3px] px-3 py-2 text-left text-[13px] hover:bg-verde-cl ${opcao.valor === status ? "font-semibold" : "font-normal"}`}>{opcao.label}</button></form>)}</div></details>;
}

export function StatusCardInline({ status, label, opcoes, action }: { status: string; label: string; opcoes: Array<{ valor: string; label: string }>; action: (formData: FormData) => Promise<void> }) {
  const estilo: Record<string, string> = { A_INICIAR: "border-l-cinza bg-papel text-tinta", EM_ANDAMENTO: "border-l-azul bg-azul/8 text-azul-esc", CONCLUIDO: "border-l-verde bg-verde-cl text-verde-esc", CANCELADO: "border-l-critico bg-critico/8 text-critico" };
  return <details className="relative"><summary className={`inline-flex min-h-[68px] max-w-full cursor-pointer list-none items-center gap-3 rounded-[3px] border border-linha border-l-4 px-4 py-3 ${estilo[status] ?? estilo.A_INICIAR}`}><span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded-full ${status === "CONCLUIDO" ? "bg-verde-esc" : status === "CANCELADO" ? "bg-critico" : status === "EM_ANDAMENTO" ? "bg-azul-esc" : "bg-cinza"}`} /><span><span className="block font-[family-name:var(--font-interface)] text-[11px] font-medium leading-4 text-cinza">Status do projeto</span><span className="block font-[family-name:var(--font-interface)] text-[16px] font-semibold leading-5">{label} ▾</span></span></summary><div className="absolute right-0 z-10 mt-2 min-w-48 rounded-[3px] border border-linha bg-branco p-2 shadow-lg">{opcoes.map(opcao => <form action={action} key={opcao.valor}><button name="status" value={opcao.valor} className="block w-full rounded-[3px] px-3 py-2 text-left text-[13px] hover:bg-verde-cl">{opcao.label}</button></form>)}</div></details>;
}
