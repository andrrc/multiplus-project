import { notFound } from "next/navigation";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { buscarProjeto } from "@/lib/projetos-tarefas";
import { atualizarProjetoERedirecionarAction } from "../../actions";
import { Campo, SecaoNumerada, inputClass } from "@/ui/campo";
import { CampoValorMonetario } from "@/ui/campo-valor-monetario";

const iso = (v: Date | null) => v ? v.toISOString().slice(0, 10) : "";
const partesProposta = (valor: string | null) => {
  const [numero = "", ano = ""] = valor?.split("/") ?? [];
  return { numero, ano };
};
export default async function EditarProjetoPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await exigirAcessoARota("/projetos"); const { id } = await params; const p = await buscarProjeto(ctx, id, true); if (!p) notFound();
  const proposta = partesProposta(p.numeroProposta);
  return <div className="w-full max-w-[820px]"><h1 className="text-[28px]">Editar projeto</h1><p className="mt-1.5 text-[15px] text-cinza">{p.cliente.razaoSocial}</p><form action={atualizarProjetoERedirecionarAction.bind(null, id)} className="mt-8 space-y-8"><SecaoNumerada numero="01" titulo="Identificação e contrato"><Campo label="Nome do projeto" obrigatorio><input name="nome" required defaultValue={p.nome} className={inputClass} /></Campo><div className="mt-4 max-w-md"><p className="mb-1.5 font-[family-name:var(--font-interface)] text-[13px] font-medium text-tinta">Proposta comercial</p><div className="flex items-center gap-2"><input name="propostaNumero" inputMode="numeric" pattern="[0-9]+" aria-label="Número da proposta" defaultValue={proposta.numero} className={inputClass} placeholder="109" /><span aria-hidden="true" className="text-cinza">/</span><input name="propostaAno" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} aria-label="Ano da proposta" defaultValue={proposta.ano} className={inputClass} placeholder="2026" /></div><p className="mt-1 text-[12px] text-cinza">Informe o número e o ano, por exemplo 109/2026.</p></div><div className="mt-4 max-w-xs"><Campo label="Valor contratado" obrigatorio><CampoValorMonetario required defaultValue={p.valorContratado?.valorContratado.toString() ?? ""} /></Campo></div><Campo label="Descrição"><textarea name="descricao" rows={4} defaultValue={p.descricao ?? ""} className={inputClass} /></Campo></SecaoNumerada><SecaoNumerada numero="02" titulo="Prazo e status"><div className="grid gap-4 sm:grid-cols-3"><Campo label="Data de início"><input type="date" name="dataInicio" defaultValue={iso(p.dataInicio)} className={inputClass} /></Campo><Campo label="Conclusão prevista"><input type="date" name="dataPrevistaConclusao" defaultValue={iso(p.dataPrevistaConclusao)} className={inputClass} /></Campo><Campo label="Status"><select name="status" defaultValue={p.status} className={inputClass}><option value="A_INICIAR">A iniciar</option><option value="EM_ANDAMENTO">Em andamento</option><option value="CONCLUIDO">Concluído</option><option value="CANCELADO">Cancelado</option></select></Campo></div></SecaoNumerada><div className="flex gap-3"><button className="min-h-11 rounded-[3px] bg-verde px-5 text-[14px] font-semibold text-tinta">Salvar alterações</button><a href={`/projetos/${id}`} className="flex min-h-11 items-center rounded-[3px] border border-linha px-5 text-[14px]">Cancelar</a></div></form></div>;
}
