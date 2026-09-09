import { AuthShell } from "../auth-shell";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <AuthShell titulo="Múltiplus Software" subtitulo="Entre com seu e-mail e senha.">
      <LoginForm callbackUrl={callbackUrl ?? "/"} />
    </AuthShell>
  );
}
