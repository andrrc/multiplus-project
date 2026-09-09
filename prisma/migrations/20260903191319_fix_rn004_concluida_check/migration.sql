-- Corrige subtarefas_enforce_rn004(): a versão original deixava o ADMIN_INTERNO dono do
-- projeto mudar "concluida" livremente (mesma via liberada pra gestão do checklist).
-- RF-021 é explícito: "Apenas a pessoa atribuída [...] ou o Administrador [...] mesmo que
-- outra pessoa tenha acesso à tarefa/projeto" — ADMIN_INTERNO conta como "outra pessoa"
-- pra esse campo específico. Agora a regra fica separada por campo:
--   - "concluida": só ADMIN ou a pessoa atribuída (atribuidoAId), ponto.
--   - demais campos (etiqueta, tarefaId, atribuidoAId): ADMIN ou ADMIN_INTERNO dono do
--     projeto (gestão do checklist) — sem permitir também mudar "concluida" de tabela.
CREATE OR REPLACE FUNCTION subtarefas_enforce_rn004() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  eh_gestor boolean;
BEGIN
  eh_gestor := app_current_perfil() = 'ADMIN' OR (
    app_current_perfil() = 'ADMIN_INTERNO' AND EXISTS (
      SELECT 1 FROM "tarefas" t
      JOIN "atribuicoes" a ON a."entidadeTipo" = 'PROJETO' AND a."entidadeId" = t."projetoId"
      WHERE t."id" = NEW."tarefaId" AND a."usuarioId" = app_current_usuario_id()
    )
  );

  IF NEW."concluida" IS DISTINCT FROM OLD."concluida" THEN
    IF NOT (app_current_perfil() = 'ADMIN' OR OLD."atribuidoAId" = app_current_usuario_id()) THEN
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
