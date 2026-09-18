-- Sprint 4B / B2 — comentários imutáveis nos três níveis (RF-016/RF-047).
CREATE TABLE "comentarios" (
  "id" TEXT NOT NULL,
  "texto" TEXT NOT NULL,
  "link" TEXT,
  "imagemChave" TEXT,
  "autorId" TEXT NOT NULL,
  "projetoId" TEXT,
  "tarefaId" TEXT,
  "subtarefaId" TEXT,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "comentarios_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "comentarios_um_pai" CHECK (
    (CASE WHEN "projetoId" IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "tarefaId" IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "subtarefaId" IS NOT NULL THEN 1 ELSE 0 END) = 1
  ),
  CONSTRAINT "comentarios_autor_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "comentarios_projeto_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "comentarios_tarefa_fkey" FOREIGN KEY ("tarefaId") REFERENCES "tarefas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "comentarios_subtarefa_fkey" FOREIGN KEY ("subtarefaId") REFERENCES "subtarefas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "comentarios_projetoId_criadoEm_idx" ON "comentarios"("projetoId", "criadoEm");
CREATE INDEX "comentarios_tarefaId_criadoEm_idx" ON "comentarios"("tarefaId", "criadoEm");
CREATE INDEX "comentarios_subtarefaId_criadoEm_idx" ON "comentarios"("subtarefaId", "criadoEm");

ALTER TABLE "comentarios" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON "comentarios" TO multiplus_app;
REVOKE UPDATE, DELETE ON "comentarios" FROM multiplus_app;

CREATE POLICY comentarios_select ON "comentarios" FOR SELECT USING (
  app_current_perfil() = 'ADMIN'
  OR ("projetoId" IS NOT NULL AND EXISTS (
    SELECT 1 FROM "projetos" p WHERE p."id" = "comentarios"."projetoId" AND p."ativo" AND (
      cliente_esta_ativo(p."clienteId") AND (
        (app_current_perfil() = 'CLIENTE' AND p."clienteId" = (SELECT "clienteId" FROM "usuarios" WHERE "id" = app_current_usuario_id()))
        OR (app_current_perfil() = 'ADMIN_INTERNO' AND EXISTS (SELECT 1 FROM "atribuicoes" a WHERE a."usuarioId" = app_current_usuario_id() AND a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = p."id"))
        OR (app_current_perfil() = 'ADMIN_EXTERNO' AND admin_externo_tem_tarefa_no_projeto(p."id"))
      )
    )
  ))
  OR ("tarefaId" IS NOT NULL AND EXISTS (
    SELECT 1 FROM "tarefas" t JOIN "projetos" p ON p."id" = t."projetoId" WHERE t."id" = "comentarios"."tarefaId" AND t."ativo" AND p."ativo" AND cliente_do_projeto_esta_ativo(t."projetoId") AND (
      (app_current_perfil() = 'CLIENTE' AND p."clienteId" = (SELECT "clienteId" FROM "usuarios" WHERE "id" = app_current_usuario_id()))
      OR (app_current_perfil() = 'ADMIN_INTERNO' AND EXISTS (SELECT 1 FROM "atribuicoes" a WHERE a."usuarioId" = app_current_usuario_id() AND a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = p."id"))
      OR (app_current_perfil() = 'ADMIN_EXTERNO' AND EXISTS (SELECT 1 FROM "atribuicoes" a WHERE a."usuarioId" = app_current_usuario_id() AND a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = t."id"))
    )
  ))
  OR ("subtarefaId" IS NOT NULL AND EXISTS (
    SELECT 1 FROM "subtarefas" s JOIN "tarefas" t ON t."id" = s."tarefaId" WHERE s."id" = "comentarios"."subtarefaId" AND s."ativo" AND t."ativo" AND cliente_da_tarefa_esta_ativo(t."id") AND (
      app_current_perfil() = 'CLIENTE'
      OR (app_current_perfil() = 'ADMIN_INTERNO' AND EXISTS (SELECT 1 FROM "atribuicoes" a WHERE a."usuarioId" = app_current_usuario_id() AND a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = t."projetoId"))
      OR (app_current_perfil() = 'ADMIN_EXTERNO' AND EXISTS (SELECT 1 FROM "atribuicoes" a WHERE a."usuarioId" = app_current_usuario_id() AND a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = t."id"))
    )
  ))
);

CREATE POLICY comentarios_insert ON "comentarios" FOR INSERT WITH CHECK (
  "autorId" = app_current_usuario_id()
  AND (
    app_current_perfil() = 'ADMIN'
    OR ("projetoId" IS NOT NULL AND EXISTS (SELECT 1 FROM "projetos" p WHERE p."id" = "comentarios"."projetoId" AND p."ativo" AND cliente_esta_ativo(p."clienteId") AND ((app_current_perfil() = 'CLIENTE' AND p."clienteId" = (SELECT "clienteId" FROM "usuarios" WHERE "id" = app_current_usuario_id())) OR (app_current_perfil() = 'ADMIN_INTERNO' AND EXISTS (SELECT 1 FROM "atribuicoes" a WHERE a."usuarioId" = app_current_usuario_id() AND a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = p."id")) OR (app_current_perfil() = 'ADMIN_EXTERNO' AND admin_externo_tem_tarefa_no_projeto(p."id"))))
    )
    OR ("tarefaId" IS NOT NULL AND EXISTS (SELECT 1 FROM "tarefas" t WHERE t."id" = "comentarios"."tarefaId" AND t."ativo" AND cliente_do_projeto_esta_ativo(t."projetoId") AND ((app_current_perfil() = 'CLIENTE') OR (app_current_perfil() = 'ADMIN_INTERNO' AND EXISTS (SELECT 1 FROM "atribuicoes" a WHERE a."usuarioId" = app_current_usuario_id() AND a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = t."projetoId")) OR (app_current_perfil() = 'ADMIN_EXTERNO' AND EXISTS (SELECT 1 FROM "atribuicoes" a WHERE a."usuarioId" = app_current_usuario_id() AND a."entidadeTipo" = 'TAREFA' AND a."entidadeId" = t."id"))))
    )
    OR ("subtarefaId" IS NOT NULL AND EXISTS (SELECT 1 FROM "subtarefas" s JOIN "tarefas" t ON t."id" = s."tarefaId" WHERE s."id" = "comentarios"."subtarefaId" AND s."ativo" AND t."ativo" AND cliente_da_tarefa_esta_ativo(t."id")))
  )
);
