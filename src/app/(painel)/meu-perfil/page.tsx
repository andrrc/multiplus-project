/**
 * Meu perfil (protótipos 09 do interno, 04 do externo e 04 do cliente): a mesma tela para os quatro
 * perfis. Cartões "Meus dados", "Senha" e "O que você acessa". Cada pessoa vê e edita só a própria
 * linha, identificada pela sessão (RF-042), por isso não usa `exigirAcessoARota` com restrição de perfil.
 * Telefone editável e a tabela de avisos recebidos dependem de dado novo e ficaram de fora.
 */
import type { Perfil } from "@prisma/client";
import { obterContexto } from "@/server/auth/contexto";
import { buscarUsuario, listarAtribuicoesDetalhadas } from "@/lib/usuarios";
import { formatarCnpj, formatarCpf, formatarTelefone } from "@/lib/formatacao";
import { Cartao, Avatar } from "@/ui/cartao";
import { Etiqueta } from "@/ui/campo";
import { FormularioDados, FormularioSenha } from "./formularios";

const NOME_PERFIL: Record<Perfil, string> = {
  ADMIN: "Administração",
  ADMIN_INTERNO: "Colaborador interno",
  ADMIN_EXTERNO: "Colaborador externo",
  CLIENTE: "Cliente",
};

export default async function MeuPerfilPage() {
  const ctx = await obterContexto();

  const [usuario, atribuicoes] = await Promise.all([
    buscarUsuario(ctx, ctx.usuarioId),
    listarAtribuicoesDetalhadas(ctx, ctx.usuarioId),
  ]);

  if (!usuario) return null;

  const ehAdministrador = ctx.perfil === "ADMIN";
  const mostraAtribuicoes = ctx.perfil === "ADMIN_INTERNO" || ctx.perfil === "ADMIN_EXTERNO";
  const documentos = [
    usuario.cpf ? { rotulo: "CPF", valor: formatarCpf(usuario.cpf) } : null,
    usuario.cnpj ? { rotulo: "CNPJ", valor: formatarCnpj(usuario.cnpj) } : null,
  ].filter((item): item is { rotulo: string; valor: string } => item !== null);

  return (
    <div className="w-full max-w-[860px]">
      <h1 className="text-2xl">Meu perfil</h1>

      <div className="mt-6 flex flex-col gap-4">
        <Cartao titulo="Meus dados">
          <div className="flex items-center gap-4 pb-5">
            <Avatar nome={usuario.nome} tamanho={52} />
            <div className="min-w-0">
              <p className="truncate font-[family-name:var(--font-interface)] text-lg font-semibold">{usuario.nome}</p>
              <p className="mt-1"><Etiqueta tom="info">{NOME_PERFIL[usuario.perfil]}</Etiqueta></p>
            </div>
          </div>
          <FormularioDados
            nome={usuario.nome}
            email={usuario.email}
            emailEditavel={ehAdministrador}
            cargo={usuario.cargo ?? null}
            telefone={usuario.telefone ? formatarTelefone(usuario.telefone) : null}
          />
          {/* RF-042 dá ao próprio usuário apenas o nome para editar; os demais dados são definição da administração. */}
          {documentos.length > 0 && (
            <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-linha pt-4 text-[13px] sm:grid-cols-2">
              {documentos.map((documento) => (
                <div key={documento.rotulo}>
                  <dt className="text-cinza">{documento.rotulo}</dt>
                  <dd className="mt-0.5 tabular-nums">{documento.valor}</dd>
                </div>
              ))}
              <p className="text-cinza sm:col-span-2">Para corrigir estes dados, fale com a administração.</p>
            </dl>
          )}
        </Cartao>

        <Cartao titulo="Senha" acao={<span className="text-[13px] text-cinza">Para trocar, informe a senha atual.</span>}>
          <FormularioSenha />
        </Cartao>

        {mostraAtribuicoes && (
          <Cartao titulo="O que você acessa" semMargem acao={<span className="text-[13px] text-cinza">Para mudar, fale com a administração.</span>}>
            {atribuicoes.length === 0 ? (
              <p className="px-5 py-4 text-sm text-cinza">
                Você ainda não tem nada atribuído. Fale com a administração para receber acesso a um projeto ou tarefa.
              </p>
            ) : (
              <ul>
                {atribuicoes.map((atribuicao) => (
                  <li
                    key={atribuicao.id}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-linha px-5 py-3 text-sm last:border-b-0"
                  >
                    <span className="min-w-0 break-words font-[family-name:var(--font-interface)] font-medium">
                      {atribuicao.entidadeNome ?? "(registro removido)"}
                      <span className="ml-2 text-xs font-normal text-cinza">
                        {atribuicao.entidadeTipo === "PROJETO" ? "Projeto" : "Tarefa"}
                      </span>
                    </span>
                    <span className="min-w-0 break-words text-cinza">{atribuicao.cliente ?? "Cliente não informado"}</span>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        )}
      </div>
    </div>
  );
}
