import { exigirAcessoARota } from "@/server/auth/contexto";
import { listarAtribuicoesDetalhadas } from "@/lib/usuarios";
import { Etiqueta } from "@/ui/campo";

/**
 * Tela inicial do Colaborador Externo (RF-043). Mesma situação da tela de Meus Projetos: a
 * Tela 10 completa é da Sprint 4; o que está aqui são as atribuições reais do usuário.
 *
 * O nome do cliente aparece — e só ele (RF-046): nada de CNPJ, endereço ou qualquer outro
 * dado cadastral, porque o Colaborador Externo pode ser um terceiro de fora da Múltiplus.
 */
export default async function MinhasTarefasPage() {
  const ctx = await exigirAcessoARota("/minhas-tarefas");
  const atribuicoes = await listarAtribuicoesDetalhadas(ctx, ctx.usuarioId);
  const tarefas = atribuicoes.filter((a) => a.entidadeTipo === "TAREFA");

  return (
    <div className="w-full max-w-[900px]">
      <h1 className="text-[24px] sm:text-[28px]">Minhas tarefas</h1>
      <p className="mt-1.5 text-[15px] text-cinza">As tarefas atribuídas a você.</p>

      {tarefas.length === 0 ? (
        <p className="mt-7 rounded-[3px] border border-linha bg-branco px-6 py-8 text-center text-[15px] text-cinza">
          Nenhuma tarefa atribuída a você ainda.
        </p>
      ) : (
        <ul className="mt-7 overflow-hidden rounded-[3px] border border-linha bg-branco">
          {tarefas.map((tarefa) => (
            <li
              key={tarefa.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-linha px-5 py-4 last:border-b-0"
            >
              <div>
                <p className="font-[family-name:var(--font-interface)] text-[15px] font-semibold text-tinta">
                  {tarefa.entidadeNome ?? "(tarefa removida)"}
                </p>
                <p className="text-[14px] text-cinza">{tarefa.cliente ?? "—"}</p>
              </div>
              {tarefa.origem === "AUTOMATICA" && <Etiqueta>Você é o responsável</Etiqueta>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
