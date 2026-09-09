import { EsqueciSenhaForm } from "./esqueci-senha-form";

export default function EsqueciSenhaPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold text-gray-900">Esqueci minha senha</h1>
        <p className="mb-6 text-sm text-gray-500">
          Informe seu e-mail cadastrado para receber o link de redefinição.
        </p>
        <EsqueciSenhaForm />
      </div>
    </main>
  );
}
