-- RF-004/RF-005/RF-008 — números locais que compõem os identificadores hierárquicos.
ALTER TABLE "projetos" ADD COLUMN "numeroLocal" INTEGER;
ALTER TABLE "tarefas" ADD COLUMN "numeroLocal" INTEGER;
ALTER TABLE "subtarefas" ADD COLUMN "numeroLocal" INTEGER;

-- Registros antigos recebem números determinísticos dentro de cada pai.
WITH numerados AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "clienteId" ORDER BY "criadoEm", "id")::INTEGER AS numero
  FROM "projetos"
)
UPDATE "projetos" p SET "numeroLocal" = n.numero FROM numerados n WHERE p."id" = n."id";

WITH numerados AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "projetoId" ORDER BY "criadoEm", "id")::INTEGER AS numero
  FROM "tarefas"
)
UPDATE "tarefas" t SET "numeroLocal" = n.numero FROM numerados n WHERE t."id" = n."id";

WITH numerados AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "tarefaId" ORDER BY "criadoEm", "id")::INTEGER AS numero
  FROM "subtarefas"
)
UPDATE "subtarefas" s SET "numeroLocal" = n.numero FROM numerados n WHERE s."id" = n."id";

ALTER TABLE "projetos" ALTER COLUMN "numeroLocal" SET NOT NULL;
ALTER TABLE "tarefas" ALTER COLUMN "numeroLocal" SET NOT NULL;
ALTER TABLE "subtarefas" ALTER COLUMN "numeroLocal" SET NOT NULL;
-- Prisma envia o valor padrão; os triggers sempre substituem zero pelo próximo número válido.
ALTER TABLE "projetos" ALTER COLUMN "numeroLocal" SET DEFAULT 0;
ALTER TABLE "tarefas" ALTER COLUMN "numeroLocal" SET DEFAULT 0;
ALTER TABLE "subtarefas" ALTER COLUMN "numeroLocal" SET DEFAULT 0;

CREATE UNIQUE INDEX "projetos_clienteId_numeroLocal_key" ON "projetos"("clienteId", "numeroLocal");
CREATE UNIQUE INDEX "tarefas_projetoId_numeroLocal_key" ON "tarefas"("projetoId", "numeroLocal");
CREATE UNIQUE INDEX "subtarefas_tarefaId_numeroLocal_key" ON "subtarefas"("tarefaId", "numeroLocal");

-- Guarda o último número emitido por pai, inclusive quando um registro for movido.
-- A tabela não é acessível pelo runtime; as funções de trigger a alteram como SECURITY DEFINER.
CREATE TABLE "contadores_ids_hierarquicos" (
  "tipo" TEXT NOT NULL,
  "paiId" TEXT NOT NULL,
  "ultimoNumero" INTEGER NOT NULL CHECK ("ultimoNumero" > 0),
  PRIMARY KEY ("tipo", "paiId"),
  CHECK ("tipo" IN ('PROJETO', 'TAREFA', 'SUBTAREFA'))
);

INSERT INTO "contadores_ids_hierarquicos" ("tipo", "paiId", "ultimoNumero")
SELECT 'PROJETO', "clienteId", MAX("numeroLocal") FROM "projetos" GROUP BY "clienteId"
UNION ALL
SELECT 'TAREFA', "projetoId", MAX("numeroLocal") FROM "tarefas" GROUP BY "projetoId"
UNION ALL
SELECT 'SUBTAREFA', "tarefaId", MAX("numeroLocal") FROM "subtarefas" GROUP BY "tarefaId";

ALTER TABLE "contadores_ids_hierarquicos" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "contadores_ids_hierarquicos" FROM PUBLIC, multiplus_app;

CREATE FUNCTION alocar_numero_hierarquico(p_tipo TEXT, p_pai_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  numero INTEGER;
BEGIN
  INSERT INTO "contadores_ids_hierarquicos" ("tipo", "paiId", "ultimoNumero")
  VALUES (p_tipo, p_pai_id, 1)
  ON CONFLICT ("tipo", "paiId") DO UPDATE
    SET "ultimoNumero" = "contadores_ids_hierarquicos"."ultimoNumero" + 1
  RETURNING "ultimoNumero" INTO numero;
  RETURN numero;
END;
$$;

CREATE FUNCTION atribuir_numero_projeto()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW."clienteId" IS DISTINCT FROM OLD."clienteId" THEN
    NEW."numeroLocal" := alocar_numero_hierarquico('PROJETO', NEW."clienteId");
  ELSE
    NEW."numeroLocal" := OLD."numeroLocal";
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION atribuir_numero_tarefa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW."projetoId" IS DISTINCT FROM OLD."projetoId" THEN
    NEW."numeroLocal" := alocar_numero_hierarquico('TAREFA', NEW."projetoId");
  ELSE
    NEW."numeroLocal" := OLD."numeroLocal";
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION atribuir_numero_subtarefa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW."tarefaId" IS DISTINCT FROM OLD."tarefaId" THEN
    NEW."numeroLocal" := alocar_numero_hierarquico('SUBTAREFA', NEW."tarefaId");
  ELSE
    NEW."numeroLocal" := OLD."numeroLocal";
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION alocar_numero_hierarquico(TEXT, TEXT) FROM PUBLIC, multiplus_app;
REVOKE EXECUTE ON FUNCTION atribuir_numero_projeto() FROM PUBLIC, multiplus_app;
REVOKE EXECUTE ON FUNCTION atribuir_numero_tarefa() FROM PUBLIC, multiplus_app;
REVOKE EXECUTE ON FUNCTION atribuir_numero_subtarefa() FROM PUBLIC, multiplus_app;

CREATE TRIGGER projetos_numero_hierarquico
BEFORE INSERT OR UPDATE ON "projetos"
FOR EACH ROW EXECUTE FUNCTION atribuir_numero_projeto();
CREATE TRIGGER tarefas_numero_hierarquico
BEFORE INSERT OR UPDATE ON "tarefas"
FOR EACH ROW EXECUTE FUNCTION atribuir_numero_tarefa();
CREATE TRIGGER subtarefas_numero_hierarquico
BEFORE INSERT OR UPDATE ON "subtarefas"
FOR EACH ROW EXECUTE FUNCTION atribuir_numero_subtarefa();
