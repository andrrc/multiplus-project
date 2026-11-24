BEGIN;
ALTER TYPE "EventoNotificacao" ADD VALUE IF NOT EXISTS 'PEDIDO_PRAZO_RECEBIDO';
ALTER TYPE "EventoNotificacao" ADD VALUE IF NOT EXISTS 'PEDIDO_PRAZO_RESPONDIDO';
COMMIT;

BEGIN;

CREATE TYPE "TipoPedidoPrazo" AS ENUM ('PRAZO', 'IMPEDIMENTO');
CREATE TYPE "StatusPedidoPrazo" AS ENUM ('PENDENTE', 'APROVADO', 'RECUSADO', 'CANCELADO');

CREATE TABLE "pedidos_prazo" (
  "id" TEXT PRIMARY KEY,
  "tarefaId" TEXT REFERENCES "tarefas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "subtarefaId" TEXT REFERENCES "subtarefas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "tipo" "TipoPedidoPrazo" NOT NULL,
  "solicitadoPorId" TEXT REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "solicitadoPorNome" TEXT NOT NULL,
  "solicitadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "prazoAtual" TIMESTAMP(3),
  "prazoNovo" TIMESTAMP(3),
  "prazoSubstituido" TIMESTAMP(3),
  "motivo" TEXT NOT NULL CHECK (char_length(btrim("motivo")) BETWEEN 1 AND 2000),
  "status" "StatusPedidoPrazo" NOT NULL DEFAULT 'PENDENTE',
  "decididoPorId" TEXT REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "decididoPorNome" TEXT,
  "decididoEm" TIMESTAMP(3),
  "respostaDecisao" TEXT CHECK (char_length("respostaDecisao") <= 2000),
  CHECK (num_nonnulls("tarefaId", "subtarefaId") = 1),
  CHECK (("tipo" = 'PRAZO') = ("prazoNovo" IS NOT NULL)),
  CHECK ("status" <> 'RECUSADO' OR COALESCE(char_length(btrim("respostaDecisao")), 0) > 0)
);

CREATE INDEX "pedidos_prazo_status_solicitadoEm_idx" ON "pedidos_prazo"("status", "solicitadoEm");
CREATE INDEX "pedidos_prazo_tarefaId_solicitadoEm_idx" ON "pedidos_prazo"("tarefaId", "solicitadoEm");
CREATE INDEX "pedidos_prazo_subtarefaId_solicitadoEm_idx" ON "pedidos_prazo"("subtarefaId", "solicitadoEm");
CREATE UNIQUE INDEX pedidos_prazo_tarefa_pendente ON "pedidos_prazo"("tarefaId") WHERE "status" = 'PENDENTE';
CREATE UNIQUE INDEX pedidos_prazo_subtarefa_pendente ON "pedidos_prazo"("subtarefaId") WHERE "status" = 'PENDENTE';

ALTER TABLE "pedidos_prazo" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "pedidos_prazo" FROM multiplus_app;
GRANT SELECT ON "pedidos_prazo" TO multiplus_app;
CREATE POLICY pedidos_prazo_select ON "pedidos_prazo" FOR SELECT TO multiplus_app USING (
  app_current_perfil() = 'ADMIN'
  OR (app_current_perfil() = 'ADMIN_EXTERNO' AND "solicitadoPorId" = app_current_usuario_id())
  OR interno_atribuido_ao_item_do_comprovante("tarefaId", "subtarefaId")
);

CREATE FUNCTION pedidos_prazo_enforce() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD."status" <> 'PENDENTE' OR NEW."status" = 'PENDENTE' OR
    (to_jsonb(NEW) - ARRAY['status','prazoSubstituido','decididoPorId','decididoPorNome','decididoEm','respostaDecisao'])
      IS DISTINCT FROM
    (to_jsonb(OLD) - ARRAY['status','prazoSubstituido','decididoPorId','decididoPorNome','decididoEm','respostaDecisao'])
  THEN RAISE EXCEPTION 'Pedido de prazo imutável.'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pedidos_prazo_enforce BEFORE UPDATE ON "pedidos_prazo"
