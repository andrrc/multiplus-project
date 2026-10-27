/**
 * Página da rota `src/app/(painel)/clientes/[id]/editar/page.tsx`. Recebe os parâmetros da URL ou da rota, valida o acesso no servidor, obtém os dados necessários e compõe a resposta visual; as regras de negócio permanecem nas funções de domínio chamadas por ela.
 */
import { buscarLaudoTecnico, listarResponsaveisLaudo } from "@/lib/laudos-tecnicos";
import { notFound, redirect } from "next/navigation";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { buscarClienteParaEdicao } from "@/lib/clientes";
import { formatarCnpj, formatarCpf } from "@/lib/formatacao";
import { EditarClienteForm } from "./editar-cliente-form";

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await exigirAcessoARota("/clientes");

  const dados = await buscarClienteParaEdicao(ctx, id);
  if (!dados) notFound();
  if (!dados.cliente.ativo) redirect(`/clientes/${id}`);

  const [laudo, responsaveis] = await Promise.all([buscarLaudoTecnico(ctx, id), listarResponsaveisLaudo(ctx)]);
  const responsaveisLaudo = laudo && !responsaveis.some((p) => p.id === laudo.responsavelId) ? [...responsaveis, laudo.responsavel] : responsaveis;
  const laudoInicial = laudo ? { possui: laudo.ativo, nome: laudo.nome, tipo: laudo.tipo, responsavelId: laudo.responsavelId, versao: laudo.versao } : { possui: false };
  const { cliente } = dados;

  if (cliente.tipo === "PESSOA_JURIDICA") {
    if (!dados.responsavelLegal || !dados.pontoContato) notFound();

    return (
      <div>
        <h1 className="text-[28px]">Editar cliente</h1>
        <div className="mt-8">
          <EditarClienteForm
            laudoInicial={laudoInicial}
            responsaveisLaudo={responsaveisLaudo}
            clienteId={id}
            valoresIniciais={{
              tipo: "PESSOA_JURIDICA",
              cnpj: formatarCnpj(cliente.cnpj ?? ""),
              razaoSocial: cliente.razaoSocial,
              endereco: cliente.endereco ?? "",
              segmento: cliente.segmento,
              origemContato: cliente.origemContato,
              atividadePrincipal: cliente.atividadePrincipal ?? "",
              porte: cliente.porte ?? "",
              estado: cliente.estado ?? "",
              municipio: cliente.municipio ?? "",
              responsavelLegal: {
                nome: dados.responsavelLegal.nome ?? "",
                endereco: dados.responsavelLegal.endereco ?? "",
                rg: dados.responsavelLegal.rg ?? "",
                cpf: dados.responsavelLegal.cpf ?? "",
                telefone: dados.responsavelLegal.telefone ?? "",
                email: dados.responsavelLegal.email ?? "",
              },
              pontoContato: {
                nome: dados.pontoContato.nome ?? "",
                endereco: dados.pontoContato.endereco ?? "",
                rg: dados.pontoContato.rg ?? "",
                cpf: dados.pontoContato.cpf ?? "",
                telefone: dados.pontoContato.telefone ?? "",
                email: dados.pontoContato.email ?? "",
                cargo: dados.pontoContato.cargo ?? "",
              },
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[28px]">Editar cliente</h1>
      <div className="mt-8">
        <EditarClienteForm
          laudoInicial={laudoInicial}
          responsaveisLaudo={responsaveisLaudo}
          clienteId={id}
          valoresIniciais={{
            tipo: "PESSOA_FISICA",
            cpf: formatarCpf(cliente.cpf ?? ""),
            nome: cliente.razaoSocial,
            rg: cliente.rg ?? "",
            endereco: cliente.endereco ?? "",
            cep: cliente.cep ?? "",
            municipio: cliente.municipio ?? "",
            estado: cliente.estado ?? "",
            atividadePrincipal: cliente.atividadePrincipal ?? "",
            email: cliente.email ?? "",
            segmento: cliente.segmento,
            origemContato: cliente.origemContato,
          }}
        />
      </div>
    </div>
  );
}
