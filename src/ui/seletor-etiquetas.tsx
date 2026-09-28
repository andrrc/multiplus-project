"use client";

import { useMemo, useState } from "react";
import { CORES_ETIQUETA, type EtiquetaSelecionada } from "@/lib/etiqueta-colors";
import { inputClass } from "@/ui/campo";

type EtiquetaDisponivel = { id: string; nome: string; cor: string };
type EtiquetaEscolhida = EtiquetaSelecionada & { nova: boolean };

export function SeletorEtiquetas({ disponiveis }: { disponiveis: EtiquetaDisponivel[] }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [selecionadas, setSelecionadas] = useState<EtiquetaEscolhida[]>([]);
  const catalogo = useMemo(() => new Map(disponiveis.map((etiqueta) => [etiqueta.nome.toLocaleLowerCase("pt-BR"), etiqueta])), [disponiveis]);
  const resultados = disponiveis.filter((etiqueta) => etiqueta.nome.toLocaleLowerCase("pt-BR").includes(busca.trim().toLocaleLowerCase("pt-BR")));
  const buscaNormalizada = busca.trim().replace(/\s+/g, " ");
  const existeBuscaExata = disponiveis.some((etiqueta) => etiqueta.nome.toLocaleLowerCase("pt-BR") === buscaNormalizada.toLocaleLowerCase("pt-BR"));
  const novasSelecionadas = selecionadas.filter((etiqueta) => etiqueta.nova).map(({ nome, cor }) => ({ nome, cor }));

  function alternarEtiqueta(etiqueta: EtiquetaDisponivel) {
    setSelecionadas((atuais) => atuais.some((atual) => atual.nome === etiqueta.nome)
      ? atuais.filter((atual) => atual.nome !== etiqueta.nome)
      : [...atuais, { nome: etiqueta.nome, cor: etiqueta.cor, nova: false }]);
  }

  function criarEtiqueta(cor: string) {
    const chave = buscaNormalizada.toLocaleLowerCase("pt-BR");
    if (!chave || buscaNormalizada.length > 40 || catalogo.has(chave)) return;
    setSelecionadas((atuais) => atuais.some((atual) => atual.nome.toLocaleLowerCase("pt-BR") === chave)
      ? atuais
      : [...atuais, { nome: buscaNormalizada, cor, nova: true }]);
    setBusca("");
  }

  function removerEtiqueta(nome: string) {
    setSelecionadas((atuais) => atuais.filter((etiqueta) => etiqueta.nome !== nome));
  }

  return <div className="grid gap-2">
    <span className="text-[13px] font-medium">Etiquetas <span className="font-normal text-cinza">(opcional)</span></span>
    <div className="flex flex-wrap gap-1.5" aria-live="polite">
      {selecionadas.map((etiqueta) => {
        const texto = CORES_ETIQUETA.find((cor) => cor.fundo === etiqueta.cor)?.texto ?? "#334155";
        return <span key={etiqueta.nome} className="inline-flex min-h-8 items-center gap-1 rounded-full border border-black/5 px-2.5 py-1 text-[12px] font-semibold" style={{ backgroundColor: etiqueta.cor, color: texto }}>
          {etiqueta.nome}
          <button type="button" onClick={() => removerEtiqueta(etiqueta.nome)} aria-label={`Remover etiqueta ${etiqueta.nome}`} className="ml-1 grid h-5 w-5 place-items-center rounded-full text-[15px] leading-none hover:bg-black/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-current">×</button>
        </span>;
      })}
    </div>
    {selecionadas.map((etiqueta) => <input key={etiqueta.nome} type="hidden" name="etiquetaNome" value={etiqueta.nome} />)}
    <input type="hidden" name="novasEtiquetas" value={JSON.stringify(novasSelecionadas)} />
    <button type="button" aria-expanded={aberto} onClick={() => setAberto((atual) => !atual)} className="inline-flex min-h-10 w-fit items-center gap-2 rounded-[3px] border border-dashed border-linha bg-branco px-3 text-[13px] font-medium text-cinza hover:border-azul hover:text-azul-esc focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul">
      <span aria-hidden="true" className="text-[18px] leading-none">{aberto ? "−" : "+"}</span>{aberto ? "Fechar etiquetas" : "Adicionar etiqueta"}
    </button>
    {aberto && <div className="grid gap-3 rounded-[3px] border border-linha bg-papel p-3">
      <label className="grid gap-1 text-[12px] font-medium text-cinza">Buscar ou criar etiqueta<input autoFocus value={busca} onChange={(event) => setBusca(event.target.value)} maxLength={40} placeholder="Ex.: Aguardando documento" className={inputClass} /></label>
      {resultados.length > 0 && <ul aria-label="Etiquetas existentes" className="flex max-h-40 flex-wrap content-start gap-2 overflow-y-auto">
        {resultados.map((etiqueta) => {
          const selecionada = selecionadas.some((atual) => atual.nome === etiqueta.nome);
          const texto = CORES_ETIQUETA.find((cor) => cor.fundo === etiqueta.cor)?.texto ?? "#334155";
          return <li key={etiqueta.id}><button type="button" aria-pressed={selecionada} onClick={() => alternarEtiqueta(etiqueta)} className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul ${selecionada ? "border-tinta" : "border-black/5"}`} style={{ backgroundColor: etiqueta.cor, color: texto }}><span aria-hidden="true">{selecionada ? "✓" : "+"}</span>{etiqueta.nome}</button></li>;
        })}
      </ul>}
      {buscaNormalizada && !existeBuscaExata && <div className="border-t border-linha pt-3">
        <p className="text-[12px] font-medium text-tinta">Criar etiqueta “{buscaNormalizada}”</p>
        {buscaNormalizada.length > 40
          ? <p className="mt-1 text-[12px] text-vermelho">Use até 40 caracteres.</p>
          : <>
            <p className="mt-1 text-[12px] text-cinza">Escolha uma cor. A etiqueta ficará disponível para outros projetos.</p>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={`Escolha a cor da etiqueta ${buscaNormalizada}`}>
              {CORES_ETIQUETA.map((cor) => <button key={cor.fundo} type="button" onClick={() => criarEtiqueta(cor.fundo)} aria-label={`Criar etiqueta ${buscaNormalizada} na cor ${cor.nome}`} title={cor.nome} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-linha bg-branco px-2.5 text-[12px] font-medium text-tinta hover:border-azul focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"><span aria-hidden="true" className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ backgroundColor: cor.texto }} />{cor.nome}</button>)}
            </div>
          </>}
      </div>}
      {!resultados.length && !buscaNormalizada && <p className="text-[13px] text-cinza">Ainda não há etiquetas salvas. Digite um nome para criar a primeira.</p>}
    </div>}
  </div>;
}
