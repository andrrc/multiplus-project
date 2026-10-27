"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { CORES_ETIQUETA, type EtiquetaSelecionada } from "@/lib/etiqueta-colors";
import { inputClass } from "@/ui/campo";
import { useFecharAoClicarFora } from "@/ui/use-fechar-ao-clicar-fora";

type EtiquetaDisponivel = { id: string; nome: string; cor: string };
type EtiquetaEscolhida = EtiquetaSelecionada & { nova: boolean };

export function SeletorEtiquetas({ disponiveis, selecionadasIniciais = [] }: { disponiveis: EtiquetaDisponivel[]; selecionadasIniciais?: EtiquetaSelecionada[] }) {
  // Controla a abertura do painel e mantém as referências usadas para fechar ao clicar fora.
  const [aberto, setAberto] = useState(false);
  const painelRef = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const fechar = useCallback(() => setAberto(false), []);
  useFecharAoClicarFora(painelRef, aberto, fechar, botaoRef);
  // A busca e a lista selecionada são locais até o formulário ser enviado.
  const [busca, setBusca] = useState("");
  // Marca as etiquetas vindas do cadastro para distingui-las das recém-criadas.
  const [selecionadas, setSelecionadas] = useState<EtiquetaEscolhida[]>(() => selecionadasIniciais.map((etiqueta) => ({ ...etiqueta, nova: false })));
  // Índice normalizado usado para impedir a criação de uma etiqueta já existente.
  const catalogo = useMemo(() => new Map(disponiveis.map((etiqueta) => [etiqueta.nome.toLocaleLowerCase("pt-BR"), etiqueta])), [disponiveis]);
  // A lista visível ignora diferenças de caixa e espaços ao redor do termo.
  const resultados = disponiveis.filter((etiqueta) => etiqueta.nome.toLocaleLowerCase("pt-BR").includes(busca.trim().toLocaleLowerCase("pt-BR")));
  // A forma normalizada também é a que será salva quando uma etiqueta nova for criada.
  const buscaNormalizada = busca.trim().replace(/\s+/g, " ");
  // Uma correspondência exata oferece a existente e esconde o fluxo de criação duplicada.
  const existeBuscaExata = disponiveis.some((etiqueta) => etiqueta.nome.toLocaleLowerCase("pt-BR") === buscaNormalizada.toLocaleLowerCase("pt-BR"));
  // O servidor recebe apenas os novos nomes e cores; as etiquetas existentes vão por outro campo.
  const novasSelecionadas = selecionadas.filter((etiqueta) => etiqueta.nova).map(({ nome, cor }) => ({ nome, cor }));

  function alternarEtiqueta(etiqueta: EtiquetaDisponivel) {
    // Remove a etiqueta se já estiver selecionada; caso contrário, adiciona-a ao estado.
    setSelecionadas((atuais) => atuais.some((atual) => atual.nome === etiqueta.nome)
      ? atuais.filter((atual) => atual.nome !== etiqueta.nome)
      : [...atuais, { nome: etiqueta.nome, cor: etiqueta.cor, nova: false }]);
  }

  function criarEtiqueta(cor: string) {
    // A chave normalizada é usada para verificar duplicidade sem diferenciar maiúsculas.
    const chave = buscaNormalizada.toLocaleLowerCase("pt-BR");
    // Não permite nomes vazios, longos demais ou já presentes no catálogo.
    if (!chave || buscaNormalizada.length > 40 || catalogo.has(chave)) return;
    // Atualiza a seleção sem repetir nome e registra a cor escolhida.
    setSelecionadas((atuais) => atuais.some((atual) => atual.nome.toLocaleLowerCase("pt-BR") === chave)
      ? atuais
      : [...atuais, { nome: buscaNormalizada, cor, nova: true }]);
    setBusca("");
  }

  function removerEtiqueta(nome: string) {
    // Retira somente a etiqueta clicada, preservando as demais escolhas.
    setSelecionadas((atuais) => atuais.filter((etiqueta) => etiqueta.nome !== nome));
  }

  return <div ref={painelRef} className="grid gap-2">
    <span className="text-[13px] font-medium">Etiquetas <span className="font-normal text-cinza">(opcional)</span></span>
    <div className="flex flex-wrap gap-1.5" aria-live="polite">
      {selecionadas.map((etiqueta) => {
        // O texto de cada chip é escolhido para contrastar com a cor de fundo salva.
        const texto = CORES_ETIQUETA.find((cor) => cor.fundo === etiqueta.cor)?.texto ?? "#334155";
        return <span key={etiqueta.nome} className="inline-flex min-h-8 items-center gap-1 rounded-full border border-tinta/5 px-2.5 py-1 text-[12px] font-semibold" style={{ backgroundColor: etiqueta.cor, color: texto }}>
          {etiqueta.nome}
          <button type="button" onClick={() => removerEtiqueta(etiqueta.nome)} aria-label={`Remover etiqueta ${etiqueta.nome}`} className="ml-1 grid h-5 w-5 place-items-center rounded-full text-[15px] leading-none hover:bg-tinta/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-current">×</button>
        </span>;
      })}
    </div>
    {/* Campos ocultos traduzem o estado visual para os nomes esperados pela action. */}
    {selecionadas.map((etiqueta) => <input key={etiqueta.nome} type="hidden" name="etiquetaNome" value={etiqueta.nome} />)}
    <input type="hidden" name="novasEtiquetas" value={JSON.stringify(novasSelecionadas)} />
    <button ref={botaoRef} type="button" aria-expanded={aberto} onClick={() => setAberto((atual) => !atual)} className="inline-flex min-h-10 w-fit items-center gap-2 rounded-[3px] border border-dashed border-linha bg-branco px-3 text-[13px] font-medium text-cinza hover:border-azul hover:text-azul-esc focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul">
      <span aria-hidden="true" className="text-[18px] leading-none">{aberto ? "−" : "+"}</span>{aberto ? "Fechar etiquetas" : "Adicionar etiqueta"}
    </button>
    {aberto && <div className="grid gap-3 rounded-[3px] border border-linha bg-papel p-3">
      <label className="grid gap-1 text-[12px] font-medium text-cinza">Buscar ou criar etiqueta<input autoFocus value={busca} onChange={(event) => setBusca(event.target.value)} maxLength={40} placeholder="Ex.: Aguardando documento" className={inputClass} /></label>
      {/* Cada resultado mantém o estado acessível pelo atributo aria-pressed. */}
      {resultados.length > 0 && <ul aria-label="Etiquetas existentes" className="flex max-h-40 flex-wrap content-start gap-2 overflow-y-auto">
        {resultados.map((etiqueta) => {
          // A comparação informa tanto o estilo visual quanto o estado acessível do botão.
          const selecionada = selecionadas.some((atual) => atual.nome === etiqueta.nome);
          const texto = CORES_ETIQUETA.find((cor) => cor.fundo === etiqueta.cor)?.texto ?? "#334155";
          return <li key={etiqueta.id}><button type="button" aria-pressed={selecionada} onClick={() => alternarEtiqueta(etiqueta)} className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul ${selecionada ? "border-tinta" : "border-tinta/5"}`} style={{ backgroundColor: etiqueta.cor, color: texto }}><span aria-hidden="true">{selecionada ? "✓" : "+"}</span>{etiqueta.nome}</button></li>;
        })}
      </ul>}
      {buscaNormalizada && !existeBuscaExata && <div className="border-t border-linha pt-3">
        <p className="text-[12px] font-medium text-tinta">Criar etiqueta “{buscaNormalizada}”</p>
        {/* O limite também aparece como erro, embora o campo já limite novas entradas. */}
        {buscaNormalizada.length > 40
          ? <p className="mt-1 text-[12px] text-critico">Use até 40 caracteres.</p>
          : <>
            <p className="mt-1 text-[12px] text-cinza">Escolha uma cor. A etiqueta ficará disponível para outros projetos.</p>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={`Escolha a cor da etiqueta ${buscaNormalizada}`}>
              {CORES_ETIQUETA.map((cor) => <button key={cor.fundo} type="button" onClick={() => criarEtiqueta(cor.fundo)} aria-label={`Criar etiqueta ${buscaNormalizada} na cor ${cor.nome}`} title={cor.nome} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-linha bg-branco px-2.5 text-[12px] font-medium text-tinta hover:border-azul focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"><span aria-hidden="true" className="h-3.5 w-3.5 rounded-full border border-tinta/10" style={{ backgroundColor: cor.amostra }} />{cor.nome}</button>)}
            </div>
          </>}
      </div>}
      {!resultados.length && !buscaNormalizada && <p className="text-[13px] text-cinza">Ainda não há etiquetas salvas. Digite um nome para criar a primeira.</p>}
    </div>}
  </div>;
}
