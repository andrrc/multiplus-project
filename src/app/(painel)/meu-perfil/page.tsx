import type { Perfil } from "@prisma/client";
import { obterContexto } from "@/server/auth/contexto";
import { buscarUsuario, listarAtribuicoesDetalhadas } from "@/lib/usuarios";
import { Etiqueta } from "@/ui/campo";
import { FormularioDados, FormularioSenha } from "./formularios";

const NOME_PERFIL: Record<Perfil, string> = {
  ADMIN: "Administrador",
  ADMIN_INTERNO: "Colaborador Interno",
  ADMIN_EXTERNO: "Colaborador Externo",
  CLIENTE: "Cliente",
};

/**
 * Tela A6 (RF-042) — acessível a todos os perfis, e a única tela de administração que não
 * é do Administrador. Por isso não usa `exigirAcessoARota` com restrição de perfil: cada
 * pessoa vê e edita a própria linha, identificada pela sessão.
 */
export default async function MeuPerfilPage() {
  const ctx = await obterContexto();

  const [usuario, atribuicoes] = await Promise.all([
    buscarUsuario(ctx, ctx.usuarioId),
    listarAtribuicoesDetalhadas(ctx, ctx.usuarioId),
  ]);

  if (!usuario) return null;

  const ehAdministrador = ctx.perfil === "ADMIN";

  return (
    <div className="w-full max-w-[720px]">
      <h1 className="text-[24px] sm:text-[28px]">Meu perfil</h1>
      <p className="mt-1.5 text-[15px] text-cinza">Seus dados de acesso ao Múltiplus.</p>

      <section className="mt-9">
        <h2 className="text-[19px]">Meus dados</h2>
        <div className="mt-4 max-w-sm">
          <FormularioDados
            nome={usuario.nome}
            email={usuario.email}
            perfil={NOME_PERFIL[usuario.perfil]}
            emailEditavel={ehAdministrador}
          />
        </div>

      </section>

      <section className="mt-10 border-t border-linha pt-8">
        <h2 className="text-[19px]">Segurança</h2>
        <p className="mt-1.5 text-[15px] text-cinza">
          Para trocar a senha, informe a atual.
        </p>
        <div className="mt-4">
          <FormularioSenha />
        </div>
      </section>

      {!ehAdministrador && (
        <section className="mt-10 border-t border-linha pt-8">
          <h2 className="text-[19px]">Minhas atribuições</h2>
          {atribuicoes.length === 0 ? (
            <p className="mt-4 rounded-[3px] border border-linha bg-branco px-5 py-4 text-[14.5px] text-cinza">
              Você ainda não tem nada atribuído. Fale com a administração para receber acesso
              a um projeto ou tarefa.
            </p>
          ) : (
            <ul className="mt-4 overflow-hidden rounded-[3px] border border-linha bg-branco">
              {atribuicoes.map((atribuicao) => (
                <li
                  key={atribuicao.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-linha px-5 py-4 last:border-b-0"
                >
                  <div>
                    <p className="font-[family-name:var(--font-interface)] text-[14.5px] font-medium text-tinta">
                      {atribuicao.entidadeNome ?? "(registro removido)"}
                    </p>
                    <p className="text-[13.5px] text-cinza">
                      {atribuicao.cliente ?? "—"} ·{" "}
                      {atribuicao.entidadeTipo === "PROJETO" ? "Projeto" : "Tarefa"}
                    </p>
                  </div>
                  <Etiqueta>{atribuicao.entidadeTipo === "PROJETO" ? "Projeto" : "Tarefa"}</Etiqueta>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
