import { notFound, redirect } from "next/navigation";
import { obterContexto } from "@/server/auth/contexto";
import { buscarClienteParaEdicao } from "@/lib/clientes";
import { formatarCnpj } from "@/lib/formatacao";
import { EditarClienteForm } from "./editar-cliente-form";

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await obterContexto();
  if (ctx.perfil !== "ADMIN") redirect(`/clientes/${id}`);

  const dados = await buscarClienteParaEdicao(ctx, id);
  if (!dados || !dados.responsavelLegal || !dados.pontoContato) notFound();

  return (
    <div>
      <h1 className="text-[28px]">Editar cliente</h1>
      <div className="mt-8">
        <EditarClienteForm
          clienteId={id}
          cnpj={formatarCnpj(dados.cliente.cnpj)}
          valoresIniciais={{
            razaoSocial: dados.cliente.razaoSocial,
            endereco: dados.cliente.endereco ?? "",
            segmento: dados.cliente.segmento,
            origemContato: dados.cliente.origemContato,
            responsavelLegal: dados.responsavelLegal,
            pontoContato: dados.pontoContato,
          }}
        />
      </div>
    </div>
  );
}
