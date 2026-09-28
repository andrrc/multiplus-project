import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusSubtarefa } from "@prisma/client";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { buscarTarefa, buscarTarefaParaColaborador, listarPessoasParaProjeto } from "@/lib/projetos-tarefas";
import { criarSubtarefaERedirecionarAction } from "@/app/(painel)/projetos/actions";
import { inputClass } from "@/ui/campo";
import { SeletorEtiquetas } from "@/ui/seletor-etiquetas";
import { listarEtiquetas } from "@/lib/etiquetas";

const rotulos: Record<StatusSubtarefa, string> = { EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", CANCELADO: "Cancelado" };

export default async function NovaSubtarefaPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await exigirAcessoARota("/tarefas");
  const { id } = await params;
  const ehAdmin = ctx.perfil === "ADMIN";
  const tarefa = ehAdmin ? await buscarTarefa(ctx, id) : await buscarTarefaParaColaborador(ctx, id);
  if (!tarefa || (!ehAdmin && !("podeCriarSubtarefas" in tarefa && tarefa.podeCriarSubtarefas))) notFound();
  const clienteId = "clienteId" in tarefa.projeto ? tarefa.projeto.clienteId : null;
  const opcoesResponsavel = ehAdmin && clienteId ? await listarPessoasParaProjeto(ctx, clienteId) : null;
  const responsaveis = opcoesResponsavel ? opcoesResponsavel.pessoas.length + opcoesResponsavel.usuarios.length > 0 : true;
  const etiquetas = await listarEtiquetas(ctx);

  return <div className="w-full max-w-[760px]">
    <Link href={ehAdmin ? `/tarefas/${id}` : `/minhas-tarefas/${id}`} className="font-[family-name:var(--font-interface)] text-[14px] text-azul-esc hover:underline">← {tarefa.nome}</Link>
    <h1 className="mt-4 text-[28px]">Nova subtarefa</h1>
    <p className="mt-1 text-[15px] text-cinza">Cadastre uma etapa com responsável, prazo e status próprios.</p>
    <form action={criarSubtarefaERedirecionarAction} className="mt-6 grid gap-4 rounded-[3px] border border-linha bg-branco p-5">
      <input type="hidden" name="tarefaId" value={tarefa.id} />
      <label className="grid gap-1.5 text-[13px] font-medium">Título<input name="titulo" required maxLength={180} className={inputClass} /></label>
      <label className="grid gap-1.5 text-[13px] font-medium">Descrição<textarea name="descricao" rows={4} className={inputClass} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-[13px] font-medium">Prazo de conclusão (opcional)<input type="date" name="prazo" className={inputClass} /></label>
        <label className="grid gap-1.5 text-[13px] font-medium">Status<select name="status" defaultValue={StatusSubtarefa.EM_ANDAMENTO} className={inputClass}>{Object.values(StatusSubtarefa).map(status => <option key={status} value={status}>{rotulos[status]}</option>)}</select></label>
      </div>
      {opcoesResponsavel ? <label className="grid gap-1.5 text-[13px] font-medium">Responsável<select name="responsavelId" required defaultValue="" className={inputClass}>
        <option value="" disabled>Selecione uma pessoa</option>
        <optgroup label="Equipe Múltiplus">{opcoesResponsavel.usuarios.map(usuario => <option key={usuario.id} value={`usuario:${usuario.id}`}>{usuario.nome}</option>)}</optgroup>
        <optgroup label="Pessoas envolvidas">{opcoesResponsavel.pessoas.map(pessoa => <option key={pessoa.id} value={pessoa.id}>{pessoa.nome}</option>)}</optgroup>
      </select></label> : <p className="text-[13px] text-cinza">Você será definido como responsável por esta subtarefa.</p>}
      <SeletorEtiquetas disponiveis={etiquetas} />
      {opcoesResponsavel && !responsaveis && <p className="text-[13px] text-vermelho">Cadastre uma pessoa envolvida ou um integrante ativo da equipe para poder criar a subtarefa.</p>}
      <p className="text-[13px] text-cinza">Depois de salvar, você poderá abrir a subtarefa para consultar os detalhes e registrar comentários.</p>
      <div className="flex flex-wrap justify-end gap-2"><Link href={ehAdmin ? `/tarefas/${id}` : `/minhas-tarefas/${id}`} className="rounded-[3px] border border-linha px-4 py-2.5 text-[13px]">Cancelar</Link><button disabled={!responsaveis} className="rounded-[3px] bg-tinta px-4 py-2.5 font-[family-name:var(--font-interface)] text-[13px] font-semibold text-branco disabled:cursor-not-allowed disabled:opacity-50">Criar subtarefa</button></div>
    </form>
  </div>;
}
