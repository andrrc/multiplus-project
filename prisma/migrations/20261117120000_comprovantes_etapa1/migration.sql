-- Comprovantes do colaborador externo, etapa 1 (enviar e conferir). Ver docs/analises/comprovantes-colaborador-externo.md.
-- Partes redefinidas aqui partem do corpo vigente em 20261022111000_aprovacao_conclusao.

-- 1. Campos do item: exige comprovante, quantidade e lista "o que enviar".
ALTER TABLE "tarefas"
  ADD COLUMN "comprovanteExigido" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "comprovanteQuantidade" INTEGER,
  ADD COLUMN "comprovanteInstrucoes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD CONSTRAINT "tarefas_comprovante_check" CHECK (("comprovanteExigido" = false) OR ("comprovanteQuantidade" IS NOT NULL AND "comprovanteQuantidade" BETWEEN 1 AND 20));
ALTER TABLE "subtarefas"
  ADD COLUMN "comprovanteExigido" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "comprovanteQuantidade" INTEGER,
  ADD COLUMN "comprovanteInstrucoes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD CONSTRAINT "subtarefas_comprovante_check" CHECK (("comprovanteExigido" = false) OR ("comprovanteQuantidade" IS NOT NULL AND "comprovanteQuantidade" BETWEEN 1 AND 20));

-- 2. Observação opcional escrita ao enviar.
ALTER TABLE "solicitacoes_conclusao"
  ADD COLUMN "observacaoEnvio" TEXT,
  ADD CONSTRAINT "solicitacoes_conclusao_observacao_check" CHECK ("observacaoEnvio" IS NULL OR char_length("observacaoEnvio") <= 2000);

-- 3. Arquivos. Nascem como rascunho (sem solicitação); ao pedir a conclusão passam a fazer parte do envio e ficam imutáveis.
CREATE TABLE "arquivos_comprovante" (
  "id" TEXT NOT NULL,
  "tarefaId" TEXT,
  "subtarefaId" TEXT,
  "solicitacaoId" TEXT,
  "chave" TEXT NOT NULL,
  "nomeOriginal" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "tamanhoBytes" INTEGER NOT NULL,
  "enviadoPorId" TEXT,
  "enviadoPorNome" TEXT NOT NULL,
  "enviadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "arquivos_comprovante_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "arquivos_comprovante_alvo_check" CHECK (("tarefaId" IS NOT NULL) <> ("subtarefaId" IS NOT NULL)),
  CONSTRAINT "arquivos_comprovante_tamanho_check" CHECK ("tamanhoBytes" > 0 AND "tamanhoBytes" <= 10485760),
  CONSTRAINT "arquivos_comprovante_nome_check" CHECK (char_length("nomeOriginal") BETWEEN 1 AND 200),
  CONSTRAINT "arquivos_comprovante_tipo_check" CHECK ("tipo" IN (
    'image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'
  ))
);
CREATE UNIQUE INDEX "arquivos_comprovante_chave_key" ON "arquivos_comprovante"("chave");
CREATE INDEX "arquivos_comprovante_tarefaId_idx" ON "arquivos_comprovante"("tarefaId");
CREATE INDEX "arquivos_comprovante_subtarefaId_idx" ON "arquivos_comprovante"("subtarefaId");
CREATE INDEX "arquivos_comprovante_solicitacaoId_idx" ON "arquivos_comprovante"("solicitacaoId");
ALTER TABLE "arquivos_comprovante" ADD CONSTRAINT "arquivos_comprovante_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "tarefas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "arquivos_comprovante" ADD CONSTRAINT "arquivos_comprovante_subtarefaId_fkey" FOREIGN KEY ("subtarefaId") REFERENCES "subtarefas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "arquivos_comprovante" ADD CONSTRAINT "arquivos_comprovante_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "solicitacoes_conclusao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "arquivos_comprovante" ADD CONSTRAINT "arquivos_comprovante_enviadoPorId_fkey" FOREIGN KEY ("enviadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Funções de apoio. Rodam como dono das tabelas para consultar além da RLS do chamador.
CREATE FUNCTION colaborador_responsavel_pelo_item(p_tipo TEXT, p_item_id TEXT) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  perfil_atual TEXT := app_current_perfil();
  usuario_atual TEXT := app_current_usuario_id();
  pessoa_atual TEXT;
