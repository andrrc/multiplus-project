-- A2 — registro desativado é somente leitura; a única exceção é reativar.
-- Também preserva fixtures e operações de bootstrap feitas pela role dona, que não têm
-- app.perfil configurado e não representam uma sessão de usuário.

CREATE OR REPLACE FUNCTION projetos_enforce_rn039() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF app_current_perfil() IS NULL THEN RETURN NEW; END IF;
  IF OLD."ativo" = false AND NOT (
    NEW."ativo" = true
    AND NEW."desativadoEm" IS NULL
    AND NEW."desativadoPor" IS NULL
    AND NEW."clienteId" = OLD."clienteId"
    AND NEW."nome" = OLD."nome"
    AND NEW."descricao" IS NOT DISTINCT FROM OLD."descricao"
    AND NEW."dataInicio" IS NOT DISTINCT FROM OLD."dataInicio"
    AND NEW."dataPrevistaConclusao" IS NOT DISTINCT FROM OLD."dataPrevistaConclusao"
    AND NEW."status" = OLD."status"
    AND NEW."criadoEm" IS NOT DISTINCT FROM OLD."criadoEm"
  ) THEN
    RAISE EXCEPTION 'RF-039: registro de projeto desativado é somente leitura; apenas a reativação é permitida';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_projetos_rn039 ON "projetos";
CREATE TRIGGER trg_projetos_rn039
BEFORE UPDATE ON "projetos"
FOR EACH ROW EXECUTE FUNCTION projetos_enforce_rn039();

CREATE OR REPLACE FUNCTION tarefas_enforce_rn007() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF app_current_perfil() IS NULL OR app_current_perfil() = 'ADMIN' THEN
    IF app_current_perfil() IS NULL THEN RETURN NEW; END IF;
    IF OLD."ativo" = false AND NOT (
      NEW."ativo" = true
      AND NEW."desativadoEm" IS NULL
      AND NEW."desativadoPor" IS NULL
      AND NEW."projetoId" = OLD."projetoId"
      AND NEW."nome" = OLD."nome"
      AND NEW."descricao" IS NOT DISTINCT FROM OLD."descricao"
      AND NEW."prazo" IS NOT DISTINCT FROM OLD."prazo"
      AND NEW."status" = OLD."status"
      AND NEW."periodicidade" IS NOT DISTINCT FROM OLD."periodicidade"
      AND NEW."serieId" IS NOT DISTINCT FROM OLD."serieId"
      AND NEW."prazoOriginal" IS NOT DISTINCT FROM OLD."prazoOriginal"
      AND NEW."serieEncerradaEm" IS NOT DISTINCT FROM OLD."serieEncerradaEm"
      AND NEW."diasAntecedencia" IS NOT DISTINCT FROM OLD."diasAntecedencia"
      AND NEW."responsavelId" IS NOT DISTINCT FROM OLD."responsavelId"
      AND NEW."criadoEm" IS NOT DISTINCT FROM OLD."criadoEm"
    ) THEN
      RAISE EXCEPTION 'RF-039: registro de tarefa desativado é somente leitura; apenas a reativação é permitida';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW."status" IS DISTINCT FROM OLD."status"
     AND NEW."status" = 'Concluído'
     AND NEW."projetoId" = OLD."projetoId"
     AND NEW."nome" = OLD."nome"
     AND NEW."descricao" IS NOT DISTINCT FROM OLD."descricao"
     AND NEW."prazo" IS NOT DISTINCT FROM OLD."prazo"
     AND NEW."periodicidade" IS NOT DISTINCT FROM OLD."periodicidade"
     AND NEW."serieId" IS NOT DISTINCT FROM OLD."serieId"
     AND NEW."prazoOriginal" IS NOT DISTINCT FROM OLD."prazoOriginal"
     AND NEW."serieEncerradaEm" IS NOT DISTINCT FROM OLD."serieEncerradaEm"
     AND NEW."diasAntecedencia" IS NOT DISTINCT FROM OLD."diasAntecedencia"
     AND NEW."responsavelId" IS NOT DISTINCT FROM OLD."responsavelId"
     AND NEW."ativo" IS NOT DISTINCT FROM OLD."ativo"
     AND NEW."desativadoEm" IS NOT DISTINCT FROM OLD."desativadoEm"
     AND NEW."desativadoPor" IS NOT DISTINCT FROM OLD."desativadoPor"
     AND NEW."criadoEm" IS NOT DISTINCT FROM OLD."criadoEm" THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'RN-007: colaborador só pode marcar a tarefa atribuída como Concluído';
END;
$$;

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
      AND NEW."criadoEm" IS NOT DISTINCT FROM OLD."criadoEm"
    ) THEN
      RAISE EXCEPTION 'RF-039: registro de subtarefa desativado é somente leitura; apenas a reativação é permitida';
    END IF;
    RETURN NEW;
  END IF;

  SELECT "pessoaEnvolvidaId" INTO minha_pessoa_envolvida_id
  FROM "usuarios" WHERE "id" = app_current_usuario_id();

  sou_o_atribuido := OLD."atribuidoAId" IS NOT NULL
    AND minha_pessoa_envolvida_id IS NOT NULL
    AND OLD."atribuidoAId" = minha_pessoa_envolvida_id;

  IF NEW."concluida" IS DISTINCT FROM OLD."concluida"
     AND sou_o_atribuido
     AND NEW."tarefaId" = OLD."tarefaId"
     AND NEW."titulo" = OLD."titulo"
     AND NEW."etiquetas" IS NOT DISTINCT FROM OLD."etiquetas"
     AND NEW."atribuidoAId" IS NOT DISTINCT FROM OLD."atribuidoAId"
     AND NEW."ativo" IS NOT DISTINCT FROM OLD."ativo"
     AND NEW."desativadoEm" IS NOT DISTINCT FROM OLD."desativadoEm"
     AND NEW."desativadoPor" IS NOT DISTINCT FROM OLD."desativadoPor"
     AND NEW."criadoEm" IS NOT DISTINCT FROM OLD."criadoEm" THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'RN-004: apenas o responsável pela subtarefa pode concluí-la; demais alterações são exclusivas do Administrador';
END;
$$;
