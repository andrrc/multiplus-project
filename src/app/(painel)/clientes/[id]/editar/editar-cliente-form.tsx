"use client";

import { useState, useTransition } from "react";
import type { TipoCliente } from "@prisma/client";
import { heredarDadosPontoContato, type DadosPessoa } from "@/lib/heranca-pessoa";
import { ORIGENS_CONTATO, PORTES_EMPRESA, ehOpcaoOutro, ehSegmentoCustomizado, segmentosPorTipo } from "@/lib/opcoes-cliente";
import { mascararCpf } from "@/lib/formatacao";
import { Campo, SecaoNumerada, inputClass } from "@/ui/campo";
import { SeletorLocalidade } from "../../seletor-localidade";
import { atualizarClienteAction } from "./actions";

const PESSOA_VAZIA: DadosPessoa = { nome: "", endereco: "", rg: "", cpf: "", telefone: "", email: "" };

function CamposPessoa({
  valores,
  onChange,
  disabled,
}: {
  valores: DadosPessoa;
  onChange: (valores: DadosPessoa) => void;
  disabled?: boolean;
}) {
  const set = <K extends keyof DadosPessoa>(campo: K, valor: string) =>
    onChange({ ...valores, [campo]: valor });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Campo label="Nome">
        <input disabled={disabled} value={valores.nome} onChange={(e) => set("nome", e.target.value)} className={inputClass} />
      </Campo>
      <Campo label="E-mail">
        <input type="email" disabled={disabled} value={valores.email} onChange={(e) => set("email", e.target.value)} className={inputClass} />
      </Campo>
      <Campo label="Endereço">
        <input disabled={disabled} value={valores.endereco} onChange={(e) => set("endereco", e.target.value)} className={inputClass} />
      </Campo>
      <Campo label="Telefone">
        <input disabled={disabled} value={valores.telefone} onChange={(e) => set("telefone", e.target.value)} className={inputClass} />
      </Campo>
      <Campo label="RG">
        <input disabled={disabled} value={valores.rg} onChange={(e) => set("rg", e.target.value)} className={inputClass} />
      </Campo>
      <Campo label="CPF">
        <input disabled={disabled} value={valores.cpf} onChange={(e) => set("cpf", mascararCpf(e.target.value))} className={inputClass} />
      </Campo>
    </div>
  );
}

