-- Sprint 4A / A2 — RLS de escrita exclusiva do Administrador e exceções de conclusão.
-- A herança de cliente já existia; aqui ela passa a incluir o ativo do próprio registro.

-- ============================================================================
-- leitura: o registro e toda a cadeia acima precisam estar ativos
-- ============================================================================

DROP POLICY projetos_select ON "projetos";
CREATE POLICY projetos_select ON "projetos" FOR SELECT USING (
  app_current_perfil() = 'ADMIN'
  OR (
    "ativo" AND cliente_esta_ativo("clienteId")
    AND (
      (app_current_perfil() = 'CLIENTE'
       AND "clienteId" = (SELECT "clienteId" FROM "usuarios" WHERE "id" = app_current_usuario_id()))
      OR (app_current_perfil() = 'ADMIN_INTERNO'
          AND EXISTS (
            SELECT 1 FROM "atribuicoes" a
            WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = "projetos"."id"
              AND a."usuarioId" = app_current_usuario_id()
          ))
      OR (app_current_perfil() = 'ADMIN_EXTERNO'
          AND admin_externo_tem_tarefa_no_projeto("projetos"."id"))
    )
  )
);

DROP POLICY tarefas_select ON "tarefas";
CREATE POLICY tarefas_select ON "tarefas" FOR SELECT USING (
  app_current_perfil() = 'ADMIN'
  OR (
    "ativo" AND cliente_do_projeto_esta_ativo("projetoId")
    AND (
      (app_current_perfil() = 'CLIENTE'
       AND EXISTS (
         SELECT 1 FROM "projetos" p
         WHERE p."id" = "tarefas"."projetoId"
           AND p."clienteId" = (SELECT "clienteId" FROM "usuarios" WHERE "id" = app_current_usuario_id())
       ))
      OR (app_current_perfil() = 'ADMIN_INTERNO'
          AND EXISTS (
            SELECT 1 FROM "atribuicoes" a
            WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = "tarefas"."projetoId"
              AND a."usuarioId" = app_current_usuario_id()
          ))
      OR (app_current_perfil() = 'ADMIN_EXTERNO'
          AND EXISTS (
            SELECT 1 FROM "atribuicoes" a
            WHERE a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = "tarefas"."id"
              AND a."usuarioId" = app_current_usuario_id()
          ))
    )
  )
);

DROP POLICY subtarefas_select ON "subtarefas";
CREATE POLICY subtarefas_select ON "subtarefas" FOR SELECT USING (
  app_current_perfil() = 'ADMIN'
  OR (
    "ativo" AND cliente_da_tarefa_esta_ativo("tarefaId")
    AND (
      "atribuidoAId" = (SELECT "pessoaEnvolvidaId" FROM "usuarios" WHERE "id" = app_current_usuario_id())
      OR (app_current_perfil() = 'CLIENTE'
          AND EXISTS (
            SELECT 1 FROM "tarefas" t
            JOIN "projetos" p ON p."id" = t."projetoId"
            WHERE t."id" = "subtarefas"."tarefaId"
              AND p."clienteId" = (SELECT "clienteId" FROM "usuarios" WHERE "id" = app_current_usuario_id())
          ))
      OR (app_current_perfil() = 'ADMIN_INTERNO'
          AND EXISTS (
            SELECT 1 FROM "tarefas" t
            JOIN "atribuicoes" a ON a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = t."projetoId"
            WHERE t."id" = "subtarefas"."tarefaId" AND a."usuarioId" = app_current_usuario_id()
          ))
      OR (app_current_perfil() = 'ADMIN_EXTERNO'
          AND EXISTS (
            SELECT 1 FROM "atribuicoes" a
            WHERE a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = "subtarefas"."tarefaId"
              AND a."usuarioId" = app_current_usuario_id()
          ))
    )
  )
);

-- ============================================================================
-- escrita: somente ADMIN cria, edita e remove entidades
-- ============================================================================

