/**
 * Página da rota `src/app/(painel)/clientes/[id]/page.tsx`. Recebe os parâmetros da URL ou da rota, valida o acesso no servidor, obtém os dados necessários e compõe a resposta visual; as regras de negócio permanecem nas funções de domínio chamadas por ela.
 */
import { SecaoLaudo } from "./laudo/secao";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { buscarClienteDetalheSeguro } from "@/lib/clientes";
import { formatarDataCadastro } from "@/lib/datas";
import { documentoCliente, formatarCpf, formatarMoeda, formatarTelefone, numeroCliente } from "@/lib/formatacao";
import { buscarLimitesSemaforo } from "@/lib/semaforo";
import { Etiqueta } from "@/ui/campo";
import { botaoDiscreto, botaoPrimario, botaoSecundario } from "@/ui/botoes";
import { BlocoLateral, Cartao, CartaoLateral, ListaChaveValor, NaoInformado } from "@/ui/cartao";
import { IndicadorSemaforoProjeto } from "@/ui/indicador-dias-restantes";
import { CelulaPrazo, StatusPonto } from "@/ui/lista";
import {
  FormularioDocumento,
  FormularioPessoaEnvolvida,
  BotaoCriarAcesso,
  BotaoCriarAcessoPessoaEnvolvida,
  BotaoReenviarConviteCliente,
  BotaoAlternarAcesso,
  BotaoDesativar,
  BotaoDesativarCliente,
} from "./acoes-cliente";

/**
 * `valor === null` é ambíguo por natureza (RF-020 mascara o telefone via view, mas o campo
 * também é opcional desde RF-002d) — `souAdmin` desfaz a ambiguidade pra mostrar a mensagem
 * certa em cada caso.
 */
function Telefone({ valor, souAdmin }: { valor: string | null; souAdmin: boolean }) {
  if (valor === null) {
    return <span className="text-cinza">{souAdmin ? <NaoInformado /> : "Oculto para o seu perfil"}</span>;
  }
  return <span className="tabular-nums">{formatarTelefone(valor)}</span>;
}

/** Texto do valor ou, quando vazio, "Não informado" em âmbar. */
const ouNaoInformado = (valor: React.ReactNode) => (valor ? valor : <NaoInformado />);

