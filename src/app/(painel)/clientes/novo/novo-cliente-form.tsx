"use client";

import { useState, useTransition } from "react";
import type { TipoCliente } from "@prisma/client";
import { heredarDadosPontoContato, PESSOA_VAZIA, type DadosPessoa } from "@/lib/heranca-pessoa";
import { ORIGENS_CONTATO, PORTES_EMPRESA, ehOpcaoOutro, segmentosPorTipo } from "@/lib/opcoes-cliente";
import { mascararCnpj, mascararCpf } from "@/lib/formatacao";
import type { PessoaEnvolvidaInput } from "@/lib/clientes";
import { Campo, SecaoNumerada, inputClass } from "@/ui/campo";
import { criarClienteAction, consultarCnpjAction } from "./actions";
import { SeletorLocalidade } from "../seletor-localidade";

type PessoaEnvolvidaForm = {
  tipo: "PESSOA" | "EMPRESA";
  nome: string;
  cpf: string;
  cnpj: string;
  telefone: string;
  email: string;
  temAcesso: boolean;
};

const PESSOA_ENVOLVIDA_VAZIA: PessoaEnvolvidaForm = {
  tipo: "PESSOA",
  nome: "",
  cpf: "",
  cnpj: "",
  telefone: "",
  email: "",
  temAcesso: false,
};

