-- Valor contratado é dado comercial restrito ao Administrador. A tabela própria
-- permite que a RLS proteja o valor por completo; RLS de projetos protege linhas,
-- mas não uma coluna isolada.
CREATE TABLE "valores_projeto" (
  "projetoId" TEXT NOT NULL,
  "valorContratado" DECIMAL(14,2) NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "valores_projeto_pkey" PRIMARY KEY ("projetoId"),
  CONSTRAINT "valores_projeto_projetoId_fkey"
    FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "valores_projeto_valorContratado_nao_negativo"
    CHECK ("valorContratado" >= 0)
);

ALTER TABLE "valores_projeto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "valores_projeto" FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON "valores_projeto" TO multiplus_app;

CREATE POLICY valores_projeto_admin ON "valores_projeto" FOR ALL
  USING (app_current_perfil() = 'ADMIN')
  WITH CHECK (app_current_perfil() = 'ADMIN');