const STATUS_ACESSO: Record<string, { texto: string; cor: string }> = {
  bloqueado: { texto: "Bloqueado", cor: "text-critico" },
  pendente: { texto: "Pendente de ativação", cor: "text-ambar" },
  ativo: { texto: "Ativo", cor: "text-verde-esc" },
};
const STATUS_PROJETO: Record<string, string> = {
  A_INICIAR: "A iniciar",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

export default async function DetalheClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ desativados?: string; laudoBusca?: string; laudoDesativados?: string; laudoPagina?: string }>;
}) {
  const { id } = await params;
  const filtrosLaudo = await searchParams;
  const { desativados } = filtrosLaudo;
  const ctx = await exigirAcessoARota("/clientes");

  // RF-039 — o toggle só faz sentido para quem pode reativar; para os demais perfis a RLS
  // já não devolve registro desativado, então pedir por ele não muda nada.
  const mostrarDesativados = desativados === "1" && ctx.perfil === "ADMIN";
  const [detalhe, limites] = await Promise.all([
    buscarClienteDetalheSeguro(ctx, id, mostrarDesativados),
    buscarLimitesSemaforo(ctx),
  ]);
  if (!detalhe) notFound();

  const { cliente, responsavelLegal, pontoContato, pessoasEnvolvidas, documentos, projetos, usuarioAcesso, valorTotalProjetos } = detalhe;
  const souAdmin = ctx.perfil === "ADMIN";

  const statusChave = !usuarioAcesso
    ? null
    : !usuarioAcesso.ativo
      ? "bloqueado"
      : usuarioAcesso.senhaHash
        ? "ativo"
        : "pendente";

  // Resumo: projetos em andamento e o prazo mais próximo entre eles.
  const projetosAbertos = projetos.filter((p) => p.ativo && (p.status === "A_INICIAR" || p.status === "EM_ANDAMENTO"));
  const proximoProjeto = projetosAbertos
    .filter((p) => p.dataPrevistaConclusao)
    .sort((a, b) => a.dataPrevistaConclusao!.getTime() - b.dataPrevistaConclusao!.getTime())[0];

  const celulaResumo = "min-w-0 border-l border-linha px-5 py-4 first:border-l-0 max-lg:odd:border-l-0 max-lg:[&:nth-child(n+3)]:border-t";

  return (
    <div className="w-full max-w-[1280px]">
      <nav aria-label="Caminho" className="mb-2.5 flex items-center gap-1.5 text-[13px] text-cinza">
        <Link href="/clientes" className="hover:text-ink">Clientes</Link>
        <span aria-hidden="true">/</span>
        <span className="truncate">{numeroCliente(cliente.numeroIdentificacao)} · {cliente.razaoSocial}</span>
      </nav>

      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-[26px]">{cliente.razaoSocial}</h1>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] text-cinza">
            <span className="font-medium tabular-nums text-ink">ID {numeroCliente(cliente.numeroIdentificacao)}</span>
            <span className="tabular-nums">{documentoCliente(cliente)}</span>
            <span>{cliente.segmento}{cliente.tipo === "PESSOA_JURIDICA" && cliente.porte ? ` · ${cliente.porte}` : ""}</span>
            {cliente.municipio && <span>{cliente.estado ? `${cliente.municipio}/${cliente.estado}` : cliente.municipio}</span>}
            <span className="tabular-nums">
              Cliente desde <time dateTime={cliente.criadoEm.toISOString()}>{formatarDataCadastro(cliente.criadoEm)}</time>
            </span>
          </div>
        </div>
        {souAdmin && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link href={`/clientes/${id}${mostrarDesativados ? "" : "?desativados=1"}`} className={botaoDiscreto} title="Inclui projetos, pessoas envolvidas e links do Drive nesta ficha">
              {mostrarDesativados ? "Ocultar desativados" : "Mostrar desativados"}
            </Link>
            {cliente.ativo && <Link href={`/clientes/${id}/editar`} className={botaoSecundario}>Editar</Link>}
            <BotaoDesativarCliente clienteId={id} nome={cliente.razaoSocial} ativo={cliente.ativo} instancia="detalhe-topo" />
          </div>
        )}
      </div>

      {/* RF-039 — cliente desativado é somente leitura; a faixa explica por que a edição
          não está disponível. A reativação fica no botão único do topo. */}
      {!cliente.ativo && (
        <div className="mb-5 rounded-cartao border border-ambar/25 bg-ambar-cl px-5 py-4">
          <p className="text-sm text-ambar">
            Cadastro desativado. Os registros e projetos vinculados ficam indisponíveis até a reativação.
          </p>
        </div>
      )}

      <section aria-label="Resumo do cliente" className={`mb-6 grid grid-cols-2 rounded-cartao border border-linha bg-branco ${souAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        <div className={celulaResumo}>
          <p className="text-[12.5px] font-medium text-cinza">Projetos ativos</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{projetosAbertos.length}</p>
          {souAdmin && <p className="mt-1 text-[12.5px] tabular-nums text-cinza">{valorTotalProjetos ? formatarMoeda(valorTotalProjetos) : "R$ 0,00"} contratados</p>}
        </div>
        <div className={celulaResumo}>
          <p className="text-[12.5px] font-medium text-cinza">Próxima conclusão prevista</p>
          {proximoProjeto ? (
            <>
              <div className="mt-1 flex flex-wrap items-center gap-2.5 text-lg font-semibold tabular-nums">
                {new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(proximoProjeto.dataPrevistaConclusao!)}
                <IndicadorSemaforoProjeto prazo={proximoProjeto.dataPrevistaConclusao} status={proximoProjeto.status} limites={limites} />
              </div>
              <p className="mt-1 truncate text-[12.5px] text-cinza">{proximoProjeto.nome}</p>
            </>
          ) : (
            <p className="mt-1 text-lg font-semibold text-faint">Sem previsão</p>
          )}
        </div>
        {souAdmin && (
          <div className={celulaResumo}>
            <p className="text-[12.5px] font-medium text-cinza">Portal do cliente</p>
            <p className={`mt-1 text-lg font-semibold ${statusChave ? STATUS_ACESSO[statusChave].cor : "text-faint"}`}>
              {statusChave ? STATUS_ACESSO[statusChave].texto : "Sem acesso"}
            </p>
          </div>
        )}
        <div className={celulaResumo}>
          <p className="text-[12.5px] font-medium text-cinza">Cliente desde</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{formatarDataCadastro(cliente.criadoEm)}</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <Cartao
            titulo={<>Projetos <span className="rounded-full bg-papel px-2 py-px text-xs font-semibold tabular-nums text-ink">{projetos.length}</span></>}
            semMargem
            acao={
              souAdmin && cliente.ativo ? (
                <Link href={`/projetos/novo?clienteId=${encodeURIComponent(id)}`} className={botaoPrimario}>+ Novo projeto</Link>
              ) : undefined
            }
          >
            {projetos.length === 0 ? (
              <p className="px-5 py-6 text-sm text-cinza">Nenhum projeto cadastrado para este cliente.</p>
            ) : (
              <ul>
                {projetos.map((projeto) => (
                  <li key={projeto.id} className="relative grid gap-2 border-t border-linha px-5 py-3.5 first:border-t-0 hover:bg-cabecalho sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-5">
                    <div className="min-w-0">
                      <Link href={`/projetos/${projeto.id}`} className="block truncate font-medium text-ink before:absolute before:inset-0 before:content-[''] hover:text-azul-esc">
                        {projeto.nome}
                      </Link>
                    </div>
                    <StatusPonto status={projeto.ativo ? projeto.status : "CANCELADO"}>
                      {projeto.ativo ? STATUS_PROJETO[projeto.status] ?? projeto.status : "Desativado"}
                    </StatusPonto>
                    <CelulaPrazo prazo={projeto.dataPrevistaConclusao} status={projeto.status} ativo={projeto.ativo} limites={limites} />
                  </li>
                ))}
              </ul>
            )}
          </Cartao>

          <Cartao
            titulo="Pessoas envolvidas"
            semMargem
            acao={souAdmin && cliente.ativo ? <FormularioPessoaEnvolvida clienteId={id} /> : undefined}
          >
            {pessoasEnvolvidas.length === 0 ? (
              <p className="px-5 py-6 text-sm text-cinza">Nenhuma pessoa envolvida cadastrada.</p>
            ) : (
              <ul>
                {pessoasEnvolvidas.map((pessoa) => (
                  <li key={pessoa.id} className="grid gap-2 border-t border-linha px-5 py-3.5 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-5">
                    <div className="min-w-0">
                      <p className={`truncate font-medium ${pessoa.ativo ? "text-ink" : "text-cinza"}`}>
                        {pessoa.nome} <span className="font-normal text-cinza">· {pessoa.tipo === "EMPRESA" ? "Empresa" : "Pessoa"}</span>
                      </p>
                      <p className="mt-px truncate text-[12.5px] text-cinza">
                        {[pessoa.email, pessoa.telefone ? formatarTelefone(pessoa.telefone) : null].filter(Boolean).join(" · ") || "Sem contato informado"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {!pessoa.ativo && <Etiqueta tom="apagado">Desativada</Etiqueta>}
                      {pessoa.temAcesso ? (
                        <Etiqueta destaque>Colaborador externo</Etiqueta>
                      ) : (
                        <span className="text-[13px] text-faint">Sem acesso</span>
                      )}
                      {!pessoa.temAcesso && souAdmin && cliente.ativo && pessoa.ativo && (
                        <BotaoCriarAcessoPessoaEnvolvida clienteId={id} pessoaEnvolvidaId={pessoa.id} />
                      )}
                      {souAdmin && cliente.ativo && (
                        <BotaoDesativar
                          clienteId={id}
                          entidade="pessoaEnvolvida"
                          id={pessoa.id}
                          ativo={pessoa.ativo}
                          efeito={`${pessoa.nome} sai das listagens deste cliente.`}
                          tamanho="pequeno"
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>

          <SecaoLaudo ctx={ctx} clienteId={id} clienteAtivo={cliente.ativo} busca={filtrosLaudo.laudoBusca} desativados={filtrosLaudo.laudoDesativados} pagina={filtrosLaudo.laudoPagina} desativadosCliente={desativados} />
        </div>

        <CartaoLateral>
          <BlocoLateral titulo={cliente.tipo === "PESSOA_JURIDICA" ? "Dados da empresa" : "Dados pessoais"}>
            <ListaChaveValor
              itens={[
                { rotulo: cliente.tipo === "PESSOA_JURIDICA" ? "Razão social" : "Nome", valor: cliente.razaoSocial },
                { rotulo: "Atividade principal", valor: ouNaoInformado(cliente.atividadePrincipal) },
                ...(cliente.tipo === "PESSOA_JURIDICA" ? [{ rotulo: "Porte", valor: ouNaoInformado(cliente.porte) }] : []),
                ...(cliente.tipo === "PESSOA_FISICA"
                  ? [
                      { rotulo: "RG", valor: ouNaoInformado(cliente.rg) },
                      { rotulo: "CEP", valor: ouNaoInformado(cliente.cep) },
                      { rotulo: "E-mail", valor: ouNaoInformado(cliente.email) },
                    ]
                  : []),
                { rotulo: "Endereço", valor: ouNaoInformado(cliente.endereco) },
                {
                  rotulo: "Município",
                  valor: ouNaoInformado(cliente.municipio ? (cliente.estado ? `${cliente.municipio} - ${cliente.estado}` : cliente.municipio) : null),
                },
                { rotulo: "Origem do contato", valor: ouNaoInformado(cliente.origemContato) },
              ]}
            />
          </BlocoLateral>

          {responsavelLegal && (responsavelLegal.nome || responsavelLegal.email || responsavelLegal.cpf) && (
            <BlocoLateral titulo="Responsável legal">
              <ListaChaveValor
                itens={[
                  { rotulo: "Nome", valor: ouNaoInformado(responsavelLegal.nome) },
                  { rotulo: "E-mail", valor: ouNaoInformado(responsavelLegal.email) },
                  { rotulo: "Telefone", valor: <Telefone valor={responsavelLegal.telefone} souAdmin={souAdmin} /> },
                  ...(responsavelLegal.endereco ? [{ rotulo: "Endereço", valor: responsavelLegal.endereco }] : []),
                  ...(responsavelLegal.rg ? [{ rotulo: "RG", valor: responsavelLegal.rg }] : []),
                  ...(responsavelLegal.cpf ? [{ rotulo: "CPF", valor: formatarCpf(responsavelLegal.cpf) }] : []),
                ]}
              />
            </BlocoLateral>
          )}

          {pontoContato && (pontoContato.nome || pontoContato.email || pontoContato.cpf) && (
            <BlocoLateral titulo="Ponto de contato">
              <ListaChaveValor
                itens={[
                  { rotulo: "Nome", valor: ouNaoInformado(pontoContato.nome) },
                  { rotulo: "Cargo", valor: ouNaoInformado(pontoContato.cargo) },
                  { rotulo: "E-mail", valor: ouNaoInformado(pontoContato.email) },
                  { rotulo: "Telefone", valor: <Telefone valor={pontoContato.telefone} souAdmin={souAdmin} /> },
                  ...(pontoContato.endereco ? [{ rotulo: "Endereço", valor: pontoContato.endereco }] : []),
                  ...(pontoContato.cpf ? [{ rotulo: "CPF", valor: formatarCpf(pontoContato.cpf) }] : []),
                ]}
              />
            </BlocoLateral>
          )}

          {souAdmin && (
            <BlocoLateral titulo="Portal do cliente">
              <p className="text-[13px] text-cinza">
                Bloquear aqui impede o cliente de entrar no portal, mas não desativa a empresa nem o cadastro dela.
              </p>
              {!usuarioAcesso || !statusChave ? (
                cliente.ativo ? (
                  <div className="mt-3"><BotaoCriarAcesso clienteId={id} /></div>
                ) : (
                  <p className="mt-3 text-[13px] text-cinza">Reative o cadastro do cliente para criar um novo acesso ao portal.</p>
                )
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className={`text-[13.5px] font-medium ${STATUS_ACESSO[statusChave].cor}`}>
                    {STATUS_ACESSO[statusChave].texto}
                  </span>
                  <BotaoAlternarAcesso clienteId={id} usuarioId={usuarioAcesso.id} ativo={usuarioAcesso.ativo} />
                </div>
              )}
              {statusChave === "pendente" && cliente.ativo && usuarioAcesso?.email && (
                <BotaoReenviarConviteCliente clienteId={id} email={usuarioAcesso.email} />
              )}
              {statusChave === "ativo" && (
                <p className="mt-3 text-[13px] text-cinza">
                  A conta já foi ativada. Se o cliente perdeu acesso, ele pode usar “Esqueci minha senha” na tela de login.
                </p>
              )}
            </BlocoLateral>
          )}

          <BlocoLateral
            titulo="Documentos"
            acao={souAdmin && cliente.ativo ? <FormularioDocumento clienteId={id} /> : undefined}
          >
            {documentos.length === 0 ? (
              <p className="text-[13px] text-cinza">Nenhum link do Drive vinculado ainda.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {documentos.map((doc) => (
                  <li key={doc.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px]">
                    <a href={doc.link} target="_blank" rel="noreferrer" className="min-w-0 break-words text-azul-esc hover:underline">
                      {doc.nome} <span className="text-faint">↗</span>
                    </a>
                    {!doc.ativo && <Etiqueta tom="apagado">Desativado</Etiqueta>}
                    {souAdmin && cliente.ativo && (
                      <BotaoDesativar
                        clienteId={id}
                        entidade="documento"
                        id={doc.id}
                        ativo={doc.ativo}
                        efeito={`O link "${doc.nome}" sai da lista do Drive.`}
                        tamanho="pequeno"
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </BlocoLateral>
        </CartaoLateral>
      </div>
    </div>
  );
}
