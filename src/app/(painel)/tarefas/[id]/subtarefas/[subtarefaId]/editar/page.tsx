import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusSubtarefa } from "@prisma/client";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { buscarTarefa, listarPessoasParaProjeto } from "@/lib/projetos-tarefas";
import { listarEtiquetas } from "@/lib/etiquetas";
import { CORES_ETIQUETA } from "@/lib/etiqueta-colors";
import { atualizarSubtarefaERedirecionarAction } from "@/app/(painel)/projetos/actions";
import { inputClass } from "@/ui/campo";
import { SeletorEtiquetas } from "@/ui/seletor-etiquetas";

const rotulos: Record<StatusSubtarefa, string> = { EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluída", CANCELADO: "Cancelada" };
const iso = (valor: Date | null) => valor ? valor.toISOString().slice(0, 10) : "";

export default async function EditarSubtarefaPage({ params }: { params: Promise<{ id: string; subtarefaId: string }> }) {
  const ctx = await exigirAcessoARota("/tarefas");
  if (ctx.perfil !== "ADMIN") notFound();
  const { id, subtarefaId } = await params;
  const tarefa = await buscarTarefa(ctx, id, true);
  const subtarefa = tarefa?.subtarefas.find((item) => item.id === subtarefaId);
  if (!tarefa || !subtarefa || !tarefa.ativo || !subtarefa.ativo) notFound();

  const [{ pessoas, usuarios }, catalogo] = await Promise.all([
    listarPessoasParaProjeto(ctx, tarefa.projeto.clienteId),
    listarEtiquetas(ctx),
  ]);
  const corPorNome = new Map(catalogo.map((etiqueta) => [etiqueta.nome.toLocaleLowerCase("pt-BR"), etiqueta.cor]));
  const selecionadasIniciais = subtarefa.etiquetas.map((nome) => ({
    nome,
    cor: corPorNome.get(nome.toLocaleLowerCase("pt-BR")) ?? CORES_ETIQUETA.find((cor) => cor.nome === "Cinza")!.fundo,
  }));
  const responsavelAtual = subtarefa.atribuidoAUsuarioId
    ? `usuario:${subtarefa.atribuidoAUsuarioId}`
    : subtarefa.atribuidoAId ?? "";

  return <div className="w-full max-w-[760px]">
    <Link href={`/tarefas/${id}?subtarefa=${subtarefa.id}#subtarefa-${subtarefa.id}`} className="font-[family-name:var(--font-interface)] text-[14px] text-azul-esc hover:underline">← Voltar para {tarefa.nome}</Link>
    <h1 className="mt-4 text-[28px]">Editar subtarefa</h1>
    <p className="mt-1 text-[15px] text-cinza">Atualize os dados e as etiquetas desta etapa.</p>
    <form action={atualizarSubtarefaERedirecionarAction.bind(null, subtarefa.id)} className="mt-6 grid gap-4 rounded-[3px] border border-linha bg-branco p-5">
      <label className="grid gap-1.5 text-[13px] font-medium">Título<input name="titulo" required maxLength={180} defaultValue={subtarefa.titulo} className={inputClass} /></label>
      <label className="grid gap-1.5 text-[13px] font-medium">Descrição<textarea name="descricao" rows={4} defaultValue={subtarefa.descricao ?? ""} className={inputClass} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-[13px] font-medium">Prazo de conclusão (opcional)<input type="date" name="prazo" defaultValue={iso(subtarefa.prazo)} className={inputClass} /></label>
        <label className="grid gap-1.5 text-[13px] font-medium">Status<select name="status" defaultValue={subtarefa.status} className={inputClass}>{Object.values(StatusSubtarefa).map((status) => <option key={status} value={status}>{rotulos[status]}</option>)}</select></label>
      </div>
      <label className="grid gap-1.5 text-[13px] font-medium">Responsável<select name="responsavelId" defaultValue={responsavelAtual} className={inputClass}>
        <option value="">Sem responsável</option>
        <optgroup label="Equipe Múltiplus">{usuarios.map((usuario) => <option key={usuario.id} value={`usuario:${usuario.id}`}>{usuario.nome}</option>)}</optgroup>
        <optgroup label="Pessoas envolvidas">{pessoas.map((pessoa) => <option key={pessoa.id} value={pessoa.id}>{pessoa.nome}</option>)}</optgroup>
      </select></label>
      <SeletorEtiquetas disponiveis={catalogo} selecionadasIniciais={selecionadasIniciais} />
      <div className="flex flex-wrap justify-end gap-2"><Link href={`/tarefas/${id}?subtarefa=${subtarefa.id}#subtarefa-${subtarefa.id}`} className="rounded-[3px] border border-linha px-4 py-2.5 text-[13px]">Cancelar</Link><button className="rounded-[3px] bg-tinta px-4 py-2.5 font-[family-name:var(--font-interface)] text-[13px] font-semibold text-branco hover:bg-azul-esc">Salvar alterações</button></div>
    </form>
  </div>;
}
