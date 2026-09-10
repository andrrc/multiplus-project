"use client";

import { useState, useTransition } from "react";
import type { TipoCliente } from "@prisma/client";
import { heredarDadosPontoContato, type DadosPessoa } from "@/lib/heranca-pessoa";
import { ORIGENS_CONTATO, segmentosPorTipo } from "@/lib/opcoes-cliente";
import { mascararCnpj, mascararCpf } from "@/lib/formatacao";
import { Campo, SecaoNumerada, inputClass } from "../campo";
import { criarClienteAction, consultarCnpjAction } from "./actions";

const PESSOA_VAZIA: DadosPessoa = { nome: "", endereco: "", rg: "", cpf: "", telefone: "", email: "" };

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
    <div className="grid grid-cols-2 gap-4">
      <Campo label="Nome" obrigatorio>
        <input
          required
          disabled={disabled}
          value={valores.nome}
          onChange={(e) => set("nome", e.target.value)}
          className={inputClass}
          id={`${prefixoId}-nome`}
        />
      </Campo>
      <Campo label="E-mail" obrigatorio>
        <input
          required
          type="email"
          disabled={disabled}
          value={valores.email}
          onChange={(e) => set("email", e.target.value)}
          className={inputClass}
        />
      </Campo>
      <Campo label="Endereço" obrigatorio>
        <input
          required
          disabled={disabled}
          value={valores.endereco}
          onChange={(e) => set("endereco", e.target.value)}
          className={inputClass}
        />
      </Campo>
      <Campo label="Telefone" obrigatorio>
        <input
          required
          disabled={disabled}
          value={valores.telefone}
          onChange={(e) => set("telefone", e.target.value)}
          className={inputClass}
        />
      </Campo>
      <Campo label="RG" obrigatorio>
        <input
          required
          disabled={disabled}
          value={valores.rg}
          onChange={(e) => set("rg", e.target.value)}
          className={inputClass}
        />
      </Campo>
      <Campo label="CPF" obrigatorio>
        <input
          required
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
  onChange,
}: {
  tipo: TipoCliente;
  value: string;
  onChange: (valor: string) => void;
}) {
  return (
    <Campo label="Segmento" obrigatorio>
      <select required value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="" disabled>
          Selecione
        </option>
        {segmentosPorTipo(tipo).map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </Campo>
  );
}

function SeletorOrigem({ value, onChange }: { value: string; onChange: (valor: string) => void }) {
  return (
    <Campo label="Origem do contato" obrigatorio>
      <select required value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="" disabled>
          Selecione
        </option>
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

  // Pessoa Física
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [cep, setCep] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [emailPf, setEmailPf] = useState("");

  // Comuns
  const [endereco, setEndereco] = useState("");
  const [segmento, setSegmento] = useState("");
  const [origemContato, setOrigemContato] = useState("");
  const [pessoasOperacional, setPessoasOperacional] = useState<
    { nome: string; cargo: string; email: string }[]
  >([]);

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
  }

  const ultimaPessoa = pessoasOperacional[pessoasOperacional.length - 1];
  const podeAdicionarPessoa = !ultimaPessoa || ultimaPessoa.nome.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tipo) return;
    setErro(null);
    startEnvio(async () => {
      const pessoasOperacionalFiltradas = pessoasOperacional
        .filter((p) => p.nome.trim().length > 0)
        .map((p) => ({ nome: p.nome, cargo: p.cargo, email: p.email || undefined }));

      const resultado = await criarClienteAction(
        tipo === "PESSOA_JURIDICA"
          ? {
              tipo: "PESSOA_JURIDICA",
              razaoSocial,
              cnpj,
              endereco: endereco || undefined,
              segmento,
              origemContato,
              responsavelLegal,
              pontoContato: heredarDadosPontoContato(pontoContato, cargoContato),
              pessoasOperacional: pessoasOperacionalFiltradas,
            }
          : {
              tipo: "PESSOA_FISICA",
              nome,
              cpf,
              rg,
              endereco: endereco || undefined,
              cep: cep || undefined,
              municipio: municipio || undefined,
              email: emailPf,
              segmento,
              origemContato,
              pessoasOperacional: pessoasOperacionalFiltradas,
            },
      );
      if (resultado?.erro) setErro(resultado.erro);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-[720px] flex-col gap-10">
      <SecaoNumerada numero={1} titulo="Tipo de cliente">
        <div className="flex gap-3">
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
              <div className="flex gap-2">
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
                  className="shrink-0 rounded-[3px] border border-linha px-4 text-[14px] font-medium text-tinta hover:border-azul disabled:opacity-50"
                >
                  {buscandoCnpj ? "Buscando…" : "Buscar"}
                </button>
              </div>
              {mensagemCnpj && <p className="mt-1 text-[14px] text-cinza">{mensagemCnpj}</p>}
            </Campo>

            <div className="grid grid-cols-2 gap-4">
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
              <SeletorSegmento tipo={tipo} value={segmento} onChange={setSegmento} />
              <SeletorOrigem value={origemContato} onChange={setOrigemContato} />
            </div>
          </div>
        </SecaoNumerada>
      )}

      {tipo === "PESSOA_FISICA" && (
        <SecaoNumerada numero={2} titulo="Dados pessoais">
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Nome" obrigatorio>
              <input required value={nome} onChange={(e) => setNome(e.target.value)} className={inputClass} />
            </Campo>
            <Campo label="E-mail" obrigatorio>
              <input
                required
                type="email"
                value={emailPf}
                onChange={(e) => setEmailPf(e.target.value)}
                className={inputClass}
              />
            </Campo>
            <Campo label="CPF" obrigatorio>
              <input required value={cpf} onChange={(e) => setCpf(mascararCpf(e.target.value))} className={inputClass} />
            </Campo>
            <Campo label="RG" obrigatorio>
              <input required value={rg} onChange={(e) => setRg(e.target.value)} className={inputClass} />
            </Campo>
            <Campo label="Endereço" obrigatorio>
              <input
                required
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                className={inputClass}
              />
            </Campo>
            <Campo label="CEP" obrigatorio>
              <input required value={cep} onChange={(e) => setCep(e.target.value)} className={inputClass} />
            </Campo>
            <Campo label="Município" obrigatorio>
              <input
                required
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
                className={inputClass}
              />
            </Campo>
            <SeletorSegmento tipo={tipo} value={segmento} onChange={setSegmento} />
            <SeletorOrigem value={origemContato} onChange={setOrigemContato} />
          </div>
        </SecaoNumerada>
      )}

      {tipo === "PESSOA_JURIDICA" && (
        <>
          <SecaoNumerada numero={3} titulo="Responsável Legal">
            <CamposPessoa valores={responsavelLegal} onChange={atualizarResponsavelLegal} prefixoId="responsavel" />
          </SecaoNumerada>

          <SecaoNumerada numero={4} titulo="Ponto de Contato">
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
              <Campo label="Cargo" obrigatorio>
                <input
                  required
                  value={cargoContato}
                  onChange={(e) => setCargoContato(e.target.value)}
                  className={`${inputClass} max-w-xs`}
                />
              </Campo>
            </div>
          </SecaoNumerada>
        </>
      )}

      {tipo && (
        <SecaoNumerada
          numero={tipo === "PESSOA_JURIDICA" ? 5 : 3}
          titulo="Pessoas do operacional"
          descricao="Opcional — pode ser preenchido depois, na tela do cliente."
        >
          <div className="flex flex-col gap-3">
            {pessoasOperacional.map((pessoa, i) => (
              <div key={i} className="flex items-end gap-3">
                <Campo label="Nome">
                  <input
                    value={pessoa.nome}
                    onChange={(e) =>
                      setPessoasOperacional((lista) =>
                        lista.map((p, idx) => (idx === i ? { ...p, nome: e.target.value } : p)),
                      )
                    }
                    className={inputClass}
                  />
                </Campo>
                <Campo label="Cargo">
                  <input
                    value={pessoa.cargo}
                    onChange={(e) =>
                      setPessoasOperacional((lista) =>
                        lista.map((p, idx) => (idx === i ? { ...p, cargo: e.target.value } : p)),
                      )
                    }
                    className={inputClass}
                  />
                </Campo>
                <Campo label="E-mail">
                  <input
                    type="email"
                    value={pessoa.email}
                    onChange={(e) =>
                      setPessoasOperacional((lista) =>
                        lista.map((p, idx) => (idx === i ? { ...p, email: e.target.value } : p)),
                      )
                    }
                    className={inputClass}
                  />
                </Campo>
                <button
                  type="button"
                  onClick={() => setPessoasOperacional((lista) => lista.filter((_, idx) => idx !== i))}
                  className="mb-0.5 shrink-0 text-[14px] text-cinza hover:text-critico"
                >
                  Remover
                </button>
              </div>
            ))}

            <button
              type="button"
              disabled={!podeAdicionarPessoa}
              onClick={() => setPessoasOperacional((lista) => [...lista, { nome: "", cargo: "", email: "" }])}
              className="self-start rounded-[3px] border border-linha px-4 py-2 text-[14px] font-medium text-tinta hover:border-azul disabled:opacity-50"
            >
              + Adicionar pessoa
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
