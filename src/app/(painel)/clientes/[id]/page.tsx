import Link from "next/link";
import { notFound } from "next/navigation";
import { obterContexto } from "@/server/auth/contexto";
import { buscarClienteDetalheSeguro } from "@/lib/clientes";
import { documentoCliente, formatarCpf, formatarTelefone } from "@/lib/formatacao";
import { Etiqueta } from "../campo";
import {
  FormularioDocumento,
  FormularioPessoaEnvolvida,
  BotaoCriarAcesso,
  BotaoCriarAcessoPessoaEnvolvida,
  BotaoAlternarAcesso,
} from "./acoes-cliente";

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

/**
 * `valor === null` é ambíguo por natureza (RF-020 mascara o telefone via view, mas o campo
 * também é opcional desde RF-002d) — `souAdmin` desfaz a ambiguidade pra mostrar a mensagem
 * certa em cada caso.
 */
function Telefone({ valor, souAdmin }: { valor: string | null; souAdmin: boolean }) {
  if (valor === null) {
    return (
      <span className="font-[family-name:var(--font-leitura)] text-[14px] text-cinza italic">
        {souAdmin ? "não informado" : "oculto para o seu perfil"}
      </span>
    );
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

  const { cliente, responsavelLegal, pontoContato, pessoasEnvolvidas, documentos, usuarioAcesso } = detalhe;

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
            <span className="tabular-nums text-[#C4DCE4]">{documentoCliente(cliente)}</span>
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

      <Bloco titulo={cliente.tipo === "PESSOA_JURIDICA" ? "Dados da empresa" : "Dados pessoais"}>
        <div className="grid grid-cols-3 gap-5">
          {cliente.origemContato && <Campo label="Origem do contato" valor={cliente.origemContato} />}
          {cliente.endereco && <Campo label="Endereço" valor={cliente.endereco} />}
          {cliente.municipio && (
            <Campo label="Município" valor={cliente.estado ? `${cliente.municipio} - ${cliente.estado}` : cliente.municipio} />
          )}
          {cliente.atividadePrincipal && <Campo label="Atividade principal" valor={cliente.atividadePrincipal} />}
          {cliente.tipo === "PESSOA_JURIDICA" && cliente.porte && <Campo label="Porte" valor={cliente.porte} />}
          {cliente.tipo === "PESSOA_FISICA" && (
            <>
              {cliente.rg && <Campo label="RG" valor={cliente.rg} />}
              {cliente.cep && <Campo label="CEP" valor={cliente.cep} />}
              {cliente.email && <Campo label="E-mail" valor={cliente.email} />}
            </>
          )}
        </div>
      </Bloco>

      {responsavelLegal && (responsavelLegal.nome || responsavelLegal.email || responsavelLegal.cpf) && (
        <Bloco titulo="Responsável Legal">
          <div className="grid grid-cols-3 gap-5">
            {responsavelLegal.nome && <Campo label="Nome" valor={responsavelLegal.nome} />}
            {responsavelLegal.email && <Campo label="E-mail" valor={responsavelLegal.email} />}
            <Campo label="Telefone" valor={<Telefone valor={responsavelLegal.telefone} souAdmin={ctx.perfil === "ADMIN"} />} />
            {responsavelLegal.endereco && <Campo label="Endereço" valor={responsavelLegal.endereco} />}
            {responsavelLegal.rg && <Campo label="RG" valor={responsavelLegal.rg} />}
            {responsavelLegal.cpf && (
              <Campo label="CPF" valor={<span className="tabular-nums">{formatarCpf(responsavelLegal.cpf)}</span>} />
            )}
          </div>
        </Bloco>
      )}

      {pontoContato && (pontoContato.nome || pontoContato.email || pontoContato.cpf) && (
        <Bloco titulo="Ponto de Contato">
          <div className="grid grid-cols-3 gap-5">
            {pontoContato.nome && <Campo label="Nome" valor={pontoContato.nome} />}
            {pontoContato.cargo && <Campo label="Cargo" valor={pontoContato.cargo} />}
            {pontoContato.email && <Campo label="E-mail" valor={pontoContato.email} />}
            <Campo label="Telefone" valor={<Telefone valor={pontoContato.telefone} souAdmin={ctx.perfil === "ADMIN"} />} />
            {pontoContato.endereco && <Campo label="Endereço" valor={pontoContato.endereco} />}
            {pontoContato.cpf && (
              <Campo label="CPF" valor={<span className="tabular-nums">{formatarCpf(pontoContato.cpf)}</span>} />
            )}
          </div>
        </Bloco>
      )}

      <Bloco
        titulo="Pessoas Envolvidas"
        acao={ctx.perfil === "ADMIN" ? <FormularioPessoaEnvolvida clienteId={id} /> : undefined}
      >
        {pessoasEnvolvidas.length === 0 ? (
          <p className="font-[family-name:var(--font-leitura)] text-[14.5px] text-cinza">
            Nenhuma pessoa envolvida cadastrada.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pessoasEnvolvidas.map((pessoa) => (
              <li
                key={pessoa.id}
                className="flex items-baseline gap-3 font-[family-name:var(--font-interface)] text-[14.5px]"
              >
                <span className="font-medium text-tinta">{pessoa.nome}</span>
                <span className="text-cinza">{pessoa.tipo === "EMPRESA" ? "Empresa" : "Pessoa"}</span>
                {pessoa.telefone && <span className="text-cinza">· {pessoa.telefone}</span>}
                {pessoa.email && <span className="text-cinza">· {pessoa.email}</span>}
                {pessoa.temAcesso ? (
                  <Etiqueta destaque>Colaborador</Etiqueta>
                ) : ctx.perfil === "ADMIN" ? (
                  <BotaoCriarAcessoPessoaEnvolvida clienteId={id} pessoaEnvolvidaId={pessoa.id} />
                ) : null}
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
