import { exigirAcessoARota } from "@/server/auth/contexto";
import { listarAtribuicoesDetalhadas } from "@/lib/usuarios";

/**
 * Tela inicial do Colaborador Interno (RF-043). A Tela 9 completa — com prazos, status e
 * o que mais o PDD descreve — é da Sprint 4, quando o módulo de Projetos existir. O que
 * está aqui já é real: são as atribuições do próprio usuário, lidas com a RLS ativa, e é o
 * que permite demonstrar que a atribuição feita pela Talita chegou do outro lado.
 */
export default async function MeusProjetosPage() {
  const ctx = await exigirAcessoARota("/meus-projetos");
  const atribuicoes = await listarAtribuicoesDetalhadas(ctx, ctx.usuarioId);
  const projetos = atribuicoes.filter((a) => a.entidadeTipo === "PROJETO");

  return (
    <div className="w-full max-w-[900px]">
      <h1 className="text-[24px] sm:text-[28px]">Meus projetos</h1>
      <p className="mt-1.5 text-[15px] text-cinza">
        Os projetos em que você está atribuído.
      </p>

      {projetos.length === 0 ? (
        <p className="mt-7 rounded-[3px] border border-linha bg-branco px-6 py-8 text-center text-[15px] text-cinza">
          Nenhum projeto atribuído a você ainda.
        </p>
      ) : (
        <ul className="mt-7 overflow-hidden rounded-[3px] border border-linha bg-branco">
          {projetos.map((projeto) => (
            <li key={projeto.id} className="border-b border-linha px-5 py-4 last:border-b-0">
              <p className="font-[family-name:var(--font-interface)] text-[15px] font-semibold text-tinta">
                {projeto.entidadeNome ?? "(projeto removido)"}
              </p>
              <p className="text-[14px] text-cinza">{projeto.cliente ?? "—"}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
