CREATE TABLE "etiquetas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "etiquetas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "etiquetas_nome_key" ON "etiquetas"("nome");

INSERT INTO "etiquetas" ("id", "nome", "cor")
SELECT
    'tag_' || md5(etiqueta.nome),
    etiqueta.nome,
    '#E2E8F0'
FROM (
    SELECT DISTINCT btrim(valor) AS nome
    FROM "subtarefas", unnest("etiquetas") AS valor
    WHERE btrim(valor) <> ''
) AS etiqueta
ON CONFLICT ("nome") DO NOTHING;

GRANT SELECT, INSERT ON "etiquetas" TO multiplus_app;

ALTER TABLE "etiquetas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "etiquetas" FORCE ROW LEVEL SECURITY;

CREATE POLICY etiquetas_select ON "etiquetas" FOR SELECT USING (
    app_current_perfil() IN ('ADMIN', 'ADMIN_INTERNO', 'ADMIN_EXTERNO', 'CLIENTE')
);

CREATE POLICY etiquetas_insert ON "etiquetas" FOR INSERT WITH CHECK (
    app_current_perfil() IN ('ADMIN', 'ADMIN_INTERNO', 'ADMIN_EXTERNO')
);
