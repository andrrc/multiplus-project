import Link from "next/link";
import { nomeDoProjetoDuplicado } from "@/lib/duplicar-projeto";
import { buscarProjeto } from "@/lib/projetos-tarefas";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { botaoSecundario } from "@/ui/botoes";
import { duplicarProjetoAction } from "./actions";
import { FormularioDuplicacao } from "./formulario";

export default async function DuplicarProjetoPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await exigirAcessoARota("/projetos");
  const { id } = await params;
  const projeto = await buscarProjeto(ctx, id);

  return (
    <div className="w-full max-w-2xl">
      <h1 className="text-[26px]">Duplicar projeto</h1>
      {projeto ? (
        <>
          <p className="mt-2 break-words text-sm text-cinza">
            <strong className="text-ink">{nomeDoProjetoDuplicado(projeto.nome)}</strong> será criado para {projeto.cliente.razaoSocial}.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-cinza">
            <li>A cópia inclui a descrição do projeto, as tarefas e subtarefas ativas, as etiquetas, a configuração de comprovantes, a antecedência e a opção de colaboradores criarem subtarefas.</li>
            <li>Os itens começam no status inicial, sem datas, responsáveis, recorrência, comprovantes enviados, pedidos de conclusão, comentários, documentos, valor contratado ou número da proposta.</li>
          </ul>
          <FormularioDuplicacao action={duplicarProjetoAction.bind(null, id, projeto.clienteId)} voltarPara={`/projetos/${id}`} />
        </>
      ) : (
        <>
          <p className="my-4 text-sm text-cinza">Projeto ativo não encontrado.</p>
          <Link href="/projetos" className={botaoSecundario}>Voltar aos projetos</Link>
        </>
      )}
    </div>
  );
}
