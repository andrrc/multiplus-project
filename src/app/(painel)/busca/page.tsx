/**
 * Resultado da busca geral (campo "Buscar cliente, projeto ou tarefa" da barra superior). Só a administração e o
 * colaborador interno chegam aqui; cada um vê o que a própria permissão alcança (`buscarNoSistema`) e abre os
 * registros pelas rotas do seu perfil.
 */
import Link from "next/link";
import { exigirAcessoARota } from "@/server/auth/contexto";
import { buscarNoSistema, LIMITE_RESULTADOS_BUSCA, normalizarTermoBusca } from "@/lib/busca-global";
import { Cartao } from "@/ui/cartao";
import { Vazio } from "@/ui/lista";
import { CampoBusca } from "./campo-busca";

const ROTAS = {
  ADMIN: { cliente: "/clientes", projeto: "/projetos", tarefa: "/tarefas" },
  ADMIN_INTERNO: { cliente: "/meus-clientes", projeto: "/meus-projetos", tarefa: "/minhas-tarefas" },
} as const;

export default async function BuscaPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const ctx = await exigirAcessoARota("/busca");
  const { q } = await searchParams;
  const termoDaUrl = typeof q === "string" ? q : "";
  const resultado = await buscarNoSistema(ctx, termoDaUrl);
  const rotas = ROTAS[ctx.perfil as keyof typeof ROTAS];
  const buscou = normalizarTermoBusca(termoDaUrl) !== null;
  const total = resultado.clientes.length + resultado.projetos.length + resultado.tarefas.length;

  const linha = "flex flex-col gap-0.5 border-t border-linha px-5 py-3 first:border-t-0 hover:bg-cabecalho";
  const titulo = "break-words font-[family-name:var(--font-interface)] text-sm font-medium text-ink";
  const apoio = "break-words text-[12.5px] text-cinza";
  const contagem = (n: number) => <span className="text-[13px] font-normal tabular-nums text-cinza">{n}{n === LIMITE_RESULTADOS_BUSCA ? "+" : ""}</span>;

  return (
    <div className="w-full max-w-[860px]">
      <h1 className="text-2xl">Busca</h1>
      <div className="mt-4 lg:hidden"><CampoBusca valorInicial={termoDaUrl} /></div>
      <p className="mt-1 text-sm text-cinza" aria-live="polite">
        {!buscou ? "Digite pelo menos 2 letras para buscar cliente, projeto ou tarefa." : total === 0 ? `Nenhum resultado para “${resultado.termo}”.` : `Resultados para “${resultado.termo}”.`}
      </p>

      {buscou && total === 0 && <div className="mt-6"><Vazio titulo="Nada encontrado." descricao="Confira a grafia ou tente outra parte do nome." /></div>}

      {buscou && total > 0 && (
        <div className="mt-6 flex flex-col gap-4">
          {resultado.clientes.length > 0 && (
            <Cartao titulo={<>Clientes {contagem(resultado.clientes.length)}</>} semMargem>
              <ul>{resultado.clientes.map((cliente) => (
                <li key={cliente.id}><Link href={`${rotas.cliente}/${cliente.id}`} className={linha}><span className={titulo}>{cliente.razaoSocial}</span></Link></li>
              ))}</ul>
            </Cartao>
          )}
          {resultado.projetos.length > 0 && (
            <Cartao titulo={<>Projetos {contagem(resultado.projetos.length)}</>} semMargem>
              <ul>{resultado.projetos.map((projeto) => (
                <li key={projeto.id}><Link href={`${rotas.projeto}/${projeto.id}`} className={linha}><span className={titulo}>{projeto.nome}</span><span className={apoio}>{projeto.cliente.razaoSocial}</span></Link></li>
              ))}</ul>
            </Cartao>
          )}
          {resultado.tarefas.length > 0 && (
            <Cartao titulo={<>Tarefas {contagem(resultado.tarefas.length)}</>} semMargem>
              <ul>{resultado.tarefas.map((tarefa) => (
                <li key={tarefa.id}><Link href={`${rotas.tarefa}/${tarefa.id}`} className={linha}><span className={titulo}>{tarefa.nome}</span><span className={apoio}>{tarefa.projeto.nome}</span></Link></li>
              ))}</ul>
            </Cartao>
          )}
        </div>
      )}
    </div>
  );
}
