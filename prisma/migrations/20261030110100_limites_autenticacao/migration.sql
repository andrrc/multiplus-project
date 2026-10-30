-- Controle interno acessível somente à conexão de serviço.
CREATE TABLE "limites_autenticacao" (
  "chave" TEXT PRIMARY KEY,
  "falhas" INTEGER NOT NULL DEFAULT 0 CHECK ("falhas" >= 0),
  "pendentes" INTEGER NOT NULL DEFAULT 0 CHECK ("pendentes" >= 0),
  "expiraEm" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "limites_autenticacao_expiraEm_idx" ON "limites_autenticacao" ("expiraEm");
ALTER TABLE "limites_autenticacao" ENABLE ROW LEVEL SECURITY;
