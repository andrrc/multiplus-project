CREATE SEQUENCE "clientes_numero_identificacao_seq" AS INTEGER;

ALTER TABLE "clientes"
  ADD COLUMN "numeroIdentificacao" INTEGER;

WITH clientes_numerados AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (ORDER BY "criadoEm" ASC, "id" ASC)::INTEGER AS numero
  FROM "clientes"
)
UPDATE "clientes" AS cliente
SET "numeroIdentificacao" = clientes_numerados.numero
FROM clientes_numerados
WHERE cliente."id" = clientes_numerados."id";

SELECT setval(
  'clientes_numero_identificacao_seq',
  COALESCE((SELECT MAX("numeroIdentificacao") FROM "clientes"), 0) + 1,
  false
);

ALTER SEQUENCE "clientes_numero_identificacao_seq"
  OWNED BY "clientes"."numeroIdentificacao";

ALTER TABLE "clientes"
  ALTER COLUMN "numeroIdentificacao" SET DEFAULT nextval('clientes_numero_identificacao_seq'),
  ALTER COLUMN "numeroIdentificacao" SET NOT NULL;

CREATE UNIQUE INDEX "clientes_numeroIdentificacao_key"
  ON "clientes"("numeroIdentificacao");

GRANT USAGE, SELECT ON SEQUENCE "clientes_numero_identificacao_seq" TO multiplus_app;