BEGIN
  IF perfil_atual NOT IN ('ADMIN_INTERNO', 'ADMIN_EXTERNO') OR usuario_atual IS NULL THEN RETURN false; END IF;
  SELECT "pessoaEnvolvidaId" INTO pessoa_atual FROM "usuarios" WHERE "id" = usuario_atual AND "ativo";
  IF NOT FOUND THEN RETURN false; END IF;
  IF p_tipo = 'TAREFA' THEN
    RETURN EXISTS (
      SELECT 1 FROM "tarefas" t WHERE t."id" = p_item_id AND (
        (perfil_atual = 'ADMIN_INTERNO' AND EXISTS (SELECT 1 FROM "atribuicoes" a WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = t."projetoId" AND a."usuarioId" = usuario_atual))
        OR (perfil_atual = 'ADMIN_EXTERNO' AND EXISTS (SELECT 1 FROM "atribuicoes" a WHERE a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = t."id" AND a."usuarioId" = usuario_atual))
        OR t."responsavelUsuarioId" = usuario_atual
        OR (t."responsavelId" IS NOT NULL AND pessoa_atual IS NOT NULL AND t."responsavelId" = pessoa_atual)
      )
    );
  ELSIF p_tipo = 'SUBTAREFA' THEN
    RETURN EXISTS (
      SELECT 1 FROM "subtarefas" s WHERE s."id" = p_item_id AND (
        s."atribuidoAUsuarioId" = usuario_atual
        OR (s."atribuidoAId" IS NOT NULL AND pessoa_atual IS NOT NULL AND s."atribuidoAId" = pessoa_atual)
      )
    );
  END IF;
  RETURN false;
END;
$$;

CREATE FUNCTION interno_atribuido_ao_item_do_comprovante(p_tarefa_id TEXT, p_subtarefa_id TEXT) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_current_perfil() = 'ADMIN_INTERNO' AND EXISTS (
    SELECT 1
    FROM "tarefas" t
    JOIN "atribuicoes" a ON a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = t."projetoId" AND a."usuarioId" = app_current_usuario_id()
    WHERE t."id" = COALESCE(p_tarefa_id, (SELECT s."tarefaId" FROM "subtarefas" s WHERE s."id" = p_subtarefa_id))
      AND t."ativo" AND cliente_do_projeto_esta_ativo(t."projetoId")
  )
$$;

CREATE FUNCTION solicitacao_tem_comprovantes(p_solicitacao_id TEXT) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM "arquivos_comprovante" WHERE "solicitacaoId" = p_solicitacao_id)
$$;

-- Decisão delegada: o colaborador interno do projeto pode decidir o pedido de um colaborador externo. A permissão vale
-- só para a solicitação habilitada por habilitar_decisao_delegada, só dentro da transação e só enquanto ela está pendente.
CREATE FUNCTION decisao_delegada_solicitacao(p_solicitacao_id TEXT) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT app_current_perfil() = 'ADMIN_INTERNO' AND NULLIF(current_setting('app.decisao_solicitacao', true), '') = p_solicitacao_id
$$;

CREATE FUNCTION decisao_delegada_tarefa(p_tarefa_id TEXT) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_current_perfil() = 'ADMIN_INTERNO' AND EXISTS (
    SELECT 1 FROM "solicitacoes_conclusao" s
    WHERE s."id" = NULLIF(current_setting('app.decisao_solicitacao', true), '') AND s."status" = 'PENDENTE' AND s."tarefaId" = p_tarefa_id
  )
$$;

CREATE FUNCTION decisao_delegada_subtarefa(p_subtarefa_id TEXT) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_current_perfil() = 'ADMIN_INTERNO' AND EXISTS (
    SELECT 1 FROM "solicitacoes_conclusao" s
    WHERE s."id" = NULLIF(current_setting('app.decisao_solicitacao', true), '') AND s."status" = 'PENDENTE' AND s."subtarefaId" = p_subtarefa_id
  )
$$;

CREATE FUNCTION pode_decidir_solicitacao_delegada(p_solicitacao_id TEXT) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  usuario_atual TEXT := app_current_usuario_id();
  atual "solicitacoes_conclusao"%ROWTYPE;
  projeto_do_item TEXT;
