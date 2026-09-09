import Link from "next/link";
import { notFound } from "next/navigation";
import { obterContexto } from "@/server/auth/contexto";
import { buscarClienteDetalheSeguro } from "@/lib/clientes";
import { formatarCnpj, formatarCpf, formatarTelefone } from "@/lib/formatacao";
import { Etiqueta } from "../campo";
import { FormularioDocumento, BotaoCriarAcesso, BotaoAlternarAcesso } from "./acoes-cliente";

function Bloco({ titulo, acao, children }: { titulo: string; acao?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[3px] border border-linha bg-branco px-6 py-[22px]">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px]">{titulo}</h2>
        {acao}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Campo({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div>
      <p className="font-[family-name:var(--font-interface)] text-[11.5px] font-medium tracking-[0.04em] text-cinza uppercase">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-interface)] text-[14.5px] text-tinta">{valor}</p>
    </div>
  );
}

function Telefone({ valor }: { valor: string | null }) {
  if (valor === null) {
    return <span className="font-[family-name:var(--font-leitura)] text-[14px] text-cinza italic">oculto para o seu perfil</span>;
  }
  return <span className="tabular-nums">{formatarTelefone(valor)}</span>;
}

const STATUS_ACESSO: Record<string, { texto: string; cor: string }> = {
  bloqueado: { texto: "Bloqueado", cor: "bg-critico" },
  pendente: { texto: "Pendente de ativação", cor: "bg-ambar" },
  ativo: { texto: "Ativo", cor: "bg-verde-esc" },
};

export default async function DetalheClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await obterContexto();
  const detalhe = await buscarClienteDetalheSeguro(ctx, id);
  if (!detalhe) notFound();

  const { cliente, responsavelLegal, pontoContato, pessoasOperacional, documentos, usuarioAcesso } = detalhe;

  const statusChave = !usuarioAcesso
    ? null
    : !usuarioAcesso.ativo
      ? "bloqueado"
      : usuarioAcesso.senhaHash
        ? "ativo"
        : "pendente";

  return (
    <div className="flex max-w-[880px] flex-col gap-5">
      <div
        className="flex items-start justify-between rounded-[4px] px-10 py-9"
        style={{ background: "linear-gradient(112deg, #0B2530 0%, #14485C 58%, #12703F 130%)" }}
      >
        <div>
          <h1 className="text-[30px] text-branco">{cliente.razaoSocial}</h1>
          <div className="mt-3 flex items-center gap-3 font-[family-name:var(--font-interface)] text-[14px]">
            <span className="tabular-nums text-[#C4DCE4]">{formatarCnpj(cliente.cnpj)}</span>
            <span className="rounded-[2px] bg-verde px-2.5 py-1 text-[13px] font-medium text-tinta">
              {cliente.segmento}
            </span>
          </div>
        </div>
        {ctx.perfil === "ADMIN" && (
          <Link
            href={`/clientes/${id}/editar`}
            className="shrink-0 rounded-[3px] border border-[#2C5567] px-4 py-2 font-[family-name:var(--font-interface)] text-[14px] font-medium text-[#C4DCE4] hover:border-[#C4DCE4] hover:text-branco"
          >
            Editar
          </Link>
        )}
      </div>

      <Bloco titulo="Dados da empresa">
        <div className="grid grid-cols-3 gap-5">
          <Campo label="Origem do contato" valor={cliente.origemContato} />
          {cliente.endereco && <Campo label="Endereço" valor={cliente.endereco} />}
        </div>
      </Bloco>

      {responsavelLegal && (
        <Bloco titulo="Responsável Legal">
          <div className="grid grid-cols-3 gap-5">
            <Campo label="Nome" valor={responsavelLegal.nome} />
            <Campo label="E-mail" valor={responsavelLegal.email} />
            <Campo label="Telefone" valor={<Telefone valor={responsavelLegal.telefone} />} />
            <Campo label="Endereço" valor={responsavelLegal.endereco} />
            <Campo label="RG" valor={responsavelLegal.rg} />
            <Campo label="CPF" valor={<span className="tabular-nums">{formatarCpf(responsavelLegal.cpf)}</span>} />
          </div>
        </Bloco>
      )}

      {pontoContato && (
        <Bloco titulo="Ponto de Contato">
          <div className="grid grid-cols-3 gap-5">
            <Campo label="Nome" valor={pontoContato.nome} />
            <Campo label="Cargo" valor={pontoContato.cargo} />
            <Campo label="E-mail" valor={pontoContato.email} />
            <Campo label="Telefone" valor={<Telefone valor={pontoContato.telefone} />} />
            <Campo label="Endereço" valor={pontoContato.endereco} />
            <Campo label="CPF" valor={<span className="tabular-nums">{formatarCpf(pontoContato.cpf)}</span>} />
          </div>
        </Bloco>
      )}

      <Bloco titulo="Pessoas do operacional">
        {pessoasOperacional.length === 0 ? (
          <p className="font-[family-name:var(--font-leitura)] text-[14.5px] text-cinza">
            Nenhuma pessoa do operacional cadastrada.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pessoasOperacional.map((pessoa) => (
              <li
                key={pessoa.id}
                className="flex items-baseline gap-3 font-[family-name:var(--font-interface)] text-[14.5px]"
              >
                <span className="font-medium text-tinta">{pessoa.nome}</span>
                <span className="text-cinza">{pessoa.cargo}</span>
                {pessoa.email && <span className="text-cinza">· {pessoa.email}</span>}
              </li>
            ))}
          </ul>
        )}
      </Bloco>

      <Bloco titulo="Documentos" acao={ctx.perfil === "ADMIN" ? <FormularioDocumento clienteId={id} /> : undefined}>
        {documentos.length === 0 ? (
          <p className="font-[family-name:var(--font-leitura)] text-[14.5px] text-cinza">
            Nenhum documento vinculado ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {documentos.map((doc) => (
              <li key={doc.id} className="font-[family-name:var(--font-interface)] text-[14.5px]">
                <a href={doc.link} target="_blank" rel="noreferrer" className="text-azul-esc hover:underline">
                  {doc.nome}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Bloco>

      {ctx.perfil === "ADMIN" && (
        <Bloco titulo="Acesso do cliente">
          {!usuarioAcesso || !statusChave ? (
            <BotaoCriarAcesso clienteId={id} />
          ) : (
            <div className="flex items-center gap-3">
              <span className={`h-[7px] w-[7px] rounded-full ${STATUS_ACESSO[statusChave].cor}`} />
              <p className="font-[family-name:var(--font-interface)] text-[14.5px] text-tinta">
                {STATUS_ACESSO[statusChave].texto}
              </p>
              <span className="text-linha">·</span>
              <BotaoAlternarAcesso clienteId={id} usuarioId={usuarioAcesso.id} ativo={usuarioAcesso.ativo} />
            </div>
          )}
        </Bloco>
      )}
    </div>
  );
}