FOR EACH ROW EXECUTE FUNCTION pedidos_prazo_enforce();

-- Os gatilhos mantêm o caminho de conclusão e reconhecem a decisão de prazo
-- somente dentro da função proprietária. Uma configuração de sessão não concede permissão.
CREATE OR REPLACE FUNCTION tarefas_enforce_rn007() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF app_current_perfil() IS NULL OR app_current_perfil() = 'ADMIN' THEN RETURN NEW; END IF;
  IF app_current_perfil() = 'ADMIN_INTERNO'
    AND current_user = pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid = TG_RELID))
    AND current_setting('app.pedido_prazo_item', true) = 'TAREFA:' || OLD."id"
  THEN
    IF (to_jsonb(NEW) - 'prazo') IS NOT DISTINCT FROM (to_jsonb(OLD) - 'prazo') THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'A decisão do pedido só permite alterar o prazo.';
  END IF;
  IF decisao_delegada_tarefa(OLD."id") THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'RN-007: colaboradores precisam solicitar conclusão; somente o Administrador confirma o status';
END;
$$;

CREATE OR REPLACE FUNCTION subtarefas_enforce_rn004() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF app_current_perfil() IS NULL OR app_current_perfil() = 'ADMIN' THEN RETURN NEW; END IF;
  IF app_current_perfil() = 'ADMIN_INTERNO'
    AND current_user = pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid = TG_RELID))
    AND current_setting('app.pedido_prazo_item', true) = 'SUBTAREFA:' || OLD."id"
  THEN
    IF (to_jsonb(NEW) - 'prazo') IS NOT DISTINCT FROM (to_jsonb(OLD) - 'prazo') THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'A decisão do pedido só permite alterar o prazo.';
  END IF;
  IF decisao_delegada_subtarefa(OLD."id") THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'RN-004: colaboradores precisam solicitar conclusão; somente o Administrador confirma o status';
END;
$$;

-- A função é interna. Toda escrita no pedido trava primeiro a tarefa e depois a subtarefa.
CREATE FUNCTION item_do_pedido_prazo(p_tipo TEXT, p_id TEXT, p_travar BOOLEAN)
RETURNS TABLE (prazo TIMESTAMP, periodicidade TEXT, ancora TIMESTAMP, dia_semana INTEGER, fechado BOOLEAN, conferencia BOOLEAN)
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  id_tarefa TEXT;
BEGIN
  IF p_tipo = 'TAREFA' THEN id_tarefa := p_id;
  ELSIF p_tipo = 'SUBTAREFA' THEN SELECT s."tarefaId" INTO id_tarefa FROM "subtarefas" s WHERE s."id" = p_id;
  ELSE RETURN;
  END IF;

  IF p_travar THEN
    PERFORM 1 FROM "tarefas" t WHERE t."id" = id_tarefa FOR UPDATE;
    IF p_tipo = 'SUBTAREFA' THEN
      PERFORM 1 FROM "subtarefas" s WHERE s."id" = p_id AND s."tarefaId" = id_tarefa FOR UPDATE;
    END IF;
  END IF;

  RETURN QUERY
    SELECT CASE WHEN p_tipo = 'TAREFA' THEN t."prazo" ELSE s."prazo" END,
      CASE WHEN p_tipo = 'TAREFA' THEN t."periodicidade"::text END,
      t."prazoOriginal", t."diaSemana",
      NOT (t."ativo" AND p."ativo" AND c."ativo")
        OR t."status" IN ('Concluído', 'Cancelado')
        OR (p_tipo = 'SUBTAREFA' AND (NOT s."ativo" OR s."status" IN ('CONCLUIDO', 'CANCELADO'))),
      EXISTS (
        SELECT 1 FROM "solicitacoes_conclusao" sc
        WHERE sc."status" = 'PENDENTE' AND sc."quantidadeArquivos" > 0
          AND (CASE WHEN p_tipo = 'TAREFA' THEN sc."tarefaId" = t."id" ELSE sc."subtarefaId" = s."id" END)
      )
    FROM "tarefas" t
    JOIN "projetos" p ON p."id" = t."projetoId"
    JOIN "clientes" c ON c."id" = p."clienteId"
    LEFT JOIN "subtarefas" s ON p_tipo = 'SUBTAREFA' AND s."id" = p_id AND s."tarefaId" = id_tarefa
    WHERE t."id" = id_tarefa AND (p_tipo = 'TAREFA' OR s."id" IS NOT NULL);
