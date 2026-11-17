"use client";

/**
 * Campos de comprovante dos formulários de tarefa e subtarefa (só a administração os usa): marcar que o item exige
 * comprovante, a quantidade de fotos ou arquivos e a lista "o que enviar". O campo oculto `comprovanteCampos` avisa a
 * server action que o formulário trouxe estes campos; sem ele o item não é alterado.
 */
import { useState } from "react";
import { Campo, inputClass } from "@/ui/campo";

export function CamposComprovante({
  exigidoInicial = false,
  quantidadeInicial,
  instrucoesIniciais = [],
}: {
  exigidoInicial?: boolean;
  quantidadeInicial?: number | null;
  instrucoesIniciais?: string[];
}) {
  const [exigido, setExigido] = useState(exigidoInicial);
  return (
    <fieldset className="grid gap-4 rounded-cartao border border-linha p-4">
      <legend className="px-1 text-[13px] font-semibold text-ink">Comprovante do colaborador</legend>
      <input type="hidden" name="comprovanteCampos" value="1" />
      <label className="flex items-start gap-3 text-sm text-ink">
        <input
          type="checkbox"
          name="comprovanteExigido"
          checked={exigido}
          onChange={(evento) => setExigido(evento.target.checked)}
          className="mt-1 accent-verde"
        />
        <span>
          <span className="font-medium">Exigir comprovante para concluir</span>
          <span className="block text-[13px] text-cinza">O responsável só consegue pedir a conclusão depois de anexar fotos ou arquivos.</span>
        </span>
      </label>
      {exigido && (
        <>
          <Campo label="Quantidade de fotos ou arquivos">
            <input type="number" name="comprovanteQuantidade" min={1} max={20} defaultValue={quantidadeInicial ?? 1} required className={inputClass} />
          </Campo>
          <Campo label="O que enviar (um item por linha)">
            <textarea
              name="comprovanteInstrucoes"
              rows={4}
              maxLength={4200}
              defaultValue={instrucoesIniciais.join("\n")}
              placeholder={"Plaqueta do equipamento visível\nFoto do painel de controle"}
              className={inputClass}
            />
          </Campo>
        </>
      )}
    </fieldset>
  );
}