function CamposPessoa({
  valores,
  onChange,
  disabled,
  prefixoId,
}: {
  valores: DadosPessoa;
  onChange: (valores: DadosPessoa) => void;
  disabled?: boolean;
  prefixoId: string;
}) {
  const set = <K extends keyof DadosPessoa>(campo: K, valor: string) =>
    onChange({ ...valores, [campo]: valor });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Campo label="Nome">
        <input
          disabled={disabled}
          value={valores.nome}
          onChange={(e) => set("nome", e.target.value)}
          className={inputClass}
          id={`${prefixoId}-nome`}
        />
      </Campo>
      <Campo label="E-mail">
        <input
          type="email"
          disabled={disabled}
          value={valores.email}
          onChange={(e) => set("email", e.target.value)}
          className={inputClass}
        />
      </Campo>
      <Campo label="Endereço">
        <input
          disabled={disabled}
          value={valores.endereco}
          onChange={(e) => set("endereco", e.target.value)}
          className={inputClass}
        />
      </Campo>
      <Campo label="Telefone">
        <input
          disabled={disabled}
          value={valores.telefone}
          onChange={(e) => set("telefone", e.target.value)}
          className={inputClass}
        />
      </Campo>
      <Campo label="RG">
        <input
          disabled={disabled}
          value={valores.rg}
          onChange={(e) => set("rg", e.target.value)}
          className={inputClass}
        />
      </Campo>
      <Campo label="CPF">
        <input
          disabled={disabled}
          value={valores.cpf}
          onChange={(e) => set("cpf", mascararCpf(e.target.value))}
          className={inputClass}
        />
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
          <input
            required
            value={customizado}
            onChange={(e) => onChangeCustomizado(e.target.value)}
            className={inputClass}
          />
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

export function NovoClienteForm() {
  // RF-034 — o cadastro começa pela escolha do tipo.
  const [tipo, setTipo] = useState<TipoCliente | null>(null);

  // Pessoa Jurídica
  const [cnpj, setCnpj] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [responsavelLegal, setResponsavelLegal] = useState<DadosPessoa>(PESSOA_VAZIA);
  const [mesmaPessoa, setMesmaPessoa] = useState(false);
  const [pontoContato, setPontoContato] = useState<DadosPessoa>(PESSOA_VAZIA);
  const [cargoContato, setCargoContato] = useState("");
  const [buscandoCnpj, startBuscaCnpj] = useTransition();
  const [mensagemCnpj, setMensagemCnpj] = useState<string | null>(null);
  const [porte, setPorte] = useState("");

  // Pessoa Física
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [cep, setCep] = useState("");
  const [emailPf, setEmailPf] = useState("");

  // Comuns
  const [endereco, setEndereco] = useState("");
  const [estado, setEstado] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [atividadePrincipal, setAtividadePrincipal] = useState("");
  const [segmento, setSegmento] = useState("");
  const [segmentoCustomizado, setSegmentoCustomizado] = useState("");
  const [origemContato, setOrigemContato] = useState("");
  const [pessoasEnvolvidas, setPessoasEnvolvidas] = useState<PessoaEnvolvidaForm[]>([]);

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

  function buscarCnpj() {
    setMensagemCnpj(null);
    startBuscaCnpj(async () => {
      const resultado = await consultarCnpjAction(cnpj);
      switch (resultado.status) {
        case "encontrado":
          setRazaoSocial(resultado.razaoSocial);
          setEndereco(resultado.endereco);
          break;
        case "nao_encontrado":
          setMensagemCnpj("CNPJ não encontrado. Confira o número digitado.");
          break;
        case "indisponivel":
          setMensagemCnpj("Consulta indisponível no momento — preencha razão social e endereço manualmente.");
          break;
        case "invalido":
          setMensagemCnpj("CNPJ inválido.");
          break;
      }
    });
  }

  function trocarTipo(novoTipo: TipoCliente) {
    setTipo(novoTipo);
    setSegmento("");
    setSegmentoCustomizado("");
  }

  const ultimaPessoa = pessoasEnvolvidas[pessoasEnvolvidas.length - 1];
  const podeAdicionarPessoa =
    !ultimaPessoa ||
    (ultimaPessoa.nome.trim().length > 0 &&
      ultimaPessoa.telefone.trim().length > 0 &&
      ultimaPessoa.email.trim().length > 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tipo) return;
    setErro(null);
    startEnvio(async () => {
      const pessoasEnvolvidasFiltradas: PessoaEnvolvidaInput[] = pessoasEnvolvidas
        .filter((p) => p.nome.trim().length > 0)
        .map((p) => ({
          tipo: p.tipo,
          nome: p.nome,
          cpf: p.tipo === "PESSOA" ? p.cpf || undefined : undefined,
          cnpj: p.tipo === "EMPRESA" ? p.cnpj || undefined : undefined,
          telefone: p.telefone,
          email: p.email,
          temAcesso: p.temAcesso,
        }));

      const comuns = {
        segmento,
        segmentoCustomizado: segmentoCustomizado || undefined,
        origemContato,
        atividadePrincipal: atividadePrincipal || undefined,
        estado: estado || undefined,
        municipio: municipio || undefined,
        pessoasEnvolvidas: pessoasEnvolvidasFiltradas,
      };

      const resultado = await criarClienteAction(
        tipo === "PESSOA_JURIDICA"
          ? {
              ...comuns,
              tipo: "PESSOA_JURIDICA",
              razaoSocial,
              cnpj,
              endereco: endereco || undefined,
              porte: porte || undefined,
              responsavelLegal,
              pontoContato: heredarDadosPontoContato(pontoContato, cargoContato),
            }
          : {
              ...comuns,
              tipo: "PESSOA_FISICA",
              nome,
              cpf,
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
      <SecaoNumerada numero={1} titulo="Tipo de cliente">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => trocarTipo("PESSOA_JURIDICA")}
            className={`rounded-[3px] border px-5 py-3 font-[family-name:var(--font-interface)] text-[14.5px] font-medium ${
              tipo === "PESSOA_JURIDICA"
                ? "border-verde bg-verde-cl text-verde-esc"
                : "border-linha text-tinta hover:border-azul"
            }`}
          >
            Pessoa Jurídica
          </button>
          <button
            type="button"
            onClick={() => trocarTipo("PESSOA_FISICA")}
            className={`rounded-[3px] border px-5 py-3 font-[family-name:var(--font-interface)] text-[14.5px] font-medium ${
              tipo === "PESSOA_FISICA"
                ? "border-verde bg-verde-cl text-verde-esc"
                : "border-linha text-tinta hover:border-azul"
            }`}
          >
            Pessoa Física
          </button>
        </div>
      </SecaoNumerada>

      {tipo === "PESSOA_JURIDICA" && (
        <SecaoNumerada
          numero={2}
          titulo="Dados da empresa"
          descricao="Preenchidos automaticamente a partir do CNPJ, quando possível."
        >
          <div className="flex flex-col gap-4">
            <Campo label="CNPJ" obrigatorio>
              <div className="flex flex-wrap gap-2">
                <input
                  required
                  value={cnpj}
                  onChange={(e) => setCnpj(mascararCnpj(e.target.value))}
                  className={`${inputClass} flex-1`}
                  placeholder="00.000.000/0000-00"
                />
                <button
                  type="button"
                  onClick={buscarCnpj}
                  disabled={buscandoCnpj || !cnpj}
                  className="min-h-11 shrink-0 rounded-[3px] border border-linha px-4 text-[14px] font-medium text-tinta hover:border-azul disabled:opacity-50"
                >
                  {buscandoCnpj ? "Buscando…" : "Buscar"}
                </button>
              </div>
              {mensagemCnpj && <p className="mt-1 text-[14px] text-cinza">{mensagemCnpj}</p>}
            </Campo>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Campo label="Razão social" obrigatorio>
                <input
                  required
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  className={inputClass}
                />
              </Campo>
              <Campo label="Endereço">
                <input value={endereco} onChange={(e) => setEndereco(e.target.value)} className={inputClass} />
              </Campo>
              <Campo label="Atividade principal">
                <input
                  value={atividadePrincipal}
                  onChange={(e) => setAtividadePrincipal(e.target.value)}
                  className={inputClass}
                />
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
              <SeletorLocalidade
                estado={estado}
                municipio={municipio}
                onChangeEstado={setEstado}
                onChangeMunicipio={setMunicipio}
              />
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
      )}

      {tipo === "PESSOA_FISICA" && (
        <SecaoNumerada numero={2} titulo="Dados pessoais">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Nome" obrigatorio>
              <input required value={nome} onChange={(e) => setNome(e.target.value)} className={inputClass} />
            </Campo>
            <Campo label="CPF" obrigatorio>
              <input required value={cpf} onChange={(e) => setCpf(mascararCpf(e.target.value))} className={inputClass} />
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
              <input
                value={atividadePrincipal}
                onChange={(e) => setAtividadePrincipal(e.target.value)}
                className={inputClass}
              />
            </Campo>
            <SeletorLocalidade
              estado={estado}
              municipio={municipio}
              onChangeEstado={setEstado}
              onChangeMunicipio={setMunicipio}
            />
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
          <SecaoNumerada numero={3} titulo="Responsável Legal" descricao="Opcional.">
            <CamposPessoa valores={responsavelLegal} onChange={atualizarResponsavelLegal} prefixoId="responsavel" />
          </SecaoNumerada>

          <SecaoNumerada numero={4} titulo="Ponto de Contato" descricao="Opcional.">
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
              <CamposPessoa
                valores={mesmaPessoa ? responsavelLegal : pontoContato}
                onChange={setPontoContato}
                disabled={mesmaPessoa}
                prefixoId="contato"
              />
              <Campo label="Cargo">
                <input
                  value={cargoContato}
                  onChange={(e) => setCargoContato(e.target.value)}
                  className={`${inputClass} sm:max-w-xs`}
                />
              </Campo>
            </div>
          </SecaoNumerada>
        </>
      )}

      {tipo && (
        <SecaoNumerada
          numero={tipo === "PESSOA_JURIDICA" ? 5 : 3}
          titulo="Pessoas Envolvidas"
          descricao="Opcional — pode ser preenchido depois, na tela do cliente."
        >
          <div className="flex flex-col gap-3">
            {pessoasEnvolvidas.map((pessoa, i) => {
              const set = <K extends keyof PessoaEnvolvidaForm>(campo: K, valor: PessoaEnvolvidaForm[K]) =>
                setPessoasEnvolvidas((lista) => lista.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)));

              return (
                <div key={i} className="flex flex-col gap-2 rounded-[3px] border border-linha p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-3">
                      <label className="flex items-center gap-1.5 text-[13.5px] text-tinta">
                        <input
                          type="radio"
                          checked={pessoa.tipo === "PESSOA"}
                          onChange={() => set("tipo", "PESSOA")}
                          className="accent-verde"
                        />
                        Pessoa
                      </label>
                      <label className="flex items-center gap-1.5 text-[13.5px] text-tinta">
                        <input
                          type="radio"
                          checked={pessoa.tipo === "EMPRESA"}
                          onChange={() => set("tipo", "EMPRESA")}
                          className="accent-verde"
                        />
                        Empresa/PJ envolvida
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPessoasEnvolvidas((lista) => lista.filter((_, idx) => idx !== i))}
                      className="-my-2 -mr-2 ml-auto px-2 py-2 text-[14px] text-cinza hover:text-critico"
                    >
                      Remover
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Campo label={pessoa.tipo === "EMPRESA" ? "Razão social" : "Nome"}>
                      <input value={pessoa.nome} onChange={(e) => set("nome", e.target.value)} className={inputClass} />
                    </Campo>
                    {pessoa.tipo === "PESSOA" ? (
                      <Campo label="CPF">
                        <input
                          value={pessoa.cpf}
                          onChange={(e) => set("cpf", mascararCpf(e.target.value))}
                          className={inputClass}
                        />
                      </Campo>
                    ) : (
                      <Campo label="CNPJ">
                        <input
                          value={pessoa.cnpj}
                          onChange={(e) => set("cnpj", mascararCnpj(e.target.value))}
                          className={inputClass}
                        />
                      </Campo>
                    )}
                    <Campo label="Telefone">
                      <input value={pessoa.telefone} onChange={(e) => set("telefone", e.target.value)} className={inputClass} />
                    </Campo>
                    <Campo label="E-mail">
                      <input
                        type="email"
                        value={pessoa.email}
                        onChange={(e) => set("email", e.target.value)}
                        className={inputClass}
                      />
                    </Campo>
                  </div>
                  <label className="flex items-center gap-2 text-[13.5px] text-tinta">
                    <input
                      type="checkbox"
                      checked={pessoa.temAcesso}
                      onChange={(e) => set("temAcesso", e.target.checked)}
                      className="h-4 w-4 accent-verde"
                    />
                    É um colaborador? Um e-mail será enviado para definir a senha de acesso.
                  </label>
                </div>
              );
            })}

            <button
              type="button"
              disabled={!podeAdicionarPessoa}
              onClick={() => setPessoasEnvolvidas((lista) => [...lista, { ...PESSOA_ENVOLVIDA_VAZIA }])}
              className="min-h-11 self-start rounded-[3px] border border-linha px-4 py-2 text-[14px] font-medium text-tinta hover:border-azul disabled:opacity-50"
            >
              + Adicionar pessoa envolvida
            </button>
          </div>
        </SecaoNumerada>
      )}

      {erro && (
        <p className="rounded-[3px] border-l-[3px] border-critico bg-branco px-4 py-3 text-[15px] text-critico">
          {erro}
        </p>
      )}

      {tipo && (
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={enviando}
            className="rounded-[3px] bg-verde px-6 py-3 font-[family-name:var(--font-interface)] text-[15px] font-semibold text-tinta hover:bg-verde-esc hover:text-branco disabled:opacity-60"
          >
            {enviando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      )}
    </form>
  );
}
