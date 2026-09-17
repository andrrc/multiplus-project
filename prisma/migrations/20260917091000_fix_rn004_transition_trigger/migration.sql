-- Ajuste pós-A1: a RN-004 compara a Pessoa Envolvida atribuída com
-- Usuario.pessoaEnvolvidaId, não com Usuario.id (ADR-007).

CREATE OR REPLACE FUNCTION subtarefas_enforce_rn004() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  eh_gestor boolean;
  minha_pessoa_envolvida_id text;
  sou_o_atribuido boolean;
BEGIN
  eh_gestor := app_current_perfil() = 'ADMIN' OR (
    app_current_perfil() = 'ADMIN_INTERNO' AND EXISTS (
      SELECT 1 FROM "tarefas" t
      JOIN "atribuicoes" a ON a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = t."projetoId"
      WHERE t."id" = NEW."tarefaId" AND a."usuarioId" = app_current_usuario_id()
    )
  );

  SELECT "pessoaEnvolvidaId"
  INTO minha_pessoa_envolvida_id
  FROM "usuarios"
  WHERE "id" = app_current_usuario_id();

  sou_o_atribuido := OLD."atribuidoAId" IS NOT NULL
    AND minha_pessoa_envolvida_id IS NOT NULL
    AND OLD."atribuidoAId" = minha_pessoa_envolvida_id;

  IF NEW."concluida" IS DISTINCT FROM OLD."concluida" THEN
    IF NOT (app_current_perfil() = 'ADMIN' OR sou_o_atribuido) THEN
      RAISE EXCEPTION 'RN-004: apenas o responsável pela subtarefa (ou o Administrador) pode concluí-la';
    END IF;
  END IF;

  IF NEW."titulo" IS DISTINCT FROM OLD."titulo"
     OR NEW."etiquetas" IS DISTINCT FROM OLD."etiquetas"
     OR NEW."tarefaId" IS DISTINCT FROM OLD."tarefaId"
     OR NEW."atribuidoAId" IS DISTINCT FROM OLD."atribuidoAId" THEN
    IF NOT eh_gestor THEN
      RAISE EXCEPTION 'RN-004: sem permissão para alterar esta subtarefa além do campo concluida';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