DROP POLICY projetos_insert ON "projetos";
CREATE POLICY projetos_insert ON "projetos" FOR INSERT WITH CHECK (
  app_current_perfil() = 'ADMIN' AND cliente_esta_ativo("clienteId")
);

DROP POLICY projetos_update ON "projetos";
CREATE POLICY projetos_update ON "projetos" FOR UPDATE USING (app_current_perfil() = 'ADMIN')
  WITH CHECK (app_current_perfil() = 'ADMIN');

DROP POLICY projetos_delete ON "projetos";
CREATE POLICY projetos_delete ON "projetos" FOR DELETE USING (app_current_perfil() = 'ADMIN');

DROP POLICY tarefas_insert ON "tarefas";
CREATE POLICY tarefas_insert ON "tarefas" FOR INSERT WITH CHECK (
  app_current_perfil() = 'ADMIN' AND cliente_do_projeto_esta_ativo("projetoId")
);

DROP POLICY tarefas_delete ON "tarefas";
CREATE POLICY tarefas_delete ON "tarefas" FOR DELETE USING (app_current_perfil() = 'ADMIN');

DROP POLICY subtarefas_insert ON "subtarefas";
CREATE POLICY subtarefas_insert ON "subtarefas" FOR INSERT WITH CHECK (
  app_current_perfil() = 'ADMIN' AND cliente_da_tarefa_esta_ativo("tarefaId")
);

DROP POLICY subtarefas_delete ON "subtarefas";
CREATE POLICY subtarefas_delete ON "subtarefas" FOR DELETE USING (app_current_perfil() = 'ADMIN');

-- ============================================================================
-- conclusão de tarefa: exceção única do colaborador
-- ============================================================================

DROP POLICY tarefas_update ON "tarefas";
CREATE POLICY tarefas_update ON "tarefas" FOR UPDATE USING (
  app_current_perfil() = 'ADMIN'
  OR (
    "ativo" AND cliente_do_projeto_esta_ativo("projetoId")
    AND (
      (app_current_perfil() = 'ADMIN_INTERNO' AND EXISTS (
        SELECT 1 FROM "atribuicoes" a
        WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = "tarefas"."projetoId"
          AND a."usuarioId" = app_current_usuario_id()
      ))
      OR (app_current_perfil() = 'ADMIN_EXTERNO' AND EXISTS (
        SELECT 1 FROM "atribuicoes" a
        WHERE a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = "tarefas"."id"
          AND a."usuarioId" = app_current_usuario_id()
      ))
    )
  )
) WITH CHECK (
  app_current_perfil() = 'ADMIN'
  OR (
    "ativo" AND cliente_do_projeto_esta_ativo("projetoId")
    AND "status" = 'Concluído'
    AND (
      (app_current_perfil() = 'ADMIN_INTERNO' AND EXISTS (
        SELECT 1 FROM "atribuicoes" a
        WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = "tarefas"."projetoId"
          AND a."usuarioId" = app_current_usuario_id()
      ))
      OR (app_current_perfil() = 'ADMIN_EXTERNO' AND EXISTS (
        SELECT 1 FROM "atribuicoes" a
        WHERE a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = "tarefas"."id"
          AND a."usuarioId" = app_current_usuario_id()
      ))
    )
  )
);

-- ============================================================================
-- conclusão de subtarefa: somente o atribuído ou ADMIN; nenhuma outra coluna
-- ============================================================================

DROP POLICY subtarefas_update ON "subtarefas";
CREATE POLICY subtarefas_update ON "subtarefas" FOR UPDATE USING (
  app_current_perfil() = 'ADMIN'
  OR (
    "ativo" AND cliente_da_tarefa_esta_ativo("tarefaId")
    AND "atribuidoAId" IS NOT NULL
    AND "atribuidoAId" = (SELECT "pessoaEnvolvidaId" FROM "usuarios" WHERE "id" = app_current_usuario_id())
  )
) WITH CHECK (
  app_current_perfil() = 'ADMIN'
  OR (
    "ativo" AND cliente_da_tarefa_esta_ativo("tarefaId")
    AND "atribuidoAId" IS NOT NULL
    AND "atribuidoAId" = (SELECT "pessoaEnvolvidaId" FROM "usuarios" WHERE "id" = app_current_usuario_id())
  )
);

