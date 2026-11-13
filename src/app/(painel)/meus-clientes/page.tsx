import { listarClientesContextuais } from "@/lib/clientes";
import { documentoCliente, numeroCliente } from "@/lib/formatacao";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { NaoInformado } from "@/ui/cartao";
import { CelulaLista, LinhaLista, TabelaLista, TextoPrincipal, TextoSecundario, TituloLinha, Vazio } from "@/ui/lista";

const COLUNAS = [
  { titulo: "ID", largura: "8%" },
  { titulo: "Cliente", largura: "42%" },
  { titulo: "Segmento", largura: "25%" },
  { titulo: "Cidade", largura: "25%" },
];

export default async function MeusClientesPage() {
  const ctx = await exigirAcessoARota("/meus-clientes");
  const clientes = await listarClientesContextuais(ctx);

  return (
    <div className="w-full max-w-[1280px]">
      <h1 className="text-2xl">Clientes</h1>
      <p className="mt-1 text-sm text-cinza">Clientes dos projetos e tarefas em que você atua.</p>
      <p className="mb-2.5 mt-5 text-[13px] tabular-nums text-cinza">{clientes.length} {clientes.length === 1 ? "cliente" : "clientes"}</p>

      {clientes.length === 0 ? (
        <Vazio titulo="Nenhum cliente por enquanto." descricao="Nenhum cliente está relacionado às suas atribuições ainda." />
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
              </LinhaLista>
            );
          })}
        </TabelaLista>
      )}
    </div>
  );
}
