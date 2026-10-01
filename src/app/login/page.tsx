import type { Metadata } from "next";
import { AuthShell } from "../auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; motivo?: string }>;
}) {
  const { callbackUrl, motivo } = await searchParams;
  const sessaoInvalidada = motivo === "sessao-invalidada";

  return (
    <AuthShell
      titulo="Múltiplus Software"
      subtitulo={sessaoInvalidada
        ? "Sua sessão não é mais válida. Entre novamente com uma conta ativa."
        : "Entre com seu e-mail e senha."}
    >
      <LoginForm callbackUrl={callbackUrl ?? "/"} />
    </AuthShell>
  );
}
