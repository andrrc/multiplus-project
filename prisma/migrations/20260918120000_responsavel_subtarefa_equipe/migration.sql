-- Subtarefas seguem a mesma regra de responsável das tarefas: uma pessoa envolvida do
-- cliente ou um integrante ativo da equipe. A restrição abaixo permite linhas legadas sem
-- responsável, mas nunca permite duas fontes de responsável na mesma subtarefa.
ALTER TABLE "subtarefas" ADD COLUMN "atribuidoAUsuarioId" TEXT;

ALTER TABLE "subtarefas"
  ADD CONSTRAINT "subtarefas_atribuidoAUsuarioId_fkey"
  FOREIGN KEY ("atribuidoAUsuarioId") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "subtarefas_atribuidoAUsuarioId_idx" ON "subtarefas"("atribuidoAUsuarioId");

ALTER TABLE "subtarefas"
  ADD CONSTRAINT "subtarefas_um_tipo_de_responsavel"
  CHECK (NOT ("atribuidoAId" IS NOT NULL AND "atribuidoAUsuarioId" IS NOT NULL));

-- RN-004: quem é responsável pela subtarefa consegue vê-la, inclusive quando for um
-- integrante da equipe sem uma atribuição separada para o projeto ou para a tarefa.
DROP POLICY subtarefas_select ON "subtarefas";
CREATE POLICY subtarefas_select ON "subtarefas" FOR SELECT USING (
  (app_current_perfil() = 'ADMIN' OR cliente_da_tarefa_esta_ativo("tarefaId"))
  AND (
    app_current_perfil() = 'ADMIN'
    OR "atribuidoAUsuarioId" = app_current_usuario_id()
    OR "atribuidoAId" = (SELECT "pessoaEnvolvidaId" FROM "usuarios" WHERE "id" = app_current_usuario_id())
    OR (
      app_current_perfil() = 'CLIENTE'
      AND EXISTS (
        SELECT 1 FROM "tarefas" t
        JOIN "projetos" p ON p."id" = t."projetoId"
        WHERE t."id" = "subtarefas"."tarefaId"
          AND p."clienteId" = (SELECT "clienteId" FROM "usuarios" WHERE "id" = app_current_usuario_id())
      )
    )
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

-- Só o ADMIN edita a subtarefa. A única exceção é o responsável marcar a própria como
-- concluída; a trigger abaixo restringe as colunas e a transição permitidas.
DROP POLICY subtarefas_update ON "subtarefas";
CREATE POLICY subtarefas_update ON "subtarefas" FOR UPDATE USING (
  (app_current_perfil() = 'ADMIN' AND cliente_da_tarefa_esta_ativo("tarefaId"))
  OR (
    "ativo" AND cliente_da_tarefa_esta_ativo("tarefaId")
    AND (
      "atribuidoAUsuarioId" = app_current_usuario_id()
      OR (
        "atribuidoAId" IS NOT NULL
        AND "atribuidoAId" = (SELECT "pessoaEnvolvidaId" FROM "usuarios" WHERE "id" = app_current_usuario_id())
      )
    )
  )
) WITH CHECK (
  (app_current_perfil() = 'ADMIN' AND cliente_da_tarefa_esta_ativo("tarefaId"))
  OR (
    "ativo" AND cliente_da_tarefa_esta_ativo("tarefaId")
    AND (
      "atribuidoAUsuarioId" = app_current_usuario_id()
      OR (
        "atribuidoAId" IS NOT NULL
        AND "atribuidoAId" = (SELECT "pessoaEnvolvidaId" FROM "usuarios" WHERE "id" = app_current_usuario_id())
      )
    )
  )
);

CREATE OR REPLACE FUNCTION subtarefas_enforce_rn004() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  minha_pessoa_envolvida_id text;
  sou_o_atribuido boolean;
BEGIN
  IF app_current_perfil() IS NULL THEN RETURN NEW; END IF;

  IF app_current_perfil() = 'ADMIN' THEN
    IF OLD."ativo" = false AND NOT (
      NEW."ativo" = true
      AND NEW."desativadoEm" IS NULL
      AND NEW."desativadoPor" IS NULL
      AND NEW."tarefaId" = OLD."tarefaId"
      AND NEW."titulo" = OLD."titulo"
      AND NEW."etiquetas" IS NOT DISTINCT FROM OLD."etiquetas"
      AND NEW."concluida" = OLD."concluida"
      AND NEW."atribuidoAId" IS NOT DISTINCT FROM OLD."atribuidoAId"
      AND NEW."atribuidoAUsuarioId" IS NOT DISTINCT FROM OLD."atribuidoAUsuarioId"
      AND NEW."criadoEm" IS NOT DISTINCT FROM OLD."criadoEm"
    ) THEN
      RAISE EXCEPTION 'RF-039: registro de subtarefa desativado é somente leitura; apenas a reativação é permitida';
    END IF;
    RETURN NEW;
  END IF;

  SELECT "pessoaEnvolvidaId" INTO minha_pessoa_envolvida_id
  FROM "usuarios" WHERE "id" = app_current_usuario_id();

  sou_o_atribuido := (
    OLD."atribuidoAUsuarioId" IS NOT NULL
    AND OLD."atribuidoAUsuarioId" = app_current_usuario_id()
  ) OR (
    OLD."atribuidoAId" IS NOT NULL
    AND minha_pessoa_envolvida_id IS NOT NULL
    AND OLD."atribuidoAId" = minha_pessoa_envolvida_id
  );

  IF OLD."concluida" = false
     AND NEW."concluida" = true
     AND sou_o_atribuido
     AND NEW."tarefaId" = OLD."tarefaId"
     AND NEW."titulo" = OLD."titulo"
     AND NEW."etiquetas" IS NOT DISTINCT FROM OLD."etiquetas"
     AND NEW."atribuidoAId" IS NOT DISTINCT FROM OLD."atribuidoAId"
     AND NEW."atribuidoAUsuarioId" IS NOT DISTINCT FROM OLD."atribuidoAUsuarioId"
     AND NEW."ativo" IS NOT DISTINCT FROM OLD."ativo"
     AND NEW."desativadoEm" IS NOT DISTINCT FROM OLD."desativadoEm"
     AND NEW."desativadoPor" IS NOT DISTINCT FROM OLD."desativadoPor"
     AND NEW."criadoEm" IS NOT DISTINCT FROM OLD."criadoEm" THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'RN-004: apenas o responsável pela subtarefa pode marcá-la como concluída; demais alterações são exclusivas do Administrador';
END;
$$;
