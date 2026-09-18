import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { validarTokenAcesso } from "@/lib/tokens";
import { AuthShell } from "../auth-shell";
import { DefinirSenhaForm } from "./definir-senha-form";

export const metadata: Metadata = { title: "Definir senha" };

/**
 * Tela A4 (RF-030/RF-031/RF-032). O token é validado já na renderização para que o estado
 * "expirado" ou "já usado" apareça ao abrir o link — e não depois de a pessoa escolher e
 * digitar uma senha duas vezes. A validação continua acontecendo na Server Action: esta
 * aqui é só o que a tela mostra, não o que autoriza.
 */
function LinkInvalido({ mensagem }: { mensagem: string }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-[3px] border-l-[3px] border-critico bg-branco px-4 py-3 text-[14.5px] text-critico">
        {mensagem}
      </p>
      <a
        href="/esqueci-senha"
        className="flex min-h-11 items-center justify-center rounded-[3px] bg-tinta px-3.5 py-2.5 font-[family-name:var(--font-interface)] text-[14.5px] font-semibold text-branco hover:bg-tinta2"
      >
        Solicitar um novo link
      </a>
    </div>
  );
}

export default async function DefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthShell titulo="Definir sua senha" subtitulo="Este link não está completo.">
        <LinkInvalido mensagem="Link inválido — falta o token de acesso." />
      </AuthShell>
    );
  }

  const validacao = await validarTokenAcesso(token);

  if (!validacao.valido) {
    const mensagem =
      validacao.motivo === "expirado"
        ? "Este link expirou. Solicite um novo para continuar."
        : validacao.motivo === "ja_usado"
          ? "Este link já foi usado. Se precisar trocar a senha, solicite um novo."
          : "Link inválido.";

    return (
      <AuthShell titulo="Definir sua senha" subtitulo="Não foi possível usar este link.">
        <LinkInvalido mensagem={mensagem} />
      </AuthShell>
    );
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: validacao.usuarioId },
    select: { nome: true },
  });

  const primeiroNome = usuario?.nome.split(" ")[0];

  return (
    <AuthShell
      titulo={primeiroNome ? `Olá, ${primeiroNome}` : "Definir sua senha"}
      subtitulo="Crie uma senha para acessar o Múltiplus Software."
    >
      <DefinirSenhaForm token={token} />
    </AuthShell>
  );
}
