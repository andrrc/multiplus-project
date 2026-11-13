"use client";
/**
 * Formulários do perfil: dados (só o nome é editável, RF-042) e troca de senha com os requisitos
 * conferidos enquanto a pessoa digita. A validação de verdade continua no servidor (`actions.ts`).
 */

import { useActionState, useState } from "react";
import { Campo, inputClass } from "@/ui/campo";
import { botaoPrimario } from "@/ui/botoes";
import { NaoInformado } from "@/ui/cartao";
import { avaliarSenha } from "@/lib/politica-senha";
import { alterarSenhaAction, atualizarNomeAction, type EstadoPerfil } from "./actions";

function Retorno({ estado }: { estado: EstadoPerfil }) {
  if (!estado.erro && !estado.mensagem) return null;
  return (
    <p
      role={estado.erro ? "alert" : "status"}
      className={`rounded-controle border px-4 py-3 text-sm ${
        estado.erro ? "border-critico bg-critico-cl text-critico" : "border-verde bg-verde-cl text-verde-esc"
      }`}
    >
      {estado.erro ?? estado.mensagem}
    </p>
  );
}

/** Campo que a administração define: aparece desabilitado, com a dica ao lado do rótulo. */
function CampoSomenteLeitura({ rotulo, valor, dica }: { rotulo: string; valor: string | null; dica?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="font-[family-name:var(--font-interface)] text-[13px] font-medium text-ink">
        {rotulo}
        {dica && <span className="font-normal text-faint"> ({dica})</span>}
      </span>
      <p className="flex min-h-11 items-center break-all rounded-controle border border-linha bg-papel px-3 py-2 text-sm text-cinza md:min-h-10">
        {valor || <NaoInformado />}
      </p>
    </div>
  );
}

export function FormularioDados({
  nome,
  email,
  emailEditavel,
  cargo,
  telefone,
}: {
  nome: string;
  email: string;
  emailEditavel: boolean;
  cargo: string | null;
  telefone: string | null;
}) {
  const [estado, formAction, pendente] = useActionState<EstadoPerfil, FormData>(atualizarNomeAction, {});
  const [nomeDigitado, setNomeDigitado] = useState(nome);
  const alterado = nomeDigitado.trim() !== nome && nomeDigitado.trim() !== "";
  // A administração corrige estes dados em Usuários; os demais perfis pedem a ela.
  const dicaEdicao = emailEditavel ? "altere em Usuários" : "só a administração altera";

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <Campo label="Nome" obrigatorio>
        <input
          name="nome"
          required
          value={nomeDigitado}
          onChange={(evento) => setNomeDigitado(evento.target.value)}
          className={inputClass}
        />
      </Campo>
      <CampoSomenteLeitura rotulo="Telefone" valor={telefone} dica={dicaEdicao} />
      <CampoSomenteLeitura rotulo="E-mail" valor={email} dica={dicaEdicao} />
      <CampoSomenteLeitura rotulo="Cargo ou função" valor={cargo} dica={dicaEdicao} />

      <div className="sm:col-span-2 empty:hidden"><Retorno estado={estado} /></div>

      <div className="flex justify-end sm:col-span-2">
        <button type="submit" disabled={pendente || !alterado} className={`${botaoPrimario} max-sm:w-full`}>
          {pendente ? "Salvando…" : "Salvar nome"}
        </button>
      </div>
    </form>
  );
}

export function FormularioSenha() {
  const [estado, formAction, pendente] = useActionState<EstadoPerfil, FormData>(alterarSenhaAction, {});
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [confirmar, setConfirmar] = useState("");

  const requisitos = [
    ...avaliarSenha(senhaNova),
    { id: "iguais", descricao: "As duas senhas iguais", ok: senhaNova !== "" && senhaNova === confirmar },
  ];
  const pronto = senhaAtual !== "" && requisitos.every((requisito) => requisito.ok);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <Campo label="Senha atual" obrigatorio>
        <input
          name="senhaAtual"
          type="password"
          required
          autoComplete="current-password"
          value={senhaAtual}
          onChange={(evento) => setSenhaAtual(evento.target.value)}
          className={inputClass}
        />
      </Campo>
      <span className="max-sm:hidden" aria-hidden="true" />

      <Campo label="Nova senha" obrigatorio>
        <input
          name="senhaNova"
          type="password"
          required
          autoComplete="new-password"
          value={senhaNova}
          onChange={(evento) => setSenhaNova(evento.target.value)}
          className={inputClass}
        />
      </Campo>
      <Campo label="Confirmar nova senha" obrigatorio>
        <input
          name="confirmarSenha"
          type="password"
          required
          autoComplete="new-password"
          value={confirmar}
          onChange={(evento) => setConfirmar(evento.target.value)}
          className={inputClass}
        />
      </Campo>

      <ul aria-label="Requisitos da senha" className="grid gap-x-4 gap-y-1.5 sm:col-span-2 sm:grid-cols-2">
        {requisitos.map((requisito) => (
          <li
            key={requisito.id}
            className={`flex items-center gap-2 text-[13px] ${requisito.ok ? "text-verde-esc" : "text-cinza"}`}
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4 shrink-0">
              <circle cx="8" cy="8" r="6.25" />
              {requisito.ok && <path d="m5 8.2 2 2 4-4.2" />}
            </svg>
            {requisito.descricao}
          </li>
        ))}
      </ul>

      <div className="sm:col-span-2 empty:hidden"><Retorno estado={estado} /></div>

      <div className="flex justify-end sm:col-span-2">
        <button type="submit" disabled={pendente || !pronto} className={`${botaoPrimario} max-sm:w-full`}>
          {pendente ? "Alterando…" : "Alterar senha"}
        </button>
      </div>
    </form>
  );
}
