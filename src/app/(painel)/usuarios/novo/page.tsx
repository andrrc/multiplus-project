import { exigirAcessoARota } from "@/server/auth/contexto";
import { listarOpcoesDeAtribuicao } from "@/lib/usuarios";
import { UsuarioForm } from "../usuario-form";
import { criarUsuarioAction } from "./actions";

export default async function NovoUsuarioPage() {
  const ctx = await exigirAcessoARota("/usuarios");

  // As duas listas vêm de uma vez porque a troca de perfil acontece no cliente; buscar de
  // novo a cada troca faria o formulário piscar para mostrar, hoje, duas listas vazias.
  const [opcoesProjeto, opcoesTarefa] = await Promise.all([
    listarOpcoesDeAtribuicao(ctx, "ADMIN_INTERNO"),
    listarOpcoesDeAtribuicao(ctx, "ADMIN_EXTERNO"),
  ]);

  return (
    <UsuarioForm
      acao={criarUsuarioAction}
      titulo="Novo usuário"
      rotuloEnvio="Salvar e enviar convite"
      opcoesProjeto={opcoesProjeto}
      opcoesTarefa={opcoesTarefa}
    />
  );
}
