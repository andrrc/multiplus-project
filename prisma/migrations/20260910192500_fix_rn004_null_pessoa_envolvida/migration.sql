-- Bug real encontrado pelo próprio teste de integração dedicado que o ADR-007 pediu
-- (subtarefas-rn004.integration.test.ts): a trigger subtarefas_enforce_rn004(), depois do
-- salto adicional via usuarios.pessoaEnvolvidaId, comparava
-- `OLD."atribuidoAId" = minha_pessoa_envolvida_id` sem tratar o caso os dois lados serem
-- NULL (subtarefa sem responsável E usuário sem PessoaEnvolvida vinculada, ex.: ADMIN_INTERNO
-- genérico). Em SQL, NULL = NULL avalia NULL, e `IF NOT (... OR NULL) THEN RAISE` em
-- plpgsql trata condição NULL como falsa (não dispara a exceção) — deixando qualquer
-- usuário sem PessoaEnvolvida vinculada "concluir" uma subtarefa sem responsável, o que
-- RN-004 nunca deveria permitir. RLS não tinha esse problema (Postgres trata NULL em
-- policy como "linha excluída", não "incluída") — só a trigger precisava do guard
-- explícito de NOT NULL.
CREATE OR REPLACE FUNCTION subtarefas_enforce_rn004() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  eh_gestor boolean;
  minha_pessoa_envolvida_id text;
BEGIN
  eh_gestor := app_current_perfil() = 'ADMIN' OR (
    app_current_perfil() = 'ADMIN_INTERNO' AND EXISTS (
      SELECT 1 FROM "tarefas" t
      JOIN "atribuicoes" a ON a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = t."projetoId"
      WHERE t."id" = NEW."tarefaId" AND a."usuarioId" = app_current_usuario_id()
    )
  );

  SELECT "pessoaEnvolvidaId" INTO minha_pessoa_envolvida_id FROM "usuarios" WHERE "id" = app_current_usuario_id();

  IF NEW."concluida" IS DISTINCT FROM OLD."concluida" THEN
    IF NOT (
      app_current_perfil() = 'ADMIN'
      OR (OLD."atribuidoAId" IS NOT NULL AND OLD."atribuidoAId" = minha_pessoa_envolvida_id)
    ) THEN
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
