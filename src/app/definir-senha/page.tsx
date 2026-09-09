import { DefinirSenhaForm } from "./definir-senha-form";

export default async function DefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold text-gray-900">Defina sua senha</h1>
        <p className="mb-6 text-sm text-gray-500">
          Escolha uma senha para acessar o Múltiplus Software.
        </p>
        {token ? (
          <DefinirSenhaForm token={token} />
        ) : (
          <p className="text-sm text-red-600">Link inválido — falta o token de acesso.</p>
        )}
      </div>
    </main>
  );
}
