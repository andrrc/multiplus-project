-- RF-048 a RF-050 / RN-014 a RN-016 — portal somente leitura do cliente.
-- Parte das políticas mais recentes de herança e mantém o acesso por vínculo explícito.

-- O cliente pode consultar somente links ativos vinculados ao próprio cadastro.
DROP POLICY documentos_select ON "documentos";
CREATE POLICY documentos_select ON "documentos" FOR SELECT USING (
  (app_current_perfil() = 'ADMIN' OR ("ativo" AND cliente_esta_ativo("clienteId")))
  AND (
    app_current_perfil() = 'ADMIN'
    OR (
      app_current_perfil() = 'CLIENTE'
      AND "clienteId" = (SELECT "clienteId" FROM "usuarios" WHERE "id" = app_current_usuario_id())
      AND ("projetoId" IS NULL OR EXISTS (
        SELECT 1 FROM "projetos" p
        WHERE p."id" = "documentos"."projetoId" AND p."ativo"
          AND p."clienteId" = (SELECT "clienteId" FROM "usuarios" WHERE "id" = app_current_usuario_id())
      ))
    )
    OR (
      app_current_perfil() = 'ADMIN_INTERNO'
      AND EXISTS (
        SELECT 1 FROM "projetos" p
        JOIN "atribuicoes" a ON a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = p."id"
        WHERE p."clienteId" = "documentos"."clienteId" AND a."usuarioId" = app_current_usuario_id()
      )
    )
    OR (
      app_current_perfil() = 'ADMIN_EXTERNO'
      AND EXISTS (
        SELECT 1 FROM "tarefas" t
        JOIN "projetos" p ON p."id" = t."projetoId"
        JOIN "atribuicoes" a ON a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = t."id"
        WHERE p."clienteId" = "documentos"."clienteId" AND a."usuarioId" = app_current_usuario_id()
      )
    )
  )
);

-- RN-016 — não permitir consultas diretas à tabela de subtarefas para CLIENTE.
DROP POLICY subtarefas_select ON "subtarefas";
CREATE POLICY subtarefas_select ON "subtarefas" FOR SELECT USING (
  app_current_perfil() <> 'CLIENTE'
  AND (app_current_perfil() = 'ADMIN' OR cliente_da_tarefa_esta_ativo("tarefaId"))
  AND (
    app_current_perfil() = 'ADMIN'
    OR "atribuidoAUsuarioId" = app_current_usuario_id()
    OR "atribuidoAId" = (SELECT "pessoaEnvolvidaId" FROM "usuarios" WHERE "id" = app_current_usuario_id())
    OR (
      app_current_perfil() = 'ADMIN_INTERNO'
      AND EXISTS (
        SELECT 1 FROM "tarefas" t
        JOIN "atribuicoes" a ON a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = t."projetoId"
        WHERE t."id" = "subtarefas"."tarefaId" AND a."usuarioId" = app_current_usuario_id()
      )
    )
    OR (
      app_current_perfil() = 'ADMIN_EXTERNO'
      AND EXISTS (
        SELECT 1 FROM "atribuicoes" a
        WHERE a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = "subtarefas"."tarefaId"
          AND a."usuarioId" = app_current_usuario_id()
      )
    )
  )
);

