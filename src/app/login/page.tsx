import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold text-gray-900">Múltiplus Software</h1>
        <p className="mb-6 text-sm text-gray-500">Entre com seu e-mail e senha.</p>
        <LoginForm callbackUrl={callbackUrl ?? "/"} />
      </div>
    </main>
  );
}
