import { auth, signOut } from "@/server/auth";

const NOME_PERFIL: Record<string, string> = {
  ADMIN: "Administrador",
  ADMIN_INTERNO: "Administrador Interno",
  ADMIN_EXTERNO: "Administrador Externo",
  CLIENTE: "Cliente",
};

export default async function Home() {
  const session = await auth();
  const usuario = session!.user;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-gray-500">Logado como</p>
        <h1 className="mt-1 text-lg font-semibold text-gray-900">{usuario.name}</h1>
        <p className="text-sm text-gray-500">{usuario.email}</p>
        <p className="mt-2 inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
          {NOME_PERFIL[usuario.perfil] ?? usuario.perfil}
        </p>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          className="mt-6"
        >
          <button
            type="submit"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Sair
          </button>
        </form>
      </div>
    </main>
  );
}
