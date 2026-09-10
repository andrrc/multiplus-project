-- A correção anterior (20260910192500) só tratou NULL do lado de OLD."atribuidoAId", mas
-- deixou passar o lado inverso: ator sem PessoaEnvolvida vinculada (minha_pessoa_envolvida_id
-- IS NULL) comparado com uma subtarefa que TEM responsável real — `valor_real = NULL`
-- também avalia NULL, e o mesmo `IF NOT (...) THEN RAISE` continua não disparando. Pego
-- pelo próprio teste de integração ("ADMIN_INTERNO dono do projeto é barrado pela
-- trigger"). Precisa checar NOT NULL dos dois lados antes de comparar, não só de um.
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

  SELECT "pessoaEnvolvidaId" INTO minha_pessoa_envolvida_id FROM "usuarios" WHERE "id" = app_current_usuario_id();

  sou_o_atribuido := OLD."atribuidoAId" IS NOT NULL
    AND minha_pessoa_envolvida_id IS NOT NULL
    AND OLD."atribuidoAId" = minha_pessoa_envolvida_id;

  IF NEW."concluida" IS DISTINCT FROM OLD."concluida" THEN
    IF NOT (app_current_perfil() = 'ADMIN' OR sou_o_atribuido) THEN
      RAISE EXCEPTION 'RN-004: apenas o responsável pela subtarefa (ou o Administrador) pode concluí-la';
    END IF;
  END IF;

  IF NEW."etiqueta" IS DISTINCT FROM OLD."etiqueta"
     OR NEW."tarefaId" IS DISTINCT FROM OLD."tarefaId"
     OR NEW."atribuidoAId" IS DISTINCT FROM OLD."atribuidoAId" THEN
    IF NOT eh_gestor THEN
      RAISE EXCEPTION 'RN-004: sem permissão para alterar esta subtarefa além do campo concluida';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