BEGIN
  IF app_current_perfil() <> 'ADMIN_INTERNO' OR usuario_atual IS NULL OR NOT EXISTS (SELECT 1 FROM "usuarios" WHERE "id" = usuario_atual AND "ativo") THEN
    RETURN false;
  END IF;
  SELECT * INTO atual FROM "solicitacoes_conclusao" WHERE "id" = p_solicitacao_id;
  IF NOT FOUND OR atual."status" <> 'PENDENTE' THEN RETURN false; END IF;
  -- O interno só decide o pedido de um colaborador externo, em projeto ao qual ele está atribuído.
  IF NOT EXISTS (SELECT 1 FROM "usuarios" u WHERE u."id" = atual."solicitadoPorId" AND u."perfil" = 'ADMIN_EXTERNO') THEN RETURN false; END IF;
  SELECT COALESCE(t."projetoId", t2."projetoId") INTO projeto_do_item
  FROM (SELECT 1) base
  LEFT JOIN "tarefas" t ON t."id" = atual."tarefaId"
  LEFT JOIN "subtarefas" s ON s."id" = atual."subtarefaId"
  LEFT JOIN "tarefas" t2 ON t2."id" = s."tarefaId";
  RETURN projeto_do_item IS NOT NULL AND EXISTS (
    SELECT 1 FROM "atribuicoes" a WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = projeto_do_item AND a."usuarioId" = usuario_atual
  );
END;
$$;

CREATE FUNCTION habilitar_decisao_delegada(p_solicitacao_id TEXT) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM 1 FROM "solicitacoes_conclusao" WHERE "id" = p_solicitacao_id FOR UPDATE;
  IF NOT pode_decidir_solicitacao_delegada(p_solicitacao_id) THEN
    RAISE EXCEPTION 'RN-007: sem permissão para decidir esta solicitação.';
  END IF;
  PERFORM set_config('app.decisao_solicitacao', p_solicitacao_id, true);
  RETURN p_solicitacao_id;
END;
$$;

