"use client";

import { Campo, inputClass } from "@/ui/campo";
import { TIPOS_LAUDO, type DadosLaudoInput, type OpcaoResponsavelLaudo, type TipoLaudoInput } from "@/lib/validacao-laudo";

export function CamposLaudo({ valor, onChange, responsaveis, disabled = false }: { valor: DadosLaudoInput; onChange: (valor: DadosLaudoInput) => void; responsaveis: OpcaoResponsavelLaudo[]; disabled?: boolean }) {
  const opcoes = responsaveis;
  return (
    <fieldset disabled={disabled} className="min-w-0 rounded-[3px] border border-linha bg-papel p-4">
      <legend className="px-1 font-[family-name:var(--font-interface)] font-semibold">Laudo técnico</legend>
      <label className="flex min-h-11 items-center gap-2 font-[family-name:var(--font-interface)] text-[14px]">
        <input type="checkbox" checked={valor.possui} onChange={(e) => onChange({ ...valor, possui: e.target.checked })} className="accent-verde" />
        Possui laudo técnico
      </label>
      {valor.possui && <div className="mt-3 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Campo label="Nome do laudo" obrigatorio><input required value={valor.nome ?? ""} onChange={(e) => onChange({ ...valor, nome: e.target.value })} className={inputClass} /></Campo></div>
        <Campo label="Tipo de laudo" obrigatorio><select required value={valor.tipo ?? ""} onChange={(e) => onChange({ ...valor, tipo: e.target.value as TipoLaudoInput })} className={inputClass}><option value="">Selecione</option>{Object.entries(TIPOS_LAUDO).map(([tipo, nome]) => <option key={tipo} value={tipo}>{nome}</option>)}</select></Campo>
        <Campo label="Responsável pelo laudo" obrigatorio><select required value={valor.responsavelId ?? ""} onChange={(e) => onChange({ ...valor, responsavelId: e.target.value })} className={inputClass}><option value="">Selecione</option>{opcoes.map((pessoa) => <option key={pessoa.id} value={pessoa.id}>{pessoa.nome}{!pessoa.ativo || !["ADMIN", "ADMIN_INTERNO"].includes(pessoa.perfil) ? " (indisponível para novas escolhas)" : ""}</option>)}</select></Campo>
        <p className="text-[14px] text-cinza sm:col-span-2">Somente a administradora acessa este laudo. A indicação de responsável não concede acesso.</p>
      </div>}
      {!valor.possui && valor.versao && <p className="text-[14px] text-cinza">Ao salvar, o laudo ficará desativado. Os dados e as anotações serão preservados.</p>}
    </fieldset>
  );
}
