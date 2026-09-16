import Link from "next/link";
import { notFound } from "next/navigation";
import { obterContexto } from "@/server/auth/contexto";
import { buscarClienteDetalheSeguro } from "@/lib/clientes";
import { documentoCliente, formatarCpf, formatarTelefone } from "@/lib/formatacao";
import { Etiqueta } from "@/ui/campo";
import {
  FormularioDocumento,
  FormularioPessoaEnvolvida,
  BotaoCriarAcesso,
  BotaoCriarAcessoPessoaEnvolvida,
  BotaoAlternarAcesso,
  BotaoDesativar,
} from "./acoes-cliente";

function Bloco({ titulo, acao, children }: { titulo: string; acao?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[3px] border border-linha bg-branco px-5 py-[22px] sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
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

export default async function DetalheClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ desativados?: string }>;
}) {
  const { id } = await params;
  const { desativados } = await searchParams;
  const ctx = await obterContexto();

  // RF-039 — o toggle só faz sentido para quem pode reativar; para os demais perfis a RLS
  // já não devolve registro desativado, então pedir por ele não muda nada.
  const mostrarDesativados = desativados === "1" && ctx.perfil === "ADMIN";
  const detalhe = await buscarClienteDetalheSeguro(ctx, id, mostrarDesativados);
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
    <div className="flex w-full max-w-[880px] flex-col gap-5">
      <div
        className="flex flex-col gap-4 rounded-[4px] px-6 py-7 sm:flex-row sm:items-start sm:justify-between sm:px-10 sm:py-9"
        style={{ background: "linear-gradient(112deg, #0B2530 0%, #14485C 58%, #12703F 130%)" }}
      >
        <div>
          <h1 className="text-[24px] text-branco sm:text-[30px]">{cliente.razaoSocial}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 font-[family-name:var(--font-interface)] text-[14px]">
            <span className="tabular-nums text-[#C4DCE4]">{documentoCliente(cliente)}</span>
            <span className="rounded-[2px] bg-verde px-2.5 py-1 text-[13px] font-medium text-tinta">
              {cliente.segmento}
            </span>
          </div>
        </div>
        {ctx.perfil === "ADMIN" && cliente.ativo && (
          <Link
            href={`/clientes/${id}/editar`}
            className="flex min-h-11 shrink-0 items-center self-start rounded-[3px] border border-[#2C5567] px-4 py-2 font-[family-name:var(--font-interface)] text-[14px] font-medium text-[#C4DCE4] hover:border-[#C4DCE4] hover:text-branco"
          >
            Editar
          </Link>
        )}
      </div>

      {/* RF-039 — cliente desativado é somente leitura; a faixa diz isso antes de a pessoa
          procurar o botão de editar que não está mais lá. */}
      {!cliente.ativo && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[3px] border-l-[3px] border-ambar bg-branco px-5 py-4">
          <p className="text-[14.5px] text-ambar">
            Cliente desativado. O cadastro e tudo que depende dele estão em modo somente
            leitura.
          </p>
          {ctx.perfil === "ADMIN" && (
            <BotaoDesativar
              clienteId={id}
              entidade="cliente"
              id={id}
              ativo={false}
              efeito=""
            />
          )}
        </div>
      )}

      <Bloco titulo={cliente.tipo === "PESSOA_JURIDICA" ? "Dados da empresa" : "Dados pessoais"}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
        acao={
          ctx.perfil === "ADMIN" && cliente.ativo ? (
            <FormularioPessoaEnvolvida clienteId={id} />
          ) : undefined
        }
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
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-[family-name:var(--font-interface)] text-[14.5px]"
              >
                <span className={`font-medium ${pessoa.ativo ? "text-tinta" : "text-cinza"}`}>
                  {pessoa.nome}
                </span>
                <span className="text-cinza">{pessoa.tipo === "EMPRESA" ? "Empresa" : "Pessoa"}</span>
                {pessoa.telefone && <span className="text-cinza">· {pessoa.telefone}</span>}
                {pessoa.email && <span className="text-cinza">· {pessoa.email}</span>}
                {!pessoa.ativo && <Etiqueta tom="apagado">Desativada</Etiqueta>}
                {pessoa.temAcesso ? (
                  <Etiqueta destaque>Colaborador</Etiqueta>
                ) : ctx.perfil === "ADMIN" && cliente.ativo && pessoa.ativo ? (
                  <BotaoCriarAcessoPessoaEnvolvida clienteId={id} pessoaEnvolvidaId={pessoa.id} />
                ) : null}
                {ctx.perfil === "ADMIN" && cliente.ativo && (
                  <BotaoDesativar
                    clienteId={id}
                    entidade="pessoaEnvolvida"
                    id={pessoa.id}
                    ativo={pessoa.ativo}
                    efeito={`${pessoa.nome} sai das listagens deste cliente.`}
                    tamanho="pequeno"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Bloco>

      <Bloco
        titulo="Documentos"
        acao={
          ctx.perfil === "ADMIN" && cliente.ativo ? <FormularioDocumento clienteId={id} /> : undefined
        }
      >
        {documentos.length === 0 ? (
          <p className="font-[family-name:var(--font-leitura)] text-[14.5px] text-cinza">
            Nenhum documento vinculado ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {documentos.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-baseline gap-x-3 font-[family-name:var(--font-interface)] text-[14.5px]"
              >
                <a href={doc.link} target="_blank" rel="noreferrer" className="text-azul-esc hover:underline">
                  {doc.nome}
                </a>
                {!doc.ativo && <Etiqueta tom="apagado">Desativado</Etiqueta>}
                {ctx.perfil === "ADMIN" && cliente.ativo && (
                  <BotaoDesativar
                    clienteId={id}
                    entidade="documento"
                    id={doc.id}
                    ativo={doc.ativo}
                    efeito={`O link "${doc.nome}" sai da lista de documentos.`}
                    tamanho="pequeno"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Bloco>

      {/* RF-039 — o toggle fica ao lado das duas listas que ele revela, não no topo da
          tela: é ali que a ausência de um registro desativado é percebida. */}
      {ctx.perfil === "ADMIN" && (
        <Link
          href={`/clientes/${id}${mostrarDesativados ? "" : "?desativados=1"}`}
          className="self-start text-[14px] font-medium text-azul-esc hover:underline"
        >
          {mostrarDesativados
            ? "Ocultar pessoas e documentos desativados"
            : "Mostrar pessoas e documentos desativados"}
        </Link>
      )}

      {ctx.perfil === "ADMIN" && cliente.ativo && (
        <Bloco
          titulo="Cadastro"
          acao={
            <BotaoDesativar
              clienteId={id}
              entidade="cliente"
              id={id}
              ativo
              efeito="Este cliente sai das listagens, junto com as pessoas envolvidas e os documentos dele."
            />
          }
        >
          <p className="font-[family-name:var(--font-leitura)] text-[14.5px] text-cinza">
            Desativar mantém tudo registrado — o cadastro apenas deixa de aparecer nas
            listagens e não pode mais ser editado.
          </p>
        </Bloco>
      )}

      {ctx.perfil === "ADMIN" && (
        <Bloco titulo="Acesso do cliente">
          {!usuarioAcesso || !statusChave ? (
            <BotaoCriarAcesso clienteId={id} />
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${STATUS_ACESSO[statusChave].cor}`} />
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