function SeletorSegmento({
  tipo,
  value,
  customizado,
  onChange,
  onChangeCustomizado,
}: {
  tipo: TipoCliente;
  value: string;
  customizado: string;
  onChange: (valor: string) => void;
  onChangeCustomizado: (valor: string) => void;
}) {
  const outroSelecionado = ehOpcaoOutro(tipo, value);
  return (
    <>
      <Campo label="Segmento">
        <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
          <option value="">Selecione</option>
          {segmentosPorTipo(tipo).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Campo>
      {outroSelecionado && (
        <Campo label={`Qual "${value}"?`} obrigatorio>
          <input required value={customizado} onChange={(e) => onChangeCustomizado(e.target.value)} className={inputClass} />
        </Campo>
      )}
    </>
  );
}

function SeletorOrigem({ value, onChange }: { value: string; onChange: (valor: string) => void }) {
  return (
    <Campo label="Origem do contato">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Selecione</option>
        {ORIGENS_CONTATO.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Campo>
  );
}

type ValoresIniciaisPJ = {
  tipo: "PESSOA_JURIDICA";
  cnpj: string;
  razaoSocial: string;
  endereco: string;
  segmento: string;
  origemContato: string;
  atividadePrincipal: string;
  porte: string;
  estado: string;
  municipio: string;
  responsavelLegal: DadosPessoa;
  pontoContato: DadosPessoa & { cargo: string };
};

type ValoresIniciaisPF = {
  tipo: "PESSOA_FISICA";
  cpf: string;
  nome: string;
  rg: string;
  endereco: string;
  cep: string;
  municipio: string;
  estado: string;
  atividadePrincipal: string;
  email: string;
  segmento: string;
  origemContato: string;
};

export function EditarClienteForm({
  clienteId,
  valoresIniciais,
}: {
  clienteId: string;
  valoresIniciais: ValoresIniciaisPJ | ValoresIniciaisPF;
}) {
  const tipo = valoresIniciais.tipo;

  const [endereco, setEndereco] = useState(valoresIniciais.endereco);
  const segmentoCustomizadoInicial = ehSegmentoCustomizado(tipo, valoresIniciais.segmento);
  const [segmento, setSegmento] = useState(
    segmentoCustomizadoInicial ? "" : valoresIniciais.segmento,
  );
  const [segmentoCustomizado, setSegmentoCustomizado] = useState(
    segmentoCustomizadoInicial ? valoresIniciais.segmento : "",
  );
  const [origemContato, setOrigemContato] = useState(valoresIniciais.origemContato);
  const [atividadePrincipal, setAtividadePrincipal] = useState(valoresIniciais.atividadePrincipal);
  const [estado, setEstado] = useState(valoresIniciais.estado);
  const [municipio, setMunicipio] = useState(valoresIniciais.municipio);

  // PJ
  const [razaoSocial, setRazaoSocial] = useState(
    valoresIniciais.tipo === "PESSOA_JURIDICA" ? valoresIniciais.razaoSocial : "",
  );
  const [porte, setPorte] = useState(valoresIniciais.tipo === "PESSOA_JURIDICA" ? valoresIniciais.porte : "");
  const [responsavelLegal, setResponsavelLegal] = useState<DadosPessoa>(
    valoresIniciais.tipo === "PESSOA_JURIDICA" ? valoresIniciais.responsavelLegal : PESSOA_VAZIA,
  );
  const [mesmaPessoa, setMesmaPessoa] = useState(false);
  const [pontoContato, setPontoContato] = useState<DadosPessoa>(
    valoresIniciais.tipo === "PESSOA_JURIDICA" ? valoresIniciais.pontoContato : PESSOA_VAZIA,
  );
  const [cargoContato, setCargoContato] = useState(
    valoresIniciais.tipo === "PESSOA_JURIDICA" ? valoresIniciais.pontoContato.cargo : "",
  );

  // PF
  const [nome, setNome] = useState(valoresIniciais.tipo === "PESSOA_FISICA" ? valoresIniciais.nome : "");
  const [rg, setRg] = useState(valoresIniciais.tipo === "PESSOA_FISICA" ? valoresIniciais.rg : "");
  const [cep, setCep] = useState(valoresIniciais.tipo === "PESSOA_FISICA" ? valoresIniciais.cep : "");
  const [emailPf, setEmailPf] = useState(valoresIniciais.tipo === "PESSOA_FISICA" ? valoresIniciais.email : "");

  const [enviando, startEnvio] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function atualizarResponsavelLegal(valores: DadosPessoa) {
    setResponsavelLegal(valores);
    if (mesmaPessoa) setPontoContato(valores);
  }

  function alternarMesmaPessoa(marcado: boolean) {
    setMesmaPessoa(marcado);
    if (marcado) setPontoContato(responsavelLegal);
  }

  function trocarEstado(valor: string) {
    setEstado(valor);
    setMunicipio("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    startEnvio(async () => {
      const comuns = {
        segmento,
        segmentoCustomizado: segmentoCustomizado || undefined,
        origemContato,
        atividadePrincipal: atividadePrincipal || undefined,
        estado: estado || undefined,
        municipio: municipio || undefined,
      };

      const resultado = await atualizarClienteAction(
        clienteId,
        tipo === "PESSOA_JURIDICA"
          ? {
              ...comuns,
              tipo: "PESSOA_JURIDICA",
              razaoSocial,
              endereco: endereco || undefined,
              porte: porte || undefined,
              responsavelLegal,
              pontoContato: heredarDadosPontoContato(pontoContato, cargoContato),
            }
          : {
              ...comuns,
              tipo: "PESSOA_FISICA",
              nome,
              rg: rg || undefined,
              endereco: endereco || undefined,
              cep: cep || undefined,
              email: emailPf || undefined,
            },
      );
      if (resultado?.erro) setErro(resultado.erro);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-[720px] flex-col gap-10">
      {tipo === "PESSOA_JURIDICA" ? (
        <SecaoNumerada numero={1} titulo="Dados da empresa">
          <div className="flex flex-col gap-4">
            <Campo label="CNPJ">
              <input disabled value={valoresIniciais.cnpj} className={inputClass} />
            </Campo>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Campo label="Razão social" obrigatorio>
                <input required value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} className={inputClass} />
              </Campo>
              <Campo label="Endereço">
                <input value={endereco} onChange={(e) => setEndereco(e.target.value)} className={inputClass} />
              </Campo>
              <Campo label="Atividade principal">
                <input value={atividadePrincipal} onChange={(e) => setAtividadePrincipal(e.target.value)} className={inputClass} />
              </Campo>
              <Campo label="Porte">
                <select value={porte} onChange={(e) => setPorte(e.target.value)} className={inputClass}>
                  <option value="">Selecione</option>
                  {PORTES_EMPRESA.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Campo>
              <SeletorLocalidade estado={estado} municipio={municipio} onChangeEstado={trocarEstado} onChangeMunicipio={setMunicipio} />
              <SeletorSegmento
                tipo={tipo}
                value={segmento}
                customizado={segmentoCustomizado}
                onChange={setSegmento}
                onChangeCustomizado={setSegmentoCustomizado}
              />
              <SeletorOrigem value={origemContato} onChange={setOrigemContato} />
            </div>
          </div>
        </SecaoNumerada>
      ) : (
        <SecaoNumerada numero={1} titulo="Dados pessoais">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="CPF">
              <input disabled value={valoresIniciais.cpf} className={inputClass} />
            </Campo>
            <Campo label="Nome" obrigatorio>
              <input required value={nome} onChange={(e) => setNome(e.target.value)} className={inputClass} />
            </Campo>
            <Campo label="E-mail">
              <input type="email" value={emailPf} onChange={(e) => setEmailPf(e.target.value)} className={inputClass} />
            </Campo>
            <Campo label="RG">
              <input value={rg} onChange={(e) => setRg(e.target.value)} className={inputClass} />
            </Campo>
            <Campo label="Endereço">
              <input value={endereco} onChange={(e) => setEndereco(e.target.value)} className={inputClass} />
            </Campo>
            <Campo label="CEP">
              <input value={cep} onChange={(e) => setCep(e.target.value)} className={inputClass} />
            </Campo>
            <Campo label="Atividade principal">
              <input value={atividadePrincipal} onChange={(e) => setAtividadePrincipal(e.target.value)} className={inputClass} />
            </Campo>
            <SeletorLocalidade estado={estado} municipio={municipio} onChangeEstado={trocarEstado} onChangeMunicipio={setMunicipio} />
            <SeletorSegmento
              tipo={tipo}
              value={segmento}
              customizado={segmentoCustomizado}
              onChange={setSegmento}
              onChangeCustomizado={setSegmentoCustomizado}
            />
            <SeletorOrigem value={origemContato} onChange={setOrigemContato} />
          </div>
        </SecaoNumerada>
      )}

      {tipo === "PESSOA_JURIDICA" && (
        <>
          <SecaoNumerada numero={2} titulo="Responsável Legal" descricao="Opcional.">
            <CamposPessoa valores={responsavelLegal} onChange={atualizarResponsavelLegal} />
          </SecaoNumerada>

          <SecaoNumerada numero={3} titulo="Ponto de Contato" descricao="Opcional.">
            <label className="mb-4 flex items-center gap-2 text-[15px] text-tinta">
              <input
                type="checkbox"
                checked={mesmaPessoa}
                onChange={(e) => alternarMesmaPessoa(e.target.checked)}
                className="h-4 w-4 accent-verde"
              />
              É a mesma pessoa do Responsável Legal
            </label>

            <div className="flex flex-col gap-4">
              <CamposPessoa valores={mesmaPessoa ? responsavelLegal : pontoContato} onChange={setPontoContato} disabled={mesmaPessoa} />
              <Campo label="Cargo">
                <input value={cargoContato} onChange={(e) => setCargoContato(e.target.value)} className={`${inputClass} sm:max-w-xs`} />
              </Campo>
            </div>
          </SecaoNumerada>
        </>
      )}

      {erro && (
        <p className="rounded-[3px] border-l-[3px] border-critico bg-branco px-4 py-3 text-[15px] text-critico">{erro}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-[3px] bg-verde px-6 py-3 font-[family-name:var(--font-interface)] text-[15px] font-semibold text-tinta hover:bg-verde-esc hover:text-branco disabled:opacity-60"
        >
          {enviando ? "Salvando…" : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}
