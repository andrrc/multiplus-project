import type { Metadata } from "next";
import { AuthShell } from "../auth-shell";
import { EsqueciSenhaForm } from "./esqueci-senha-form";

export const metadata: Metadata = { title: "Recuperar acesso" };

export default function EsqueciSenhaPage() {
  return (
    <AuthShell
      titulo="Esqueci minha senha"
      subtitulo="Informe seu e-mail cadastrado para receber o link de redefinição."
    >
      <EsqueciSenhaForm />
    </AuthShell>
  );
}
