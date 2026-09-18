import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { buscarTarefa, listarPessoasParaProjeto } from "@/lib/projetos-tarefas";
import {
  concluirSubtarefaAction,
  concluirTarefaAction,
  criarSubtarefaAction,
  definirAtivoTarefaFormAction,
  excluirTarefaAction,
} from "@/app/(painel)/projetos/actions";
import { Etiqueta, inputClass } from "@/ui/campo";
import { Comentarios } from "@/app/(painel)/projetos/comentarios";
import { ResponsavelSubtarefa } from "./responsavel-subtarefa";

const statuses: Record<string, string> = {
  A_INICIAR: "A iniciar",
  EM_ANDAMENTO: "Em andamento",
  AGUARDANDO_DOCUMENTO_CLIENTE: "Aguardando documento",
  VISITA_REUNIAO_AGENDADA: "Visita/reunião agendada",
  PROTOCOLADO: "Protocolado",
  SOB_ANALISE_ORGAO_AMBIENTAL: "Sob análise do órgão",
  COM_EXIGENCIA_A_CUMPRIR: "Com exigência",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

const data = (v: Date | null) => v
  ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(v)
  : "—";

export default async function TarefaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await exigirAcessoARota("/tarefas");
  const { id } = await params;
  const t = await buscarTarefa(ctx, id, true);
  if (!t) notFound();
  const { pessoas, usuarios } = await listarPessoasParaProjeto(ctx, t.projeto.clienteId);
  const haResponsaveis = pessoas.length + usuarios.length > 0;

  return (
    <div className="w-full max-w-[980px]">
      <Link href={`/projetos/${t.projetoId}`} className="font-[family-name:var(--font-interface)] text-[14px] text-azul-esc hover:underline">
        ← {t.projeto.nome}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[14px] text-cinza">{t.projeto.cliente.razaoSocial}</p>
          <h1 className="mt-1 text-[28px]">{t.nome}</h1>
          <p className="mt-2 text-[15px] text-cinza">Prazo: <strong className="font-medium text-tinta">{data(t.prazo)}</strong>{t.responsavel ? ` · Responsável: ${t.responsavel.nome}` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Etiqueta tom={t.ativo ? undefined : "apagado"}>{t.ativo ? statuses[t.status] : "Desativada"}</Etiqueta>
          {t.ativo ? <>
            <Link href={`/tarefas/${id}/editar`} className="rounded-[3px] border border-linha px-3 py-2 font-[family-name:var(--font-interface)] text-[13px] hover:border-azul">Editar</Link>
            {t.status !== "CONCLUIDO" && <form action={concluirTarefaAction.bind(null, id)}><button className="rounded-[3px] bg-verde px-3 py-2 font-[family-name:var(--font-interface)] text-[13px] font-semibold text-tinta">Marcar como concluída</button></form>}
            <form action={excluirTarefaAction.bind(null, id)}><button className="rounded-[3px] border border-vermelho px-3 py-2 font-[family-name:var(--font-interface)] text-[13px] text-vermelho hover:bg-vermelho-cl">Excluir tarefa</button></form>
          </> : <form action={definirAtivoTarefaFormAction.bind(null, id, true)}><button className="rounded-[3px] border border-linha px-3 py-2 font-[family-name:var(--font-interface)] text-[13px] hover:border-verde">Reativar tarefa</button></form>}
        </div>
      </div>
      {t.descricao && <p className="mt-6 max-w-[70ch] text-[15px] text-cinza">{t.descricao}</p>}

      <section className="mt-9 max-w-[860px]">
        <div>
          <h2 className="text-[21px]">Subtarefas <span className="font-[family-name:var(--font-interface)] text-[14px] text-cinza">({t.subtarefas.filter(s => s.concluida).length}/{t.subtarefas.length})</span></h2>
          <p className="mt-1 text-[14px] text-cinza">Checklist da tarefa: cada etapa menor tem um responsável da equipe ou do cliente.</p>
        </div>

        <div className="mt-4 overflow-hidden rounded-[3px] border border-linha bg-branco">
          {t.subtarefas.length === 0 ? <p className="px-5 py-8 text-[14px] text-cinza">Nenhuma subtarefa ainda. Adicione os passos necessários e indique quem irá executá-los.</p> : t.subtarefas.map(s => (
            <div key={s.id} className="flex flex-col gap-3 border-b border-linha px-5 py-4 last:border-b-0 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${s.concluida ? "bg-verde" : "border border-cinza"}`} />
                <div>
                  <p className={s.concluida ? "text-cinza line-through" : "text-tinta"}>{s.titulo}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-[family-name:var(--font-interface)] text-[12px] text-cinza">
                    <span>Responsável: <strong className="font-medium text-tinta">{s.atribuidoA?.nome ?? s.atribuidoAUsuario?.nome ?? "Não definido"}</strong></span>
                    {s.etiquetas.length > 0 && <span>{s.etiquetas.join(" · ")}</span>}
                  </div>
                </div>
              </div>

              {t.ativo && (
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <ResponsavelSubtarefa
                    key={`${s.id}-${s.atribuidoAUsuarioId ?? s.atribuidoAId}`}
                    subtarefaId={s.id}
                    titulo={s.titulo}
                    etiquetas={s.etiquetas}
                    responsavelAtual={s.atribuidoAUsuarioId ? `usuario:${s.atribuidoAUsuarioId}` : s.atribuidoAId ?? ""}
                    equipe={usuarios.map((usuario) => ({
                      id: usuario.id,
                      nome: usuario.nome,
                      descricao: usuario.perfil === "ADMIN" ? "Administrador" : "Equipe",
                    }))}
                    pessoas={pessoas.map((pessoa) => ({ id: pessoa.id, nome: pessoa.nome }))}
                  />
                  {!s.concluida && <form action={concluirSubtarefaAction.bind(null, s.id)}><button className="min-h-9 font-[family-name:var(--font-interface)] text-[13px] text-azul-esc hover:underline">Concluir</button></form>}
                </div>
              )}
            </div>
          ))}
        </div>

        {t.ativo && (haResponsaveis ? (
          <form action={criarSubtarefaAction} className="mt-4 grid gap-2 rounded-[3px] border border-linha bg-branco p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_210px_210px_auto]">
            <input type="hidden" name="tarefaId" value={t.id} />
            <input name="titulo" required placeholder="Nova subtarefa" className={inputClass} />
            <select name="responsavelId" required defaultValue="" className={inputClass}>
              <option value="" disabled>Responsável</option>
              <optgroup label="Equipe Múltiplus">
                {usuarios.map((usuario) => <option key={usuario.id} value={`usuario:${usuario.id}`}>{usuario.nome}{usuario.perfil === "ADMIN" ? " · Administrador" : " · Equipe"}</option>)}
              </optgroup>
              <optgroup label="Pessoas envolvidas">
                {pessoas.map((pessoa) => <option key={pessoa.id} value={pessoa.id}>{pessoa.nome}</option>)}
              </optgroup>
            </select>
            <input name="etiquetas" placeholder="Etiquetas, separadas por vírgula" className={inputClass} />
            <button className="min-h-11 rounded-[3px] bg-tinta px-4 font-[family-name:var(--font-interface)] text-[13px] font-semibold text-branco hover:bg-azul-esc">Adicionar</button>
          </form>
        ) : (
          <p className="mt-4 rounded-[3px] border border-dashed border-linha bg-branco px-4 py-3 text-[14px] text-cinza">Cadastre uma pessoa envolvida ou um integrante ativo da equipe para atribuir subtarefas.</p>
        ))}
      </section>

      <Comentarios alvo={{ tarefaId: t.id }} nivel="tarefa" entidadeId={t.id} />
    </div>
  );
}
