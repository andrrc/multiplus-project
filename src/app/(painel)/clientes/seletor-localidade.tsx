"use client";

import { useEffect, useState, useTransition } from "react";
import { Campo, inputClass } from "./campo";
import { listarEstadosAction, listarMunicipiosAction } from "./novo/actions";
import type { Estado, Municipio } from "@/lib/localidades";

/**
 * RF-002c — Estado/Município via API de localidades (IBGE). Se a consulta falhar, cai pra
 * texto livre manual (mesmo espírito do fallback de CNPJ, RF-001) — os campos são opcionais,
 * então indisponibilidade nunca bloqueia o cadastro.
 */
export function SeletorLocalidade({
  estado,
  municipio,
  onChangeEstado,
  onChangeMunicipio,
}: {
  estado: string;
  municipio: string;
  onChangeEstado: (uf: string) => void;
  onChangeMunicipio: (nome: string) => void;
}) {
  const [estados, setEstados] = useState<Estado[] | null>(null);
  const [estadosIndisponiveis, setEstadosIndisponiveis] = useState(false);
  const [municipios, setMunicipios] = useState<Municipio[] | null>(null);
  const [municipiosIndisponiveis, setMunicipiosIndisponiveis] = useState(false);
  const [, startCarregarEstados] = useTransition();
  const [, startCarregarMunicipios] = useTransition();

  useEffect(() => {
    startCarregarEstados(async () => {
      const resultado = await listarEstadosAction();
      if (resultado.disponivel) setEstados(resultado.estados);
      else setEstadosIndisponiveis(true);
    });
  }, [startCarregarEstados]);

  useEffect(() => {
    if (!estado || estadosIndisponiveis) return;
    startCarregarMunicipios(async () => {
      setMunicipios(null);
      const resultado = await listarMunicipiosAction(estado);
      if (resultado.disponivel) setMunicipios(resultado.municipios);
      else setMunicipiosIndisponiveis(true);
    });
  }, [estado, estadosIndisponiveis, startCarregarMunicipios]);

  function trocarEstado(valor: string) {
    onChangeEstado(valor);
    onChangeMunicipio("");
  }

  return (
    <>
      <Campo label="Estado">
        {estadosIndisponiveis ? (
          <input
            value={estado}
            onChange={(e) => trocarEstado(e.target.value)}
            placeholder="UF (serviço de localidades indisponível)"
            className={inputClass}
          />
        ) : (
          <select value={estado} onChange={(e) => trocarEstado(e.target.value)} className={inputClass}>
            <option value="">{estados ? "Selecione" : "Carregando…"}</option>
            {estados?.map((e) => (
              <option key={e.sigla} value={e.sigla}>
                {e.nome}
              </option>
            ))}
          </select>
        )}
      </Campo>
      <Campo label="Município">
        {estadosIndisponiveis || municipiosIndisponiveis ? (
          <input
            value={municipio}
            onChange={(e) => onChangeMunicipio(e.target.value)}
            placeholder="Serviço de localidades indisponível"
            className={inputClass}
          />
        ) : (
          <select
            value={municipio}
            disabled={!estado}
            onChange={(e) => onChangeMunicipio(e.target.value)}
            className={inputClass}
          >
            <option value="">{!estado ? "Selecione o estado primeiro" : municipios ? "Selecione" : "Carregando…"}</option>
            {municipios?.map((m) => (
              <option key={m.nome} value={m.nome}>
                {m.nome}
              </option>
            ))}
          </select>
        )}
      </Campo>
    </>
  );
}
