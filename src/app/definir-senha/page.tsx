import { AuthShell } from "../auth-shell";
import { DefinirSenhaForm } from "./definir-senha-form";

export default async function DefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthShell titulo="Defina sua senha" subtitulo="Escolha uma senha para acessar o Múltiplus Software.">
      {token ? (
        <DefinirSenhaForm token={token} />
      ) : (
        <p className="rounded-[3px] border-l-[3px] border-critico bg-branco px-4 py-3 text-[14.5px] text-critico">
          Link inválido — falta o token de acesso.
        </p>
      )}
    </AuthShell>
  );
}