CREATE OR REPLACE FUNCTION tarefas_enforce_rn007() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF app_current_perfil() = 'ADMIN' THEN
    RETURN NEW;
  END IF;

  IF NEW."status" IS DISTINCT FROM OLD."status"
     AND NEW."status" = 'Concluído'
     AND NEW."id" = OLD."id"
     AND NEW."projetoId" = OLD."projetoId"
     AND NEW."nome" = OLD."nome"
     AND NEW."descricao" IS NOT DISTINCT FROM OLD."descricao"
     AND NEW."prazo" IS NOT DISTINCT FROM OLD."prazo"
     AND NEW."periodicidade" IS NOT DISTINCT FROM OLD."periodicidade"
     AND NEW."serieId" IS NOT DISTINCT FROM OLD."serieId"
     AND NEW."prazoOriginal" IS NOT DISTINCT FROM OLD."prazoOriginal"
     AND NEW."serieEncerradaEm" IS NOT DISTINCT FROM OLD."serieEncerradaEm"
     AND NEW."diasAntecedencia" IS NOT DISTINCT FROM OLD."diasAntecedencia"
     AND NEW."ativo" IS NOT DISTINCT FROM OLD."ativo"
     AND NEW."desativadoEm" IS NOT DISTINCT FROM OLD."desativadoEm"
     AND NEW."desativadoPor" IS NOT DISTINCT FROM OLD."desativadoPor"
     AND NEW."criadoEm" IS NOT DISTINCT FROM OLD."criadoEm" THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'RN-007: colaborador só pode marcar a tarefa atribuída como Concluído';
END;
$$;

DROP TRIGGER IF EXISTS trg_tarefas_rn007 ON "tarefas";
CREATE TRIGGER trg_tarefas_rn007
BEFORE UPDATE ON "tarefas"
FOR EACH ROW EXECUTE FUNCTION tarefas_enforce_rn007();

CREATE OR REPLACE FUNCTION subtarefas_enforce_rn004() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  minha_pessoa_envolvida_id text;
  sou_o_atribuido boolean;
BEGIN
  IF app_current_perfil() = 'ADMIN' THEN
    RETURN NEW;
  END IF;

  SELECT "pessoaEnvolvidaId" INTO minha_pessoa_envolvida_id
  FROM "usuarios" WHERE "id" = app_current_usuario_id();

  sou_o_atribuido := OLD."atribuidoAId" IS NOT NULL
    AND minha_pessoa_envolvida_id IS NOT NULL
    AND OLD."atribuidoAId" = minha_pessoa_envolvida_id;

  IF NEW."concluida" IS DISTINCT FROM OLD."concluida"
     AND sou_o_atribuido
     AND NEW."tarefaId" = OLD."tarefaId"
     AND NEW."titulo" = OLD."titulo"
     AND NEW."etiquetas" IS NOT DISTINCT FROM OLD."etiquetas"
     AND NEW."atribuidoAId" IS NOT DISTINCT FROM OLD."atribuidoAId"
     AND NEW."ativo" IS NOT DISTINCT FROM OLD."ativo"
     AND NEW."desativadoEm" IS NOT DISTINCT FROM OLD."desativadoEm"
     AND NEW."desativadoPor" IS NOT DISTINCT FROM OLD."desativadoPor"
     AND NEW."criadoEm" IS NOT DISTINCT FROM OLD."criadoEm" THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'RN-004: apenas o responsável pela subtarefa pode concluí-la; demais alterações são exclusivas do Administrador';
END;
$$;