-- Comentários são internos ao time. CLIENTE não lê nem escreve, mesmo no próprio projeto.
CREATE OR REPLACE FUNCTION comentario_alvo_acessivel(
  p_projeto_id TEXT,
  p_tarefa_id TEXT,
  p_subtarefa_id TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
  IF app_current_perfil() = 'CLIENTE' THEN RETURN false; END IF;
  IF app_current_perfil() = 'ADMIN' THEN RETURN true; END IF;

  IF p_projeto_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM "projetos" p
      WHERE p."id" = p_projeto_id AND p."ativo" AND cliente_esta_ativo(p."clienteId")
        AND (
          (app_current_perfil() = 'ADMIN_INTERNO' AND EXISTS (SELECT 1 FROM "atribuicoes" a WHERE a."usuarioId" = app_current_usuario_id() AND a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = p."id"))
          OR (app_current_perfil() = 'ADMIN_EXTERNO' AND admin_externo_tem_tarefa_no_projeto(p."id"))
        )
    );
  END IF;

  IF p_tarefa_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM "tarefas" t JOIN "projetos" p ON p."id" = t."projetoId"
      WHERE t."id" = p_tarefa_id AND t."ativo" AND p."ativo" AND cliente_do_projeto_esta_ativo(t."projetoId")
        AND (
          (app_current_perfil() = 'ADMIN_INTERNO' AND EXISTS (SELECT 1 FROM "atribuicoes" a WHERE a."usuarioId" = app_current_usuario_id() AND a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = p."id"))
          OR (app_current_perfil() = 'ADMIN_EXTERNO' AND EXISTS (SELECT 1 FROM "atribuicoes" a WHERE a."usuarioId" = app_current_usuario_id() AND a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = t."id"))
        )
    );
  END IF;

  IF p_subtarefa_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM "subtarefas" s
      JOIN "tarefas" t ON t."id" = s."tarefaId"
      JOIN "projetos" p ON p."id" = t."projetoId"
      WHERE s."id" = p_subtarefa_id AND s."ativo" AND t."ativo" AND p."ativo"
        AND cliente_da_tarefa_esta_ativo(t."id")
        AND (
          (app_current_perfil() = 'ADMIN_INTERNO' AND EXISTS (SELECT 1 FROM "atribuicoes" a WHERE a."usuarioId" = app_current_usuario_id() AND a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = p."id"))
          OR (app_current_perfil() = 'ADMIN_EXTERNO' AND EXISTS (SELECT 1 FROM "atribuicoes" a WHERE a."usuarioId" = app_current_usuario_id() AND a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = t."id"))
        )
    );
  END IF;
  RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION comentario_alvo_acessivel(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION comentario_alvo_acessivel(TEXT, TEXT, TEXT) TO multiplus_app;

-- A função nunca devolve conteúdo, apenas o total e a quantidade concluída.
CREATE OR REPLACE FUNCTION contar_subtarefas_portal(p_tarefa_id TEXT)
RETURNS TABLE(total INTEGER, concluidas INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(s."id")::integer,
         COUNT(s."id") FILTER (WHERE s."status" = 'CONCLUIDO')::integer
  FROM "subtarefas" s
  JOIN "tarefas" t ON t."id" = s."tarefaId"
  JOIN "projetos" p ON p."id" = t."projetoId"
  JOIN "clientes" c ON c."id" = p."clienteId"
  WHERE s."tarefaId" = p_tarefa_id
    AND s."ativo" AND s."status" <> 'CANCELADO'
    AND t."ativo" AND p."ativo" AND c."ativo"
    AND app_current_perfil() = 'CLIENTE'
    AND p."clienteId" = (SELECT u."clienteId" FROM "usuarios" u WHERE u."id" = app_current_usuario_id());
$$;
REVOKE ALL ON FUNCTION contar_subtarefas_portal(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION contar_subtarefas_portal(TEXT) TO multiplus_app;

-- Exibe apenas timestamp de atividade autorizado, nunca dados de comentários/subtarefas.
CREATE OR REPLACE FUNCTION ultima_atualizacao_portal(p_projeto_id TEXT)
RETURNS TIMESTAMPTZ
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM "projetos" p
    WHERE p."id" = p_projeto_id AND p."ativo" AND cliente_esta_ativo(p."clienteId")
      AND (
        (app_current_perfil() = 'ADMIN' AND true)
        OR (app_current_perfil() = 'CLIENTE' AND p."clienteId" = (SELECT u."clienteId" FROM "usuarios" u WHERE u."id" = app_current_usuario_id()))
      )
  ) THEN (
    SELECT MAX(atividade."em") FROM (
      SELECT p."atualizadoEm" AS "em" FROM "projetos" p WHERE p."id" = p_projeto_id AND p."ativo"
      UNION ALL
      SELECT t."atualizadoEm" FROM "tarefas" t WHERE t."projetoId" = p_projeto_id AND t."ativo"
      UNION ALL
      SELECT s."atualizadoEm" FROM "subtarefas" s JOIN "tarefas" t ON t."id" = s."tarefaId"
        WHERE t."projetoId" = p_projeto_id AND t."ativo" AND s."ativo"
      UNION ALL
      SELECT c."criadoEm" FROM "comentarios" c
        WHERE c."projetoId" = p_projeto_id
          OR c."tarefaId" IN (SELECT t."id" FROM "tarefas" t WHERE t."projetoId" = p_projeto_id AND t."ativo")
          OR c."subtarefaId" IN (
            SELECT s."id" FROM "subtarefas" s JOIN "tarefas" t ON t."id" = s."tarefaId"
            WHERE t."projetoId" = p_projeto_id AND t."ativo" AND s."ativo"
          )
      UNION ALL
      SELECT d."atualizadoEm" FROM "documentos" d
        WHERE d."ativo" AND (d."projetoId" = p_projeto_id OR (d."projetoId" IS NULL AND d."clienteId" = (
          SELECT p."clienteId" FROM "projetos" p WHERE p."id" = p_projeto_id
        )))
    ) atividade
  ) ELSE NULL END;
$$;
REVOKE ALL ON FUNCTION ultima_atualizacao_portal(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ultima_atualizacao_portal(TEXT) TO multiplus_app;

-- O nome do responsável é o único campo da pessoa/usuário retornado ao cliente.
CREATE OR REPLACE FUNCTION responsavel_nome_portal(p_tarefa_id TEXT)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM "tarefas" t JOIN "projetos" p ON p."id" = t."projetoId"
    WHERE t."id" = p_tarefa_id AND t."ativo" AND p."ativo" AND cliente_esta_ativo(p."clienteId")
      AND app_current_perfil() = 'CLIENTE'
      AND p."clienteId" = (SELECT u."clienteId" FROM "usuarios" u WHERE u."id" = app_current_usuario_id())
  ) THEN (
    SELECT COALESCE(pe."nome", u."nome")
    FROM "tarefas" t
    LEFT JOIN "pessoas_envolvidas" pe ON pe."id" = t."responsavelId" AND pe."ativo"
    LEFT JOIN "usuarios" u ON u."id" = t."responsavelUsuarioId" AND u."ativo"
    WHERE t."id" = p_tarefa_id
  ) ELSE NULL END;
$$;
REVOKE ALL ON FUNCTION responsavel_nome_portal(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION responsavel_nome_portal(TEXT) TO multiplus_app;
