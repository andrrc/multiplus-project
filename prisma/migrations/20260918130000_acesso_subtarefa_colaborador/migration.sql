-- Responsabilidade direta por subtarefa precisa permitir que o colaborador encontre o
-- contexto mínimo de trabalho: cliente, projeto e tarefa. As funções SECURITY DEFINER
-- evitam a recursão entre as políticas dessas três tabelas e a política de subtarefas.
-- Elas devolvem false, nunca NULL, para não converter ausência de vínculo em acesso.

CREATE OR REPLACE FUNCTION colaborador_tem_subtarefa_na_tarefa(p_tarefa_id TEXT) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(EXISTS (
    SELECT 1
    FROM "subtarefas" s
    LEFT JOIN "usuarios" u ON u."id" = app_current_usuario_id()
    WHERE s."tarefaId" = p_tarefa_id
      AND s."ativo"
      AND (
        s."atribuidoAUsuarioId" = app_current_usuario_id()
        OR (s."atribuidoAId" IS NOT NULL AND s."atribuidoAId" = u."pessoaEnvolvidaId")
      )
  ), false)
$$;

CREATE OR REPLACE FUNCTION colaborador_tem_subtarefa_no_projeto(p_projeto_id TEXT) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(EXISTS (
    SELECT 1
    FROM "subtarefas" s
    JOIN "tarefas" t ON t."id" = s."tarefaId"
    LEFT JOIN "usuarios" u ON u."id" = app_current_usuario_id()
    WHERE t."projetoId" = p_projeto_id
      AND t."ativo" AND s."ativo"
      AND (
        s."atribuidoAUsuarioId" = app_current_usuario_id()
        OR (s."atribuidoAId" IS NOT NULL AND s."atribuidoAId" = u."pessoaEnvolvidaId")
      )
  ), false)
$$;

CREATE OR REPLACE FUNCTION colaborador_tem_subtarefa_no_cliente(p_cliente_id TEXT) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(EXISTS (
    SELECT 1
    FROM "subtarefas" s
    JOIN "tarefas" t ON t."id" = s."tarefaId"
    JOIN "projetos" p ON p."id" = t."projetoId"
    LEFT JOIN "usuarios" u ON u."id" = app_current_usuario_id()
    WHERE p."clienteId" = p_cliente_id
      AND p."ativo" AND t."ativo" AND s."ativo"
      AND (
        s."atribuidoAUsuarioId" = app_current_usuario_id()
        OR (s."atribuidoAId" IS NOT NULL AND s."atribuidoAId" = u."pessoaEnvolvidaId")
      )
  ), false)
$$;

DROP POLICY clientes_select ON "clientes";
CREATE POLICY clientes_select ON "clientes" FOR SELECT USING (
  (app_current_perfil() = 'ADMIN' OR "ativo")
  AND (
    app_current_perfil() = 'ADMIN'
    OR (app_current_perfil() = 'CLIENTE' AND "id" = (SELECT "clienteId" FROM "usuarios" WHERE "id" = app_current_usuario_id()))
    OR (app_current_perfil() = 'ADMIN_INTERNO' AND EXISTS (
      SELECT 1 FROM "projetos" p JOIN "atribuicoes" a ON a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = p."id"
      WHERE p."clienteId" = "clientes"."id" AND a."usuarioId" = app_current_usuario_id()
    ))
    OR (app_current_perfil() = 'ADMIN_EXTERNO' AND EXISTS (
      SELECT 1 FROM "tarefas" t JOIN "projetos" p ON p."id" = t."projetoId"
      JOIN "atribuicoes" a ON a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = t."id"
      WHERE p."clienteId" = "clientes"."id" AND a."usuarioId" = app_current_usuario_id()
    ))
    OR (app_current_perfil() IN ('ADMIN_INTERNO', 'ADMIN_EXTERNO') AND colaborador_tem_subtarefa_no_cliente("id"))
  )
);

DROP POLICY projetos_select ON "projetos";
CREATE POLICY projetos_select ON "projetos" FOR SELECT USING (
  app_current_perfil() = 'ADMIN'
  OR (
    "ativo" AND cliente_esta_ativo("clienteId")
    AND (
      (app_current_perfil() = 'CLIENTE' AND "clienteId" = (SELECT "clienteId" FROM "usuarios" WHERE "id" = app_current_usuario_id()))
      OR (app_current_perfil() = 'ADMIN_INTERNO' AND EXISTS (
        SELECT 1 FROM "atribuicoes" a WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = "projetos"."id" AND a."usuarioId" = app_current_usuario_id()
      ))
      OR (app_current_perfil() = 'ADMIN_EXTERNO' AND admin_externo_tem_tarefa_no_projeto("projetos"."id"))
      OR (app_current_perfil() IN ('ADMIN_INTERNO', 'ADMIN_EXTERNO') AND colaborador_tem_subtarefa_no_projeto("projetos"."id"))
    )
  )
);

DROP POLICY tarefas_select ON "tarefas";
CREATE POLICY tarefas_select ON "tarefas" FOR SELECT USING (
  app_current_perfil() = 'ADMIN'
  OR (
    "ativo" AND cliente_do_projeto_esta_ativo("projetoId")
    AND (
      (app_current_perfil() = 'CLIENTE' AND EXISTS (
        SELECT 1 FROM "projetos" p WHERE p."id" = "tarefas"."projetoId" AND p."clienteId" = (SELECT "clienteId" FROM "usuarios" WHERE "id" = app_current_usuario_id())
      ))
      OR (app_current_perfil() = 'ADMIN_INTERNO' AND EXISTS (
        SELECT 1 FROM "atribuicoes" a WHERE a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = "tarefas"."projetoId" AND a."usuarioId" = app_current_usuario_id()
      ))
      OR (app_current_perfil() = 'ADMIN_EXTERNO' AND EXISTS (
        SELECT 1 FROM "atribuicoes" a WHERE a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = "tarefas"."id" AND a."usuarioId" = app_current_usuario_id()
      ))
      OR (app_current_perfil() IN ('ADMIN_INTERNO', 'ADMIN_EXTERNO') AND colaborador_tem_subtarefa_na_tarefa("tarefas"."id"))
    )
  )
);
