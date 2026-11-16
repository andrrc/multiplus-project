/**
 * Clientes do colaborador interno e do externo (protótipo interno/06): só os clientes ligados ao trabalho da pessoa, pela
 * RLS. Busca (ID, nome, CNPJ, CPF ou cidade), segmento e cidade são aplicados aqui, sobre o que a consulta já entregou.
 */
import { listarClientesContextuais } from "@/lib/clientes";
import { correspondeABusca, interpretarBuscaLista } from "@/lib/busca-lista";
import { documentoCliente, numeroCliente } from "@/lib/formatacao";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { NaoInformado } from "@/ui/cartao";
import { CelulaLista, LinhaLista, TabelaLista, TextoPrincipal, TextoSecundario, TituloLinha, Vazio } from "@/ui/lista";
import { FiltrosMeusClientes } from "./filtros-meus-clientes";

const COLUNAS = [
  { titulo: "ID", largura: "8%" },
  { titulo: "Cliente", largura: "36%" },
  { titulo: "Segmento", largura: "21%" },
  { titulo: "Cidade", largura: "21%" },
  { titulo: "Projetos comigo", largura: "14%" },
];

const unicosOrdenados = (valores: Array<string | null>) =>
  [...new Set(valores.filter((valor): valor is string => !!valor))].sort((a, b) => a.localeCompare(b, "pt-BR"));

export default async function MeusClientesPage({ searchParams }: { searchParams: Promise<{ busca?: string | string[]; segmento?: string; cidade?: string }> }) {
  const ctx = await exigirAcessoARota("/meus-clientes");
  const parametros = await searchParams;
  const todos = await listarClientesContextuais(ctx);

  const busca = interpretarBuscaLista(parametros.busca);
  const segmento = typeof parametros.segmento === "string" ? parametros.segmento : "";
  const cidade = typeof parametros.cidade === "string" ? parametros.cidade : "";
  const clientes = todos.filter((cliente) =>
    (!segmento || cliente.segmento === segmento) &&
    (!cidade || cliente.municipio === cidade) &&
    correspondeABusca(busca, [cliente.razaoSocial, numeroCliente(cliente.numeroIdentificacao), cliente.numeroIdentificacao, cliente.cnpj, cliente.cpf, documentoCliente(cliente), cliente.municipio]));

  return (
    <div className="w-full max-w-[1280px]">
      <h1 className="text-2xl">Clientes</h1>
      <p className="mt-1 text-sm text-cinza">Clientes dos projetos e tarefas em que você atua.</p>

      <FiltrosMeusClientes
        key={`${segmento}|${cidade}`}
        buscaInicial={busca}
        segmentoInicial={segmento}
        cidadeInicial={cidade}
        segmentos={unicosOrdenados(todos.map((cliente) => cliente.segmento))}
        cidades={unicosOrdenados(todos.map((cliente) => cliente.municipio))}
        total={clientes.length}
      />

      {clientes.length === 0 ? (
        <Vazio
          titulo={todos.length === 0 ? "Nenhum cliente por enquanto." : "Nenhum cliente encontrado."}
          descricao={todos.length === 0 ? "Nenhum cliente está relacionado às suas atribuições ainda." : "Nenhum cliente encontrado para esse filtro."}
        />
      ) : (
        <TabelaLista rotulo="Clientes acessíveis" colunas={COLUNAS}>
          {clientes.map((cliente) => {
            const documento = documentoCliente(cliente);
            return (
              <LinhaLista key={cliente.id}>
                <CelulaLista rotulo="ID"><span className="font-semibold tabular-nums text-ink">{numeroCliente(cliente.numeroIdentificacao)}</span></CelulaLista>
                <CelulaLista larga>
                  <TituloLinha href={`/meus-clientes/${cliente.id}`}>{cliente.razaoSocial}</TituloLinha>
                  <TextoSecundario><span className="tabular-nums">{documento === "—" ? "Documento não informado" : documento}</span></TextoSecundario>
                </CelulaLista>
                <CelulaLista rotulo="Segmento">{cliente.segmento ? <TextoPrincipal>{cliente.segmento}</TextoPrincipal> : <NaoInformado />}</CelulaLista>
                <CelulaLista rotulo="Cidade">{cliente.municipio ? <TextoPrincipal>{cliente.municipio}</TextoPrincipal> : <NaoInformado />}</CelulaLista>
                <CelulaLista rotulo="Projetos comigo"><span className={`tabular-nums ${cliente.projetos.length === 0 ? "text-faint" : "text-ink"}`}>{cliente.projetos.length}</span></CelulaLista>
              </LinhaLista>
            );
          })}
        </TabelaLista>
      )}
    </div>
  );
}
