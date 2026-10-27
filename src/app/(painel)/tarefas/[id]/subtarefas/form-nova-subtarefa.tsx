/**
 * Componente de interface `form nova subtarefa`. Recebe dados e callbacks de seu chamador, mantém apenas o estado necessário à interação e delega validações e persistência ao servidor.
 */
import Link from "next/link";
import { StatusSubtarefa } from "@prisma/client";
import { criarSubtarefaERedirecionarAction } from "@/app/(painel)/projetos/actions";
import { inputClass } from "@/ui/campo";
import { SeletorEtiquetas } from "@/ui/seletor-etiquetas";

const rotulos: Record<StatusSubtarefa, string> = {
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

type OpcoesResponsavel = {
  pessoas: { id: string; nome: string }[];
  usuarios: { id: string; nome: string }[];
};

export function FormNovaSubtarefa({
  tarefaId,
  tarefaNome,
  ehAdmin,
  opcoesResponsavel,
  etiquetas,
}: {
  tarefaId: string;
  tarefaNome: string;
  ehAdmin: boolean;
  opcoesResponsavel?: OpcoesResponsavel;
  etiquetas: { id: string; nome: string; cor: string }[];
}) {
  const voltar = `${ehAdmin ? "/tarefas" : "/minhas-tarefas"}/${tarefaId}`;
  const responsaveisDisponiveis = !opcoesResponsavel
    || opcoesResponsavel.pessoas.length + opcoesResponsavel.usuarios.length > 0;

  return <div className="w-full max-w-[760px]">
    <Link href={voltar} className="font-[family-name:var(--font-interface)] text-[14px] text-azul-esc hover:underline">← {tarefaNome}</Link>
    <h1 className="mt-4 text-[28px]">Nova subtarefa</h1>
    <p className="mt-1 text-[15px] text-cinza">Cadastre uma etapa com responsável, prazo e status próprios.</p>
    <form action={criarSubtarefaERedirecionarAction} className="mt-6 grid gap-4 rounded-[3px] border border-linha bg-branco p-5">
      <input type="hidden" name="tarefaId" value={tarefaId} />
      <label className="grid gap-1.5 text-[13px] font-medium">Título<input name="titulo" required maxLength={180} className={inputClass} /></label>
      <label className="grid gap-1.5 text-[13px] font-medium">Descrição<textarea name="descricao" rows={4} className={inputClass} /></label>
      <label className="grid gap-1.5 text-[13px] font-medium">Prazo de conclusão (opcional)<input type="date" name="prazo" className={inputClass} /></label>
      {ehAdmin && <label className="grid gap-1.5 text-[13px] font-medium">Status<select name="status" defaultValue={StatusSubtarefa.EM_ANDAMENTO} className={inputClass}>{Object.values(StatusSubtarefa).map((status) => <option key={status} value={status}>{rotulos[status]}</option>)}</select></label>}
      {opcoesResponsavel ? <label className="grid gap-1.5 text-[13px] font-medium">Responsável<select name="responsavelId" required defaultValue="" className={inputClass}>
        <option value="" disabled>Selecione uma pessoa</option>
        <optgroup label="Equipe Múltiplus">{opcoesResponsavel.usuarios.map((usuario) => <option key={usuario.id} value={`usuario:${usuario.id}`}>{usuario.nome}</option>)}</optgroup>
        <optgroup label="Pessoas envolvidas">{opcoesResponsavel.pessoas.map((pessoa) => <option key={pessoa.id} value={pessoa.id}>{pessoa.nome}</option>)}</optgroup>
      </select></label> : <p className="text-[13px] text-cinza">Você será definido como responsável por esta subtarefa.</p>}
      <SeletorEtiquetas disponiveis={etiquetas} />
      {opcoesResponsavel && !responsaveisDisponiveis && <p className="text-[13px] text-critico">Cadastre uma pessoa envolvida ou um integrante ativo da equipe para poder criar a subtarefa.</p>}
      <p className="text-[13px] text-cinza">Depois de salvar, você poderá abrir a subtarefa para consultar os detalhes e registrar comentários.</p>
      <div className="flex flex-wrap justify-end gap-2"><Link href={voltar} className="min-h-11 rounded-[3px] border border-linha px-4 py-2.5 text-[13px]">Cancelar</Link><button disabled={!responsaveisDisponiveis} className="min-h-11 rounded-[3px] bg-tinta px-4 py-2.5 font-[family-name:var(--font-interface)] text-[13px] font-semibold text-branco disabled:cursor-not-allowed disabled:opacity-50">Criar subtarefa</button></div>
    </form>
  </div>;
}
