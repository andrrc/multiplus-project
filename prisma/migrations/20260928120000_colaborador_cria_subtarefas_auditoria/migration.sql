ALTER TABLE "tarefas"
  ADD COLUMN "colaboradorPodeCriarSubtarefas" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "criadoPorId" TEXT,
  ADD COLUMN "criadoPorNome" TEXT;

ALTER TABLE "subtarefas"
  ADD COLUMN "criadoPorId" TEXT,
  ADD COLUMN "criadoPorNome" TEXT;

ALTER TABLE "tarefas"
  ADD CONSTRAINT "tarefas_criadoPorId_fkey"
  FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "subtarefas"
  ADD CONSTRAINT "subtarefas_criadoPorId_fkey"
  FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION preencher_nome_criador() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF app_current_usuario_id() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW."criadoPorId" IS NULL THEN
    NEW."criadoPorId" := app_current_usuario_id();
  END IF;
  IF NEW."criadoPorId" IS DISTINCT FROM app_current_usuario_id() THEN
    RAISE EXCEPTION 'O criador precisa ser o usuário autenticado';
  END IF;
  SELECT "nome" INTO NEW."criadoPorNome" FROM "usuarios" WHERE "id" = NEW."criadoPorId";
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tarefas_criador
BEFORE INSERT ON "tarefas" FOR EACH ROW EXECUTE FUNCTION preencher_nome_criador();
CREATE TRIGGER trg_subtarefas_criador
BEFORE INSERT ON "subtarefas" FOR EACH ROW EXECUTE FUNCTION preencher_nome_criador();

CREATE OR REPLACE FUNCTION herdar_permissao_tarefa_recorrente() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE permissao_existente BOOLEAN;
BEGIN
  IF NEW."serieId" IS NOT NULL THEN
    SELECT t."colaboradorPodeCriarSubtarefas" INTO permissao_existente
    FROM "tarefas" t
    WHERE t."serieId" = NEW."serieId"
    ORDER BY t."criadoEm" ASC
    LIMIT 1;
    IF FOUND THEN NEW."colaboradorPodeCriarSubtarefas" := permissao_existente; END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tarefas_permissao_recorrente
BEFORE INSERT ON "tarefas" FOR EACH ROW EXECUTE FUNCTION herdar_permissao_tarefa_recorrente();

-- Responsáveis que são usuários internos também precisam de atribuição para acessar a tarefa.
INSERT INTO "atribuicoes" ("id", "usuarioId", "entidadeTipo", "entidadeId")
SELECT 'audit-task-' || t."id", t."responsavelUsuarioId", 'TAREFA', t."id"
FROM "tarefas" t
WHERE t."responsavelUsuarioId" IS NOT NULL
ON CONFLICT ("usuarioId", "entidadeTipo", "entidadeId") DO NOTHING;

-- O ator do registro é sempre obtido da sessão autenticada, nunca do formulário.
DROP POLICY tarefas_insert ON "tarefas";
CREATE POLICY tarefas_insert ON "tarefas" FOR INSERT WITH CHECK (
  app_current_perfil() = 'ADMIN'
  AND cliente_do_projeto_esta_ativo("projetoId")
  AND "criadoPorId" = app_current_usuario_id()
);

DROP POLICY subtarefas_insert ON "subtarefas";
CREATE POLICY subtarefas_insert ON "subtarefas" FOR INSERT WITH CHECK (
  "criadoPorId" = app_current_usuario_id()
  AND cliente_da_tarefa_esta_ativo("tarefaId")
  AND (
    app_current_perfil() = 'ADMIN'
    OR (
      app_current_perfil() IN ('ADMIN_INTERNO', 'ADMIN_EXTERNO')
      AND EXISTS (
        SELECT 1
        FROM "tarefas" t
        LEFT JOIN "usuarios" u ON u."id" = app_current_usuario_id()
        WHERE t."id" = "subtarefas"."tarefaId"
          AND t."ativo"
          AND t."colaboradorPodeCriarSubtarefas"
          AND (
            t."responsavelUsuarioId" = app_current_usuario_id()
            OR (t."responsavelId" IS NOT NULL AND t."responsavelId" = u."pessoaEnvolvidaId")
          )
      )
    )
  )
);
