-- B2 — centraliza a autorização do alvo do comentário e fecha o acesso de CLIENTE.
CREATE OR REPLACE FUNCTION comentario_alvo_acessivel(
  p_projeto_id TEXT,
  p_tarefa_id TEXT,
  p_subtarefa_id TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
  IF app_current_perfil() = 'ADMIN' THEN RETURN true; END IF;

  IF p_projeto_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM "projetos" p
      WHERE p."id" = p_projeto_id AND p."ativo" AND cliente_esta_ativo(p."clienteId")
        AND (
          (app_current_perfil() = 'CLIENTE' AND p."clienteId" = (SELECT "clienteId" FROM "usuarios" WHERE "id" = app_current_usuario_id()))
          OR (app_current_perfil() = 'ADMIN_INTERNO' AND EXISTS (SELECT 1 FROM "atribuicoes" a WHERE a."usuarioId" = app_current_usuario_id() AND a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = p."id"))
          OR (app_current_perfil() = 'ADMIN_EXTERNO' AND admin_externo_tem_tarefa_no_projeto(p."id"))
        )
    );
  END IF;

  IF p_tarefa_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM "tarefas" t JOIN "projetos" p ON p."id" = t."projetoId"
      WHERE t."id" = p_tarefa_id AND t."ativo" AND p."ativo" AND cliente_do_projeto_esta_ativo(t."projetoId")
        AND (
          (app_current_perfil() = 'CLIENTE' AND p."clienteId" = (SELECT "clienteId" FROM "usuarios" WHERE "id" = app_current_usuario_id()))
          OR (app_current_perfil() = 'ADMIN_INTERNO' AND EXISTS (SELECT 1 FROM "atribuicoes" a WHERE a."usuarioId" = app_current_usuario_id() AND a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = p."id"))
          OR (app_current_perfil() = 'ADMIN_EXTERNO' AND EXISTS (SELECT 1 FROM "atribuicoes" a WHERE a."usuarioId" = app_current_usuario_id() AND a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = t."id"))
        )
    );
  END IF;

  IF p_subtarefa_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM "subtarefas" s JOIN "tarefas" t ON t."id" = s."tarefaId" JOIN "projetos" p ON p."id" = t."projetoId"
      WHERE s."id" = p_subtarefa_id AND s."ativo" AND t."ativo" AND p."ativo" AND cliente_da_tarefa_esta_ativo(t."id")
        AND (
          (app_current_perfil() = 'CLIENTE' AND p."clienteId" = (SELECT "clienteId" FROM "usuarios" WHERE "id" = app_current_usuario_id()))
          OR (app_current_perfil() = 'ADMIN_INTERNO' AND EXISTS (SELECT 1 FROM "atribuicoes" a WHERE a."usuarioId" = app_current_usuario_id() AND a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = p."id"))
          OR (app_current_perfil() = 'ADMIN_EXTERNO' AND EXISTS (SELECT 1 FROM "atribuicoes" a WHERE a."usuarioId" = app_current_usuario_id() AND a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = t."id"))
        )
    );
  END IF;

  RETURN false;
END;
$$;
GRANT EXECUTE ON FUNCTION comentario_alvo_acessivel(TEXT, TEXT, TEXT) TO multiplus_app;

DROP POLICY comentarios_select ON "comentarios";
CREATE POLICY comentarios_select ON "comentarios" FOR SELECT USING (
  comentario_alvo_acessivel("projetoId", "tarefaId", "subtarefaId")
);

DROP POLICY comentarios_insert ON "comentarios";
CREATE POLICY comentarios_insert ON "comentarios" FOR INSERT WITH CHECK (
  "autorId" = app_current_usuario_id()
  AND comentario_alvo_acessivel("projetoId", "tarefaId", "subtarefaId")
);
