CREATE TYPE "StatusSubtarefa" AS ENUM ('EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO');

ALTER TABLE "subtarefas"
  ADD COLUMN "descricao" TEXT,
  ADD COLUMN "prazo" TIMESTAMP(3),
  ADD COLUMN "status" "StatusSubtarefa" NOT NULL DEFAULT 'EM_ANDAMENTO';

UPDATE "subtarefas"
SET "status" = CASE WHEN "concluida" THEN 'CONCLUIDO'::"StatusSubtarefa" ELSE 'EM_ANDAMENTO'::"StatusSubtarefa" END;

ALTER TABLE "subtarefas" DROP COLUMN "concluida";

CREATE INDEX "subtarefas_status_prazo_idx" ON "subtarefas"("status", "prazo");

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
      AND NEW."descricao" IS NOT DISTINCT FROM OLD."descricao"
      AND NEW."prazo" IS NOT DISTINCT FROM OLD."prazo"
      AND NEW."etiquetas" IS NOT DISTINCT FROM OLD."etiquetas"
      AND NEW."status" = OLD."status"
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

  IF OLD."status" = 'EM_ANDAMENTO'
     AND NEW."status" = 'CONCLUIDO'
     AND sou_o_atribuido
     AND NEW."tarefaId" = OLD."tarefaId"
     AND NEW."titulo" = OLD."titulo"
     AND NEW."descricao" IS NOT DISTINCT FROM OLD."descricao"
     AND NEW."prazo" IS NOT DISTINCT FROM OLD."prazo"
     AND NEW."etiquetas" IS NOT DISTINCT FROM OLD."etiquetas"
     AND NEW."atribuidoAId" IS NOT DISTINCT FROM OLD."atribuidoAId"
     AND NEW."atribuidoAUsuarioId" IS NOT DISTINCT FROM OLD."atribuidoAUsuarioId"
     AND NEW."ativo" IS NOT DISTINCT FROM OLD."ativo"
     AND NEW."desativadoEm" IS NOT DISTINCT FROM OLD."desativadoEm"
     AND NEW."desativadoPor" IS NOT DISTINCT FROM OLD."desativadoPor"
     AND NEW."criadoEm" IS NOT DISTINCT FROM OLD."criadoEm" THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'RN-004: apenas o responsável pode concluir a própria subtarefa; as demais alterações são exclusivas do Administrador';
END;
$$;
