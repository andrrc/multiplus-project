-- RF-039/RN-009 — nenhum filho pode ser escrito enquanto o cliente ancestral estiver
-- desativado. A reativação do próprio filho só é possível depois de reativar o cliente.

DROP POLICY projetos_update ON "projetos";
CREATE POLICY projetos_update ON "projetos" FOR UPDATE USING (
  app_current_perfil() = 'ADMIN' AND cliente_esta_ativo("clienteId")
) WITH CHECK (
  app_current_perfil() = 'ADMIN' AND cliente_esta_ativo("clienteId")
);

DROP POLICY projetos_delete ON "projetos";
CREATE POLICY projetos_delete ON "projetos" FOR DELETE USING (
  app_current_perfil() = 'ADMIN' AND cliente_esta_ativo("clienteId")
);

DROP POLICY tarefas_update ON "tarefas";
CREATE POLICY tarefas_update ON "tarefas" FOR UPDATE USING (
  (
    app_current_perfil() = 'ADMIN'
    AND cliente_do_projeto_esta_ativo("projetoId")
  )
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
  (app_current_perfil() = 'ADMIN' AND cliente_do_projeto_esta_ativo("projetoId"))
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

DROP POLICY tarefas_delete ON "tarefas";
CREATE POLICY tarefas_delete ON "tarefas" FOR DELETE USING (
  app_current_perfil() = 'ADMIN' AND cliente_do_projeto_esta_ativo("projetoId")
);

DROP POLICY subtarefas_update ON "subtarefas";
CREATE POLICY subtarefas_update ON "subtarefas" FOR UPDATE USING (
  (
    app_current_perfil() = 'ADMIN'
    AND cliente_da_tarefa_esta_ativo("tarefaId")
  )
  OR (
    "ativo" AND cliente_da_tarefa_esta_ativo("tarefaId")
    AND "atribuidoAId" IS NOT NULL
    AND "atribuidoAId" = (SELECT "pessoaEnvolvidaId" FROM "usuarios" WHERE "id" = app_current_usuario_id())
  )
) WITH CHECK (
  (app_current_perfil() = 'ADMIN' AND cliente_da_tarefa_esta_ativo("tarefaId"))
  OR (
    "ativo" AND cliente_da_tarefa_esta_ativo("tarefaId")
    AND "atribuidoAId" IS NOT NULL
    AND "atribuidoAId" = (SELECT "pessoaEnvolvidaId" FROM "usuarios" WHERE "id" = app_current_usuario_id())
  )
);

DROP POLICY subtarefas_delete ON "subtarefas";
CREATE POLICY subtarefas_delete ON "subtarefas" FOR DELETE USING (
  app_current_perfil() = 'ADMIN' AND cliente_da_tarefa_esta_ativo("tarefaId")
);
