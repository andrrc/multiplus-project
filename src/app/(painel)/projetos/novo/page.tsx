/* eslint-disable @next/next/no-html-link-for-pages */
import { exigirAcessoARota } from "@/server/auth/contexto";
import { listarClientesParaProjeto } from "@/lib/projetos-tarefas";
import { criarProjetoERedirecionarAction } from "../actions";
import { Campo, SecaoNumerada, inputClass } from "@/ui/campo";

export default async function NovoProjetoPage() {
  const ctx = await exigirAcessoARota("/projetos/novo");
  const clientes = await listarClientesParaProjeto(ctx);

  return (
    <div className="w-full max-w-[820px]">
      <p className="font-[family-name:var(--font-interface)] text-[11px] font-semibold uppercase tracking-[0.12em] text-azul-esc">Projetos</p>
      <h1 className="mt-1 text-[28px]">Novo projeto</h1>
      <p className="mt-1.5 text-[15px] text-cinza">Defina o cliente, o valor contratado e a janela de entrega para começar.</p>
      <form action={criarProjetoERedirecionarAction} className="mt-8 space-y-8">
        <SecaoNumerada numero="01" titulo="Identificação e contrato">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Cliente" obrigatorio><select name="clienteId" required className={inputClass}><option value="">Selecione o cliente</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.razaoSocial}</option>)}</select></Campo>
            <Campo label="Nome do projeto" obrigatorio><input name="nome" required className={inputClass} placeholder="Ex.: Renovação da licença ambiental" /></Campo>
          </div>
          <div className="mt-4 max-w-xs"><Campo label="Valor contratado (R$)" obrigatorio><input type="number" name="valorContratado" required min="0" step="0.01" inputMode="decimal" className={inputClass} placeholder="0,00" /></Campo></div>
          <Campo label="Descrição"><textarea name="descricao" rows={4} className={inputClass} /></Campo>
        </SecaoNumerada>
        <SecaoNumerada numero="02" titulo="Prazo e status"><div className="grid gap-4 sm:grid-cols-3"><Campo label="Data de início"><input type="date" name="dataInicio" className={inputClass} /></Campo><Campo label="Conclusão prevista"><input type="date" name="dataPrevistaConclusao" className={inputClass} /></Campo><Campo label="Status"><select name="status" defaultValue="A_INICIAR" className={inputClass}><option value="A_INICIAR">A iniciar</option><option value="EM_ANDAMENTO">Em andamento</option><option value="CONCLUIDO">Concluído</option><option value="CANCELADO">Cancelado</option></select></Campo></div></SecaoNumerada>
        <div className="flex flex-wrap gap-3"><button className="min-h-11 rounded-[3px] bg-verde px-5 text-[14px] font-semibold text-tinta hover:bg-verde-esc hover:text-branco">Criar projeto</button><a href="/projetos" className="flex min-h-11 items-center rounded-[3px] border border-linha px-5 text-[14px] hover:border-azul">Cancelar</a></div>
      </form>
    </div>
  );
}
