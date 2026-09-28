"use client";

import { useState } from "react";
import { Campo, inputClass } from "@/ui/campo";

const dias = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

function diaDaData(valor: string): number | null {
  if (!valor) return null;
  const [ano, mes, dia] = valor.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
}

type Props = {
  prazoInicial?: string;
  periodicidadeInicial?: string;
  diaSemanaInicial?: number | null;
};

export function CamposRecorrencia({ prazoInicial = "", periodicidadeInicial = "", diaSemanaInicial }: Props) {
  const [prazo, setPrazo] = useState(prazoInicial);
  const [periodicidade, setPeriodicidade] = useState(periodicidadeInicial);
  const [diaSemana, setDiaSemana] = useState(diaSemanaInicial ?? diaDaData(prazoInicial) ?? 1);
  const [diaEscolhido, setDiaEscolhido] = useState(diaSemanaInicial != null);

  function alterarPrazo(valor: string) {
    setPrazo(valor);
    const dia = diaDaData(valor);
    if (dia != null && !diaEscolhido) setDiaSemana(dia);
  }

  function resumo(): string | null {
    switch (periodicidade) {
      case "SEMANAL": return `Repete toda ${dias[diaSemana]}.`;
      case "MENSAL": return prazo ? `Repete todo mês, no dia ${Number(prazo.slice(-2))}.` : "Repete todo mês, no mesmo dia do prazo inicial.";
      case "TRIMESTRAL": return prazo ? `Repete a cada 3 meses, no dia ${Number(prazo.slice(-2))}.` : "Repete a cada 3 meses, no mesmo dia do prazo inicial.";
      case "SEMESTRAL": return prazo ? `Repete a cada 6 meses, no dia ${Number(prazo.slice(-2))}.` : "Repete a cada 6 meses, no mesmo dia do prazo inicial.";
      case "ANUAL": return prazo ? `Repete todo ano, em ${prazo.slice(8, 10)}/${prazo.slice(5, 7)}.` : "Repete todo ano, na mesma data do prazo inicial.";
      default: return null;
    }
  }

  return <>
    <Campo label="Prazo" obrigatorio><input type="date" name="prazo" required value={prazo} onChange={e => alterarPrazo(e.target.value)} className={inputClass} /></Campo>
    <Campo label="Periodicidade"><select name="periodicidade" value={periodicidade} onChange={e => setPeriodicidade(e.target.value)} className={inputClass}><option value="">Sem recorrência</option><option value="SEMANAL">Semanal</option><option value="MENSAL">Mensal</option><option value="TRIMESTRAL">Trimestral</option><option value="SEMESTRAL">Semestral</option><option value="ANUAL">Anual</option></select></Campo>
    {periodicidade === "SEMANAL" && <Campo label="Repetir em"><select name="diaSemana" value={diaSemana} onChange={e => { setDiaSemana(Number(e.target.value)); setDiaEscolhido(true); }} className={inputClass}>{dias.map((dia, indice) => <option value={indice} key={dia}>{dia[0].toLocaleUpperCase("pt-BR") + dia.slice(1)}</option>)}</select></Campo>}
    {periodicidade !== "SEMANAL" && <input type="hidden" name="diaSemana" value="" />}
    {resumo() && <p aria-live="polite" className="sm:col-span-2 rounded-[3px] border border-verde/40 bg-verde/10 px-4 py-3 text-[14px] font-medium text-tinta">{resumo()} {periodicidade === "SEMANAL" && "O prazo da próxima ocorrência seguirá esse dia da semana."}</p>}
  </>;
}
