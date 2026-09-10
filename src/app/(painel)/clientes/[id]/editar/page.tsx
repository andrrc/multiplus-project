import { notFound, redirect } from "next/navigation";
import { obterContexto } from "@/server/auth/contexto";
import { buscarClienteParaEdicao } from "@/lib/clientes";
import { formatarCnpj, formatarCpf } from "@/lib/formatacao";
import { EditarClienteForm } from "./editar-cliente-form";

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await obterContexto();
  if (ctx.perfil !== "ADMIN") redirect(`/clientes/${id}`);

  const dados = await buscarClienteParaEdicao(ctx, id);
  if (!dados) notFound();

  const { cliente } = dados;

  if (cliente.tipo === "PESSOA_JURIDICA") {
    if (!dados.responsavelLegal || !dados.pontoContato) notFound();

    return (
      <div>
        <h1 className="text-[28px]">Editar cliente</h1>
        <div className="mt-8">
          <EditarClienteForm
            clienteId={id}
            valoresIniciais={{
              tipo: "PESSOA_JURIDICA",
              cnpj: formatarCnpj(cliente.cnpj ?? ""),
              razaoSocial: cliente.razaoSocial,
              endereco: cliente.endereco ?? "",
              segmento: cliente.segmento,
              origemContato: cliente.origemContato,
              responsavelLegal: dados.responsavelLegal,
              pontoContato: dados.pontoContato,
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
          clienteId={id}
          valoresIniciais={{
            tipo: "PESSOA_FISICA",
            cpf: formatarCpf(cliente.cpf ?? ""),
            nome: cliente.razaoSocial,
            rg: cliente.rg ?? "",
            endereco: cliente.endereco ?? "",
            cep: cliente.cep ?? "",
            municipio: cliente.municipio ?? "",
            email: cliente.email ?? "",
            segmento: cliente.segmento,
            origemContato: cliente.origemContato,
          }}
        />
      </div>
    </div>
  );
}