-- Registra um arquivo anexado (rascunho) pelo colaborador responsável, só em item aberto que exige comprovante.
CREATE FUNCTION registrar_arquivo_comprovante(
  p_tipo TEXT, p_item_id TEXT, p_chave TEXT, p_nome TEXT, p_mime TEXT, p_tamanho INTEGER
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  usuario_atual TEXT := app_current_usuario_id();
  nome_atual TEXT;
  exigido BOOLEAN;
  novo_id TEXT;
BEGIN
  IF app_current_perfil() NOT IN ('ADMIN_INTERNO', 'ADMIN_EXTERNO') OR usuario_atual IS NULL THEN
    RAISE EXCEPTION 'RN-009: ação restrita a colaboradores autenticados.';
  END IF;
  SELECT "nome" INTO nome_atual FROM "usuarios" WHERE "id" = usuario_atual AND "ativo";
  IF nome_atual IS NULL THEN RAISE EXCEPTION 'Usuário inativo ou não encontrado.'; END IF;
  IF NOT colaborador_responsavel_pelo_item(p_tipo, p_item_id) THEN
    RAISE EXCEPTION 'RN-009: sem permissão para enviar comprovante neste item.';
  END IF;

  IF p_tipo = 'TAREFA' THEN
    SELECT t."comprovanteExigido" INTO exigido FROM "tarefas" t
    WHERE t."id" = p_item_id AND t."ativo" AND t."status" NOT IN ('Concluído', 'Cancelado') AND cliente_do_projeto_esta_ativo(t."projetoId");
  ELSE
    SELECT s."comprovanteExigido" INTO exigido FROM "subtarefas" s
    WHERE s."id" = p_item_id AND s."ativo" AND s."status" = 'EM_ANDAMENTO' AND cliente_da_tarefa_esta_ativo(s."tarefaId");
  END IF;
  IF exigido IS NULL THEN RAISE EXCEPTION 'RN-009: item inativo, cancelado ou concluído não aceita comprovante.'; END IF;
  IF NOT exigido THEN RAISE EXCEPTION 'RN-009: este item não exige comprovante.'; END IF;
  IF EXISTS (
    SELECT 1 FROM "solicitacoes_conclusao" sc
    WHERE sc."status" = 'PENDENTE' AND ((p_tipo = 'TAREFA' AND sc."tarefaId" = p_item_id) OR (p_tipo = 'SUBTAREFA' AND sc."subtarefaId" = p_item_id))
  ) THEN
    RAISE EXCEPTION 'RN-009: este item já tem um envio aguardando conferência.';
  END IF;
  IF (
    SELECT count(*) FROM "arquivos_comprovante" ac
    WHERE ac."solicitacaoId" IS NULL AND ac."enviadoPorId" = usuario_atual
      AND ((p_tipo = 'TAREFA' AND ac."tarefaId" = p_item_id) OR (p_tipo = 'SUBTAREFA' AND ac."subtarefaId" = p_item_id))
  ) >= 20 THEN
    RAISE EXCEPTION 'RN-009: o envio aceita no máximo 20 arquivos.';
  END IF;

  novo_id := md5(random()::text || clock_timestamp()::text || p_item_id);
  INSERT INTO "arquivos_comprovante" ("id", "tarefaId", "subtarefaId", "chave", "nomeOriginal", "tipo", "tamanhoBytes", "enviadoPorId", "enviadoPorNome")
  VALUES (novo_id, CASE WHEN p_tipo = 'TAREFA' THEN p_item_id END, CASE WHEN p_tipo = 'SUBTAREFA' THEN p_item_id END,
    p_chave, p_nome, p_mime, p_tamanho, usuario_atual, nome_atual);
  RETURN novo_id;
END;
$$;

-- 5. RLS dos arquivos: a administração vê tudo; quem enviou vê os próprios; o interno do projeto vê os já enviados.
ALTER TABLE "arquivos_comprovante" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, DELETE ON "arquivos_comprovante" TO multiplus_app;
CREATE POLICY arquivos_comprovante_select ON "arquivos_comprovante" FOR SELECT USING (
  app_current_perfil() = 'ADMIN'
  OR "enviadoPorId" = app_current_usuario_id()
  OR ("solicitacaoId" IS NOT NULL AND interno_atribuido_ao_item_do_comprovante("tarefaId", "subtarefaId"))
);
-- Só o rascunho do próprio autor pode ser removido; depois de enviado, o arquivo nunca é apagado.
CREATE POLICY arquivos_comprovante_delete ON "arquivos_comprovante" FOR DELETE USING (
  "solicitacaoId" IS NULL AND "enviadoPorId" = app_current_usuario_id()
);

-- 6. Decisão delegada nas políticas de atualização.
DROP POLICY tarefas_update ON "tarefas";
CREATE POLICY tarefas_update ON "tarefas" FOR UPDATE USING (
  (app_current_perfil() = 'ADMIN' AND cliente_do_projeto_esta_ativo("projetoId")) OR decisao_delegada_tarefa("id")
) WITH CHECK (
  (app_current_perfil() = 'ADMIN' AND cliente_do_projeto_esta_ativo("projetoId")) OR decisao_delegada_tarefa("id")
);
DROP POLICY subtarefas_update ON "subtarefas";
CREATE POLICY subtarefas_update ON "subtarefas" FOR UPDATE USING (
  (app_current_perfil() = 'ADMIN' AND cliente_da_tarefa_esta_ativo("tarefaId")) OR decisao_delegada_subtarefa("id")
) WITH CHECK (
  (app_current_perfil() = 'ADMIN' AND cliente_da_tarefa_esta_ativo("tarefaId")) OR decisao_delegada_subtarefa("id")
);
DROP POLICY solicitacoes_conclusao_update ON "solicitacoes_conclusao";
CREATE POLICY solicitacoes_conclusao_update ON "solicitacoes_conclusao" FOR UPDATE USING (
  app_current_perfil() = 'ADMIN'
  OR ("solicitadoPorId" = app_current_usuario_id() AND "status" = 'PENDENTE')
  OR decisao_delegada_solicitacao("id")
) WITH CHECK (
  app_current_perfil() = 'ADMIN'
  OR ("solicitadoPorId" = app_current_usuario_id() AND "status" = 'CANCELADA')
  OR decisao_delegada_solicitacao("id")
);

-- 6b. O interno atribuído ao projeto passa a enxergar também os pedidos de subtarefa do projeto (antes só via o das
-- subtarefas atribuídas a ele), para conferir o envio de um colaborador externo.
DROP POLICY solicitacoes_conclusao_select ON "solicitacoes_conclusao";
CREATE POLICY solicitacoes_conclusao_select ON "solicitacoes_conclusao" FOR SELECT USING (
  app_current_perfil() = 'ADMIN'
  OR "solicitadoPorId" = app_current_usuario_id()
  OR (
    app_current_perfil() IN ('ADMIN_INTERNO', 'ADMIN_EXTERNO')
    AND EXISTS (
      SELECT 1 FROM "usuarios" u
      WHERE u."id" = app_current_usuario_id() AND u."ativo"
        AND (
          ("tarefaId" IS NOT NULL AND EXISTS (
            SELECT 1 FROM "tarefas" t
            JOIN "projetos" p ON p."id" = t."projetoId"
            JOIN "clientes" c ON c."id" = p."clienteId"
            WHERE t."id" = "solicitacoes_conclusao"."tarefaId"
              AND t."ativo" AND p."ativo" AND c."ativo"
              AND (
                (app_current_perfil() = 'ADMIN_INTERNO' AND EXISTS (
                  SELECT 1 FROM "atribuicoes" a WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = p."id" AND a."usuarioId" = u."id"
                ))
                OR (app_current_perfil() = 'ADMIN_EXTERNO' AND EXISTS (
                  SELECT 1 FROM "atribuicoes" a WHERE a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = t."id" AND a."usuarioId" = u."id"
                ))
                OR t."responsavelUsuarioId" = u."id"
                OR (t."responsavelId" IS NOT NULL AND u."pessoaEnvolvidaId" IS NOT NULL AND t."responsavelId" = u."pessoaEnvolvidaId")
              )
          ))
          OR ("subtarefaId" IS NOT NULL AND EXISTS (
            SELECT 1 FROM "subtarefas" s
            JOIN "tarefas" t ON t."id" = s."tarefaId"
            JOIN "projetos" p ON p."id" = t."projetoId"
            JOIN "clientes" c ON c."id" = p."clienteId"
            WHERE s."id" = "solicitacoes_conclusao"."subtarefaId"
              AND s."ativo" AND t."ativo" AND p."ativo" AND c."ativo"
              AND (
                s."atribuidoAUsuarioId" = u."id"
                OR (s."atribuidoAId" IS NOT NULL AND u."pessoaEnvolvidaId" IS NOT NULL AND s."atribuidoAId" = u."pessoaEnvolvidaId")
                OR (app_current_perfil() = 'ADMIN_INTERNO' AND EXISTS (
                  SELECT 1 FROM "atribuicoes" a WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = p."id" AND a."usuarioId" = u."id"
                ))
              )
          ))
        )
    )
  )
);


-- 7. Funções vigentes redefinidas.
-- solicitar_conclusao ganha a observação e passa a conferir e anexar os comprovantes (a versão de 2 argumentos sai).
DROP FUNCTION solicitar_conclusao(TEXT, TEXT);
CREATE FUNCTION solicitar_conclusao(p_tipo TEXT, p_item_id TEXT, p_observacao TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  perfil_atual TEXT := app_current_perfil();
  usuario_atual TEXT := app_current_usuario_id();
  pessoa_atual TEXT;
  nome_atual TEXT;
  item_tarefa "tarefas"%ROWTYPE;
  item_subtarefa "subtarefas"%ROWTYPE;
  autorizado BOOLEAN := false;
  novo_id TEXT;
  exige_comprovante BOOLEAN := false;
  quantidade_exigida INTEGER;
  arquivos_anexados INTEGER;
BEGIN
  IF perfil_atual NOT IN ('ADMIN_INTERNO', 'ADMIN_EXTERNO') OR usuario_atual IS NULL THEN
    RAISE EXCEPTION 'Ação restrita a colaboradores autenticados.';
  END IF;
  SELECT "nome", "pessoaEnvolvidaId" INTO nome_atual, pessoa_atual FROM "usuarios" WHERE "id" = usuario_atual AND "ativo";
  IF nome_atual IS NULL THEN RAISE EXCEPTION 'Usuário inativo ou não encontrado.'; END IF;

  IF p_tipo = 'TAREFA' THEN
    SELECT * INTO item_tarefa FROM "tarefas" WHERE "id" = p_item_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Tarefa não encontrada.'; END IF;
    IF NOT item_tarefa."ativo" OR NOT cliente_do_projeto_esta_ativo(item_tarefa."projetoId")
       OR item_tarefa."status" IN ('Concluído', 'Cancelado') THEN
      RAISE EXCEPTION 'RN-007: tarefa inativa, cancelada ou concluída não aceita solicitação.';
    END IF;
    autorizado := (
      (perfil_atual = 'ADMIN_INTERNO' AND EXISTS (SELECT 1 FROM "atribuicoes" a WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = item_tarefa."projetoId" AND a."usuarioId" = usuario_atual))
      OR (perfil_atual = 'ADMIN_EXTERNO' AND EXISTS (SELECT 1 FROM "atribuicoes" a WHERE a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = item_tarefa."id" AND a."usuarioId" = usuario_atual))
      OR item_tarefa."responsavelUsuarioId" = usuario_atual
      OR (item_tarefa."responsavelId" IS NOT NULL AND pessoa_atual IS NOT NULL AND item_tarefa."responsavelId" = pessoa_atual)
    );
  ELSIF p_tipo = 'SUBTAREFA' THEN
    SELECT * INTO item_subtarefa FROM "subtarefas" WHERE "id" = p_item_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Subtarefa não encontrada.'; END IF;
    IF NOT item_subtarefa."ativo" OR item_subtarefa."status" <> 'EM_ANDAMENTO'
       OR NOT cliente_da_tarefa_esta_ativo(item_subtarefa."tarefaId") THEN
      RAISE EXCEPTION 'RN-004: subtarefa inativa, cancelada ou concluída não aceita solicitação.';
    END IF;
    autorizado := item_subtarefa."atribuidoAUsuarioId" = usuario_atual
      OR (item_subtarefa."atribuidoAId" IS NOT NULL AND pessoa_atual IS NOT NULL AND item_subtarefa."atribuidoAId" = pessoa_atual);
  ELSE
    RAISE EXCEPTION 'Tipo de item inválido.';
  END IF;

  IF autorizado IS NOT TRUE THEN RAISE EXCEPTION 'RN-007: sem permissão para solicitar a conclusão deste item.'; END IF;

  -- Comprovantes: os arquivos anexados antes (sem pedido) entram neste envio; se o item exige, a quantidade é conferida aqui.
  IF p_observacao IS NOT NULL AND char_length(p_observacao) > 2000 THEN
    RAISE EXCEPTION 'RN-009: a observação do envio deve ter no máximo 2000 caracteres.';
  END IF;
  IF p_tipo = 'TAREFA' THEN
    exige_comprovante := item_tarefa."comprovanteExigido";
    quantidade_exigida := item_tarefa."comprovanteQuantidade";
  ELSE
    exige_comprovante := item_subtarefa."comprovanteExigido";
    quantidade_exigida := item_subtarefa."comprovanteQuantidade";
  END IF;
  SELECT count(*) INTO arquivos_anexados FROM "arquivos_comprovante" ac
  WHERE ac."solicitacaoId" IS NULL AND ac."enviadoPorId" = usuario_atual
    AND ((p_tipo = 'TAREFA' AND ac."tarefaId" = p_item_id) OR (p_tipo = 'SUBTAREFA' AND ac."subtarefaId" = p_item_id));
  IF exige_comprovante AND arquivos_anexados < COALESCE(quantidade_exigida, 1) THEN
    RAISE EXCEPTION 'RN-009: anexe pelo menos % comprovante(s) antes de pedir a conclusão deste item.', COALESCE(quantidade_exigida, 1);
  END IF;

  novo_id := md5(random()::text || clock_timestamp()::text || p_item_id);
  INSERT INTO "solicitacoes_conclusao" ("id", "tarefaId", "subtarefaId", "solicitadoPorId", "solicitadoPorNome", "statusAnterior", "status", "observacaoEnvio")
  VALUES (novo_id, CASE WHEN p_tipo = 'TAREFA' THEN p_item_id END, CASE WHEN p_tipo = 'SUBTAREFA' THEN p_item_id END, usuario_atual, nome_atual,
    CASE WHEN p_tipo = 'TAREFA' THEN
      CASE item_tarefa."status"::text
        WHEN 'A iniciar' THEN 'A_INICIAR'
        WHEN 'Em andamento' THEN 'EM_ANDAMENTO'
        WHEN 'Aguardando documento do cliente' THEN 'AGUARDANDO_DOCUMENTO_CLIENTE'
        WHEN 'Visita/reunião agendada' THEN 'VISITA_REUNIAO_AGENDADA'
        WHEN 'Protocolado' THEN 'PROTOCOLADO'
        WHEN 'Sob análise do órgão ambiental' THEN 'SOB_ANALISE_ORGAO_AMBIENTAL'
        WHEN 'Com exigência a cumprir' THEN 'COM_EXIGENCIA_A_CUMPRIR'
        WHEN 'Concluído' THEN 'CONCLUIDO'
        WHEN 'Cancelado' THEN 'CANCELADO'
      END
    ELSE item_subtarefa."status"::text END, 'PENDENTE', NULLIF(btrim(p_observacao), ''));
  UPDATE "arquivos_comprovante" ac SET "solicitacaoId" = novo_id
  WHERE ac."solicitacaoId" IS NULL AND ac."enviadoPorId" = usuario_atual
    AND ((p_tipo = 'TAREFA' AND ac."tarefaId" = p_item_id) OR (p_tipo = 'SUBTAREFA' AND ac."subtarefaId" = p_item_id));
  RETURN novo_id;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'RN-007: já existe uma solicitação de conclusão pendente para este item.';
END;
$$;

CREATE OR REPLACE FUNCTION concluir_tarefa(
  p_tarefa_id TEXT,
  p_proximo_prazo TIMESTAMP(3) DEFAULT NULL
) RETURNS TABLE (tarefa_id TEXT, proxima_id TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  atual "tarefas"%ROWTYPE;
  id_proxima TEXT;
BEGIN
  IF app_current_perfil() IS NULL THEN RAISE EXCEPTION 'Sessão de usuário ausente'; END IF;
  IF app_current_perfil() <> 'ADMIN' AND NOT decisao_delegada_tarefa(p_tarefa_id) THEN RAISE EXCEPTION 'RN-007: conclusão de colaborador requer confirmação do Administrador'; END IF;

  SELECT * INTO atual FROM "tarefas" WHERE "id" = p_tarefa_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tarefa não encontrada'; END IF;
  IF NOT atual."ativo" OR NOT cliente_do_projeto_esta_ativo(atual."projetoId") OR atual."status" = 'Cancelado' THEN
    RAISE EXCEPTION 'RN-007: tarefa inativa ou cancelada não pode ser concluída';
  END IF;
  IF atual."status" = 'Concluído' THEN tarefa_id := atual."id"; proxima_id := NULL; RETURN NEXT; RETURN; END IF;

  UPDATE "tarefas" SET "status" = 'Concluído', "atualizadoEm" = CURRENT_TIMESTAMP WHERE "id" = atual."id";
  IF atual."periodicidade" IS NOT NULL AND atual."ativo" AND atual."serieEncerradaEm" IS NULL AND p_proximo_prazo IS NOT NULL THEN
    SELECT "id" INTO id_proxima FROM "tarefas" WHERE "serieId" = COALESCE(atual."serieId", atual."id") AND "prazo" = p_proximo_prazo LIMIT 1;
    IF id_proxima IS NULL THEN
      id_proxima := md5(random()::text || clock_timestamp()::text || atual."id");
      INSERT INTO "tarefas" (
        "id", "projetoId", "nome", "descricao", "prazo", "status", "periodicidade", "diaSemana", "serieId", "prazoOriginal", "serieEncerradaEm", "diasAntecedencia", "responsavelId", "responsavelUsuarioId", "comprovanteExigido", "comprovanteQuantidade", "comprovanteInstrucoes", "ativo", "criadoEm", "atualizadoEm"
      ) VALUES (
        id_proxima, atual."projetoId", atual."nome", atual."descricao", p_proximo_prazo, 'A iniciar', atual."periodicidade", atual."diaSemana", COALESCE(atual."serieId", atual."id"), COALESCE(atual."prazoOriginal", atual."prazo"), NULL, atual."diasAntecedencia", atual."responsavelId", atual."responsavelUsuarioId", atual."comprovanteExigido", atual."comprovanteQuantidade", atual."comprovanteInstrucoes", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      );
      INSERT INTO "atribuicoes" ("id", "usuarioId", "entidadeTipo", "entidadeId", "criadoEm")
      SELECT md5(random()::text || clock_timestamp()::text || id_proxima), u."id", 'TAREFA', id_proxima, CURRENT_TIMESTAMP
      FROM "pessoas_envolvidas" pe JOIN "usuarios" u ON u."pessoaEnvolvidaId" = pe."id"
      WHERE pe."id" = atual."responsavelId" AND pe."temAcesso" = true
      ON CONFLICT ("usuarioId", "entidadeTipo", "entidadeId") DO NOTHING;
      INSERT INTO "subtarefas" ("id", "tarefaId", "titulo", "descricao", "prazo", "etiquetas", "comprovanteExigido", "comprovanteQuantidade", "comprovanteInstrucoes", "status", "ativo", "criadoEm", "atualizadoEm")
      SELECT md5(random()::text || clock_timestamp()::text || s."id" || id_proxima), id_proxima, s."titulo", s."descricao",
        CASE WHEN s."prazo" IS NULL OR atual."prazo" IS NULL THEN s."prazo" ELSE p_proximo_prazo + (s."prazo" - atual."prazo") END,
        s."etiquetas", s."comprovanteExigido", s."comprovanteQuantidade", s."comprovanteInstrucoes", 'EM_ANDAMENTO', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM "subtarefas" s WHERE s."tarefaId" = atual."id" AND s."ativo" AND s."status" <> 'CANCELADO';
    END IF;
  END IF;
  tarefa_id := atual."id"; proxima_id := id_proxima; RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION tarefas_enforce_rn007() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF app_current_perfil() IS NULL OR app_current_perfil() = 'ADMIN' OR decisao_delegada_tarefa(OLD."id") THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'RN-007: colaboradores precisam solicitar conclusão; somente o Administrador confirma o status';
END;
$$;

CREATE OR REPLACE FUNCTION subtarefas_enforce_rn004() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF app_current_perfil() IS NULL OR app_current_perfil() = 'ADMIN' OR decisao_delegada_subtarefa(OLD."id") THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'RN-004: colaboradores precisam solicitar conclusão; somente o Administrador confirma o status';
END;
$$;

CREATE OR REPLACE FUNCTION solicitacoes_conclusao_enforce() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."status" <> 'PENDENTE' OR NEW."decididoPorId" IS NOT NULL OR NEW."decididoEm" IS NOT NULL THEN
      RAISE EXCEPTION 'RN-007: nova solicitação deve iniciar pendente';
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
     OR NEW."observacaoEnvio" IS DISTINCT FROM OLD."observacaoEnvio" THEN
    RAISE EXCEPTION 'RN-007: histórico de solicitação é imutável';
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

-- 8. Permissões de execução (mesmo padrão de 20261008120000_restringir_execucao_funcoes_definer).
REVOKE ALL ON FUNCTION solicitar_conclusao(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION colaborador_responsavel_pelo_item(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION interno_atribuido_ao_item_do_comprovante(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION solicitacao_tem_comprovantes(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION decisao_delegada_solicitacao(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION decisao_delegada_tarefa(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION decisao_delegada_subtarefa(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION pode_decidir_solicitacao_delegada(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION habilitar_decisao_delegada(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION registrar_arquivo_comprovante(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION solicitar_conclusao(TEXT, TEXT, TEXT) TO multiplus_app;
GRANT EXECUTE ON FUNCTION colaborador_responsavel_pelo_item(TEXT, TEXT) TO multiplus_app;
GRANT EXECUTE ON FUNCTION interno_atribuido_ao_item_do_comprovante(TEXT, TEXT) TO multiplus_app;
GRANT EXECUTE ON FUNCTION solicitacao_tem_comprovantes(TEXT) TO multiplus_app;
GRANT EXECUTE ON FUNCTION decisao_delegada_solicitacao(TEXT) TO multiplus_app;
GRANT EXECUTE ON FUNCTION decisao_delegada_tarefa(TEXT) TO multiplus_app;
GRANT EXECUTE ON FUNCTION decisao_delegada_subtarefa(TEXT) TO multiplus_app;
GRANT EXECUTE ON FUNCTION pode_decidir_solicitacao_delegada(TEXT) TO multiplus_app;
GRANT EXECUTE ON FUNCTION habilitar_decisao_delegada(TEXT) TO multiplus_app;
GRANT EXECUTE ON FUNCTION registrar_arquivo_comprovante(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER) TO multiplus_app;