END;
$$;

-- Espelha calcularProximaOcorrencia, inclusive o recuo quando o prazo cai
-- no mês da próxima ocorrência, antes da data ancorada daquele mês.
CREATE FUNCTION proxima_ocorrencia_pedido_prazo(p_atual DATE, p_periodicidade TEXT, p_ancora DATE, p_dia INTEGER)
RETURNS DATE LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  ancora DATE := COALESCE(p_ancora, p_atual);
  passo INTEGER;
  indice INTEGER;
  candidato DATE;
BEGIN
  IF p_atual IS NULL THEN RETURN NULL; END IF;
  IF p_periodicidade = 'SEMANAL' THEN
    IF p_dia IS NULL OR p_dia NOT BETWEEN 0 AND 6 THEN RETURN p_atual + 7; END IF;
    RETURN p_atual + COALESCE(NULLIF((p_dia - extract(dow FROM p_atual)::integer + 7) % 7, 0), 7);
  END IF;
  passo := CASE p_periodicidade WHEN 'MENSAL' THEN 1 WHEN 'TRIMESTRAL' THEN 3
    WHEN 'SEMESTRAL' THEN 6 WHEN 'ANUAL' THEN 12 END;
  IF passo IS NULL THEN RETURN NULL; END IF;
  indice := GREATEST(0, (
    (extract(year FROM p_atual)::integer - extract(year FROM ancora)::integer) * 12
    + extract(month FROM p_atual)::integer - extract(month FROM ancora)::integer
  ) / passo);
  WHILE indice > 0 LOOP
    candidato := (ancora + make_interval(months => indice * passo))::date;
    EXIT WHEN candidato <= p_atual;
    indice := indice - 1;
  END LOOP;
  RETURN (ancora + make_interval(months => (indice + 1) * passo))::date;
END;
$$;

CREATE FUNCTION validar_data_pedido_prazo(
  p_atual TIMESTAMP, p_novo DATE, p_periodicidade TEXT, p_ancora TIMESTAMP, p_dia INTEGER
) RETURNS VOID LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF p_atual IS NULL THEN RAISE EXCEPTION 'O item não tem prazo. Informe um impedimento.'; END IF;
  IF p_novo IS NULL OR NOT isfinite(p_novo) OR p_novo <= p_atual::date THEN
    RAISE EXCEPTION 'A nova data precisa ser posterior ao prazo atual.';
  END IF;
  IF p_novo < (statement_timestamp() AT TIME ZONE 'America/Sao_Paulo')::date THEN
    RAISE EXCEPTION 'A nova data não pode ser anterior a hoje.';
  END IF;
  IF p_novo >= proxima_ocorrencia_pedido_prazo(p_atual::date, p_periodicidade, p_ancora::date, p_dia) THEN
    RAISE EXCEPTION 'A nova data precisa ser anterior à próxima ocorrência.';
  END IF;
END;
$$;

