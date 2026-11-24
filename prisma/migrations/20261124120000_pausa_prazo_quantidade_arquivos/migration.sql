-- A pausa do prazo (etapa 2 dos comprovantes) precisa saber se o envio tem arquivo, mas quem lê o pedido nem sempre lê os
-- arquivos (RLS): o novo responsável depois de uma reatribuição, o segundo externo atribuído à tarefa e o interno responsável sem
-- atribuição ao projeto viam contagem zero e, para eles, o item em conferência voltava a aparecer como atrasado.
-- A contagem passa a ficar no próprio pedido. Ela revela só "quantos arquivos o envio tem" a quem já lê o pedido; nome, caminho
-- e conteúdo dos arquivos seguem sob o RLS de arquivos_comprovante, que não muda. Análise: docs/analises/pausa-prazo-visibilidade-pedido.md.

ALTER TABLE "solicitacoes_conclusao" ADD COLUMN "quantidadeArquivos" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "solicitacoes_conclusao" ADD CONSTRAINT "solicitacoes_conclusao_quantidade_arquivos_check" CHECK ("quantidadeArquivos" >= 0);

-- Preenche os pedidos que já existem. O gatilho de imutabilidade recusa mudar pedido já decidido, então ele fica desligado só
-- durante este UPDATE (a migration roda numa transação, como dona da tabela).
ALTER TABLE "solicitacoes_conclusao" DISABLE TRIGGER trg_solicitacoes_conclusao_enforce;
UPDATE "solicitacoes_conclusao" s
SET "quantidadeArquivos" = (SELECT count(*) FROM "arquivos_comprovante" a WHERE a."solicitacaoId" = s."id");
ALTER TABLE "solicitacoes_conclusao" ENABLE TRIGGER trg_solicitacoes_conclusao_enforce;

-- O gatilho de imutabilidade passa a recusar mudar a contagem fora do gatilho dos arquivos, e a exigi-la zerada na criação.
-- Corpo parte da versão vigente (20261117120000_comprovantes_etapa1).
CREATE OR REPLACE FUNCTION solicitacoes_conclusao_enforce() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."status" <> 'PENDENTE' OR NEW."decididoPorId" IS NOT NULL OR NEW."decididoEm" IS NOT NULL THEN
      RAISE EXCEPTION 'RN-007: nova solicitação deve iniciar pendente';
    END IF;
    IF NEW."quantidadeArquivos" <> 0 THEN
      RAISE EXCEPTION 'RN-009: a quantidade de arquivos do envio é mantida pelo banco';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD."status" <> 'PENDENTE'
     OR NEW."id" IS DISTINCT FROM OLD."id"
     OR NEW."tarefaId" IS DISTINCT FROM OLD."tarefaId"
     OR NEW."subtarefaId" IS DISTINCT FROM OLD."subtarefaId"
     OR NEW."solicitadoPorId" IS DISTINCT FROM OLD."solicitadoPorId"
     OR NEW."solicitadoPorNome" IS DISTINCT FROM OLD."solicitadoPorNome"
     OR NEW."solicitadoEm" IS DISTINCT FROM OLD."solicitadoEm"
     OR NEW."statusAnterior" IS DISTINCT FROM OLD."statusAnterior"
     OR NEW."observacaoEnvio" IS DISTINCT FROM OLD."observacaoEnvio"
     OR (NEW."quantidadeArquivos" IS DISTINCT FROM OLD."quantidadeArquivos" AND pg_trigger_depth() < 2) THEN
    RAISE EXCEPTION 'RN-007: histórico de solicitação é imutável';
  END IF;

  -- Atualização da contagem de arquivos feita pelo gatilho dos arquivos: nada mais no pedido pode mudar junto.
  IF pg_trigger_depth() > 1
     AND NEW."status" = OLD."status"
     AND NEW."decididoPorId" IS NOT DISTINCT FROM OLD."decididoPorId"
     AND NEW."decididoPorNome" IS NOT DISTINCT FROM OLD."decididoPorNome"
     AND NEW."decididoEm" IS NOT DISTINCT FROM OLD."decididoEm"
     AND NEW."comentarioDecisao" IS NOT DISTINCT FROM OLD."comentarioDecisao" THEN
    RETURN NEW;
  END IF;

  IF (app_current_perfil() = 'ADMIN' OR decisao_delegada_solicitacao(OLD."id")) AND NEW."status" IN ('APROVADA', 'REJEITADA') THEN
    IF NEW."decididoPorId" IS DISTINCT FROM app_current_usuario_id()
       OR NEW."decididoPorNome" IS NULL
       OR NEW."decididoEm" IS NULL THEN
      RAISE EXCEPTION 'RN-007: decisão precisa identificar o Administrador e o horário';
    END IF;
    -- Devolver um envio com comprovantes exige o motivo, que volta ao colaborador.
    IF NEW."status" = 'REJEITADA' AND solicitacao_tem_comprovantes(OLD."id")
       AND NULLIF(btrim(COALESCE(NEW."comentarioDecisao", '')), '') IS NULL THEN
      RAISE EXCEPTION 'RN-009: informe o motivo da devolução do comprovante.';
    END IF;
    IF NEW."status" = 'APROVADA' AND NOT (
      (NEW."tarefaId" IS NOT NULL AND EXISTS (SELECT 1 FROM "tarefas" t WHERE t."id" = NEW."tarefaId" AND t."status" = 'Concluído'))
      OR (NEW."subtarefaId" IS NOT NULL AND EXISTS (SELECT 1 FROM "subtarefas" s WHERE s."id" = NEW."subtarefaId" AND s."status" = 'CONCLUIDO'))
    ) THEN
      RAISE EXCEPTION 'RN-007: o item precisa estar concluído antes de aprovar a solicitação';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW."status" = 'CANCELADA'
     AND (app_current_perfil() = 'ADMIN' OR OLD."solicitadoPorId" = app_current_usuario_id())
     AND NEW."decididoPorId" IS NULL
     AND NEW."decididoPorNome" IS NULL
     AND NEW."decididoEm" IS NULL THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'RN-007: sem permissão para decidir esta solicitação';
END;
$$;

-- Mantém a contagem quando um arquivo entra no envio (a função solicitar_conclusao liga os arquivos ao pedido com um UPDATE).
-- Arquivo enviado nunca é apagado, então a contagem só cresce.
CREATE OR REPLACE FUNCTION arquivo_comprovante_atualiza_quantidade() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW."solicitacaoId" IS NOT NULL THEN
    UPDATE "solicitacoes_conclusao" s
    SET "quantidadeArquivos" = (SELECT count(*) FROM "arquivos_comprovante" WHERE "solicitacaoId" = NEW."solicitacaoId")
    WHERE s."id" = NEW."solicitacaoId"
      AND s."quantidadeArquivos" IS DISTINCT FROM (SELECT count(*) FROM "arquivos_comprovante" WHERE "solicitacaoId" = NEW."solicitacaoId");
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION arquivo_comprovante_atualiza_quantidade() FROM PUBLIC;

CREATE TRIGGER trg_arquivo_comprovante_quantidade
AFTER INSERT OR UPDATE OF "solicitacaoId" ON "arquivos_comprovante"
FOR EACH ROW EXECUTE FUNCTION arquivo_comprovante_atualiza_quantidade();
