import { notFound } from "next/navigation";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { buscarUsuario, listarOpcoesDeAtribuicao } from "@/lib/usuarios";
import { UsuarioForm } from "../../usuario-form";
import { atualizarUsuarioAction } from "./actions";

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await exigirAcessoARota("/usuarios");

  const usuario = await buscarUsuario(ctx, id);
  if (!usuario) notFound();

  const [opcoesProjeto, opcoesTarefa] = await Promise.all([
    listarOpcoesDeAtribuicao(ctx, "ADMIN_INTERNO"),
    listarOpcoesDeAtribuicao(ctx, "ADMIN_EXTERNO"),
  ]);

  return (
    <UsuarioForm
      acao={atualizarUsuarioAction.bind(null, id)}
      titulo="Editar usuário"
      rotuloEnvio="Salvar alterações"
      inicial={{
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      }}
      opcoesProjeto={opcoesProjeto}
      opcoesTarefa={opcoesTarefa}
      // As atribuições deste usuário têm tela própria (A3), com a origem de cada uma —
      // repeti-las aqui como caixas de seleção esconderia quais não podem ser removidas.
      mostrarAtribuicoes={false}
    />
  );
}