-- O responsável atual recebe só este estado. A política da tabela continua
-- a limitar a leitura do pedido aos perfis autorizados e ao autor.
CREATE FUNCTION estado_pedido_prazo(p_tipo TEXT, p_id TEXT)
RETURNS TABLE (
  prazo TIMESTAMP, periodicidade TEXT, ancora TIMESTAMP, dia_semana INTEGER,
  fechado BOOLEAN, conferencia BOOLEAN, pendente BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF app_current_perfil() IS DISTINCT FROM 'ADMIN_EXTERNO'
    OR NOT colaborador_responsavel_pelo_item(p_tipo, p_id) THEN RETURN; END IF;

  RETURN QUERY SELECT i.*, EXISTS (
    SELECT 1 FROM "pedidos_prazo" pp WHERE pp."status" = 'PENDENTE' AND
    (CASE WHEN p_tipo = 'TAREFA' THEN pp."tarefaId" = p_id ELSE pp."subtarefaId" = p_id END)
  ) FROM item_do_pedido_prazo(p_tipo, p_id, false) i;
END;
$$;

CREATE FUNCTION solicitar_pedido_prazo(
  p_tipo TEXT, p_id TEXT, p_pedido "TipoPedidoPrazo", p_novo DATE, p_motivo TEXT
) RETURNS "pedidos_prazo" LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  autor "usuarios"%ROWTYPE;
  item RECORD;
  criado "pedidos_prazo"%ROWTYPE;
  motivo TEXT := regexp_replace(COALESCE(p_motivo, ''), '^[[:space:]]+|[[:space:]]+$', '', 'g');
BEGIN
  SELECT * INTO autor FROM "usuarios" WHERE "id" = app_current_usuario_id() AND "ativo" AND "perfil" = 'ADMIN_EXTERNO';
  IF NOT FOUND OR app_current_perfil() IS DISTINCT FROM 'ADMIN_EXTERNO'
    OR NOT colaborador_responsavel_pelo_item(p_tipo, p_id)
  THEN RAISE EXCEPTION 'Só o colaborador externo responsável pode enviar o pedido.'; END IF;

  SELECT * INTO item FROM item_do_pedido_prazo(p_tipo, p_id, true);
  IF NOT FOUND OR item.fechado THEN RAISE EXCEPTION 'O item está fechado ou indisponível.'; END IF;
  IF NOT colaborador_responsavel_pelo_item(p_tipo, p_id) THEN
    RAISE EXCEPTION 'Só o colaborador externo responsável pode enviar o pedido.';
  END IF;
  IF item.conferencia THEN RAISE EXCEPTION 'O item está em conferência de comprovantes.'; END IF;
  IF char_length(motivo) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Informe um motivo de até 2.000 caracteres.'; END IF;
  IF p_pedido = 'PRAZO' THEN
    PERFORM validar_data_pedido_prazo(item.prazo, p_novo, item.periodicidade, item.ancora, item.dia_semana);
  ELSIF p_pedido IS DISTINCT FROM 'IMPEDIMENTO' OR p_novo IS NOT NULL THEN
    RAISE EXCEPTION 'Informe um tipo de pedido válido.';
  END IF;

  INSERT INTO "pedidos_prazo" ("id", "tarefaId", "subtarefaId", "tipo", "solicitadoPorId", "solicitadoPorNome", "prazoAtual", "prazoNovo", "motivo")
  VALUES (gen_random_uuid()::text, CASE WHEN p_tipo = 'TAREFA' THEN p_id END,
    CASE WHEN p_tipo = 'SUBTAREFA' THEN p_id END, p_pedido, autor."id", autor."nome", item.prazo, p_novo, motivo)
  RETURNING * INTO criado;
  RETURN criado;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Já existe um pedido pendente para este item.';
END;
$$;

CREATE FUNCTION decidir_pedido_prazo(
  p_id TEXT, p_aprovar BOOLEAN, p_resposta TEXT, p_confirmar BOOLEAN, p_prazo_confirmado TIMESTAMP
) RETURNS "pedidos_prazo" LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  atual "pedidos_prazo"%ROWTYPE;
  decisor "usuarios"%ROWTYPE;
  tipo TEXT;
  id_item TEXT;
  item RECORD;
  resposta TEXT := NULLIF(regexp_replace(COALESCE(p_resposta, ''), '^[[:space:]]+|[[:space:]]+$', '', 'g'), '');
BEGIN
  SELECT * INTO decisor FROM "usuarios" WHERE "id" = app_current_usuario_id() AND "ativo"
    AND "perfil"::text = app_current_perfil() AND "perfil" IN ('ADMIN', 'ADMIN_INTERNO');
  IF NOT FOUND THEN RAISE EXCEPTION 'Sem permissão para decidir este pedido.'; END IF;

  SELECT * INTO atual FROM "pedidos_prazo" WHERE "id" = p_id;
  IF NOT FOUND OR (decisor."perfil" <> 'ADMIN' AND
    NOT interno_atribuido_ao_item_do_comprovante(atual."tarefaId", atual."subtarefaId"))
  THEN RAISE EXCEPTION 'Sem permissão para decidir este pedido.'; END IF;

  tipo := CASE WHEN atual."tarefaId" IS NOT NULL THEN 'TAREFA' ELSE 'SUBTAREFA' END;
  id_item := COALESCE(atual."tarefaId", atual."subtarefaId");
  SELECT * INTO item FROM item_do_pedido_prazo(tipo, id_item, true);
  IF NOT FOUND OR item.fechado THEN RAISE EXCEPTION 'O item está fechado ou indisponível.'; END IF;

  SELECT * INTO atual FROM "pedidos_prazo" WHERE "id" = p_id FOR UPDATE;
  IF NOT FOUND OR atual."status" <> 'PENDENTE' THEN RAISE EXCEPTION 'O pedido já foi respondido ou retirado.'; END IF;
  IF p_aprovar IS NULL OR (NOT p_aprovar AND resposta IS NULL) THEN
    RAISE EXCEPTION 'Informe uma resposta para recusar o pedido.';
  END IF;
  IF char_length(resposta) > 2000 THEN RAISE EXCEPTION 'A resposta deve ter até 2.000 caracteres.'; END IF;

  IF p_aprovar AND atual."tipo" = 'PRAZO' THEN
    IF item.prazo IS DISTINCT FROM atual."prazoAtual" AND
      (p_confirmar IS DISTINCT FROM true OR p_prazo_confirmado IS DISTINCT FROM item.prazo) THEN
      RAISE EXCEPTION 'O prazo mudou. Confira a data vigente e confirme a aprovação.';
    END IF;
    PERFORM validar_data_pedido_prazo(item.prazo, atual."prazoNovo"::date, item.periodicidade, item.ancora, item.dia_semana);
    PERFORM set_config('app.pedido_prazo_item', tipo || ':' || id_item, true);
    IF tipo = 'TAREFA' THEN
      UPDATE "tarefas" SET "prazo" = atual."prazoNovo" WHERE "id" = id_item;
    ELSE
      UPDATE "subtarefas" SET "prazo" = atual."prazoNovo" WHERE "id" = id_item;
    END IF;
    PERFORM set_config('app.pedido_prazo_item', '', true);
  END IF;

  UPDATE "pedidos_prazo" SET "status" = CASE WHEN p_aprovar THEN 'APROVADO'::"StatusPedidoPrazo" ELSE 'RECUSADO'::"StatusPedidoPrazo" END,
    "prazoSubstituido" = CASE WHEN p_aprovar AND atual."tipo" = 'PRAZO' THEN item.prazo END,
    "decididoPorId" = decisor."id", "decididoPorNome" = decisor."nome",
    "decididoEm" = CURRENT_TIMESTAMP, "respostaDecisao" = resposta
  WHERE "id" = p_id RETURNING * INTO atual;
  RETURN atual;
END;
$$;

CREATE FUNCTION cancelar_pedido_prazo(p_id TEXT)
RETURNS "pedidos_prazo" LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  atual "pedidos_prazo"%ROWTYPE;
  autor "usuarios"%ROWTYPE;
BEGIN
  SELECT * INTO autor FROM "usuarios" WHERE "id" = app_current_usuario_id() AND "ativo" AND "perfil"::text = app_current_perfil();
  IF NOT FOUND THEN RAISE EXCEPTION 'Sem permissão para retirar este pedido.'; END IF;
  SELECT * INTO atual FROM "pedidos_prazo" WHERE "id" = p_id FOR UPDATE;
  IF NOT FOUND OR (autor."perfil" <> 'ADMIN'
    AND (autor."perfil" <> 'ADMIN_EXTERNO' OR atual."solicitadoPorId" IS DISTINCT FROM autor."id"))
  THEN RAISE EXCEPTION 'Sem permissão para retirar este pedido.'; END IF;
  IF atual."status" <> 'PENDENTE' THEN RAISE EXCEPTION 'O pedido já foi respondido ou retirado.'; END IF;

  UPDATE "pedidos_prazo" SET "status" = 'CANCELADO', "decididoPorId" = autor."id",
    "decididoPorNome" = autor."nome", "decididoEm" = CURRENT_TIMESTAMP
  WHERE "id" = p_id RETURNING * INTO atual;
  RETURN atual;
END;
$$;

CREATE FUNCTION cancelar_pedido_prazo_item_fechado() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW."ativo" AND NEW."status"::text NOT IN ('Cancelado', 'Concluído', 'CANCELADO', 'CONCLUIDO') THEN
    RETURN NULL;
  END IF;

  IF TG_TABLE_NAME = 'tarefas' THEN
    UPDATE "pedidos_prazo" SET "status" = 'CANCELADO', "decididoEm" = CURRENT_TIMESTAMP
    WHERE "status" = 'PENDENTE' AND (
      "tarefaId" = NEW."id" OR "subtarefaId" IN (
        SELECT "id" FROM "subtarefas" WHERE "tarefaId" = NEW."id"
      )
    );
  ELSE
    UPDATE "pedidos_prazo" SET "status" = 'CANCELADO', "decididoEm" = CURRENT_TIMESTAMP
    WHERE "status" = 'PENDENTE' AND "subtarefaId" = NEW."id";
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER tarefas_cancelam_pedido_prazo AFTER UPDATE OF "status", "ativo" ON "tarefas"
FOR EACH ROW EXECUTE FUNCTION cancelar_pedido_prazo_item_fechado();
CREATE TRIGGER subtarefas_cancelam_pedido_prazo AFTER UPDATE OF "status", "ativo" ON "subtarefas"
FOR EACH ROW EXECUTE FUNCTION cancelar_pedido_prazo_item_fechado();

REVOKE ALL ON FUNCTION pedidos_prazo_enforce() FROM PUBLIC;
REVOKE ALL ON FUNCTION item_do_pedido_prazo(TEXT, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION proxima_ocorrencia_pedido_prazo(DATE, TEXT, DATE, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION validar_data_pedido_prazo(TIMESTAMP, DATE, TEXT, TIMESTAMP, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION estado_pedido_prazo(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION solicitar_pedido_prazo(TEXT, TEXT, "TipoPedidoPrazo", DATE, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION decidir_pedido_prazo(TEXT, BOOLEAN, TEXT, BOOLEAN, TIMESTAMP) FROM PUBLIC;
REVOKE ALL ON FUNCTION cancelar_pedido_prazo(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION cancelar_pedido_prazo_item_fechado() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION estado_pedido_prazo(TEXT, TEXT) TO multiplus_app;
GRANT EXECUTE ON FUNCTION solicitar_pedido_prazo(TEXT, TEXT, "TipoPedidoPrazo", DATE, TEXT) TO multiplus_app;
GRANT EXECUTE ON FUNCTION decidir_pedido_prazo(TEXT, BOOLEAN, TEXT, BOOLEAN, TIMESTAMP) TO multiplus_app;
GRANT EXECUTE ON FUNCTION cancelar_pedido_prazo(TEXT) TO multiplus_app;

INSERT INTO "preferencias_notificacao" ("id", "perfil", "evento", "email", "inApp", "atualizadoEm")
SELECT gen_random_uuid()::text, perfil, evento, TRUE, TRUE, CURRENT_TIMESTAMP
FROM unnest(enum_range(NULL::"Perfil")) AS perfil
CROSS JOIN unnest(ARRAY['PEDIDO_PRAZO_RECEBIDO', 'PEDIDO_PRAZO_RESPONDIDO']::"EventoNotificacao"[]) AS evento
ON CONFLICT ("perfil", "evento") DO NOTHING;

COMMIT;
