import type { Metadata } from "next";
import { AuthShell } from "../auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; motivo?: string }>;
}) {
  // No Next atual, searchParams é assíncrono e precisa ser aguardado no Server Component.
  const { callbackUrl, motivo } = await searchParams;
  // O parâmetro permite mostrar motivo de invalidação sem expor detalhes internos.
  const sessaoInvalidada = motivo === "sessao-invalidada";

  return (
    <AuthShell
      titulo="SGA Múltiplus Ambiental"
      subtitulo={sessaoInvalidada
        ? "Sua sessão não é mais válida. Entre novamente com uma conta ativa."
        : "Entre com seu e-mail e senha."}
    >
      {/* Mantém o destino solicitado, usando a página inicial quando não há retorno definido. */}
      <LoginForm callbackUrl={callbackUrl ?? "/"} />
    </AuthShell>
  );
}
