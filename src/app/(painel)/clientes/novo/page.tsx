/**
 * Página da rota `src/app/(painel)/clientes/novo/page.tsx`. Recebe os parâmetros da URL ou da rota, valida o acesso no servidor, obtém os dados necessários e compõe a resposta visual; as regras de negócio permanecem nas funções de domínio chamadas por ela.
 */
import { listarResponsaveisLaudo } from "@/lib/laudos-tecnicos";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { NovoClienteForm } from "./novo-cliente-form";

export default async function NovoClientePage() {
  const ctx = await exigirAcessoARota("/clientes");

  const responsaveisLaudo = await listarResponsaveisLaudo(ctx);
  return (
    <div>
      <h1 className="text-[28px]">Novo cliente</h1>
      <div className="mt-8">
        <NovoClienteForm responsaveisLaudo={responsaveisLaudo} />
      </div>
    </div>
  );
}
